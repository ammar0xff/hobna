import { google } from "googleapis";
import { db } from "./db";

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || "http://localhost:3000/api/auth/google/callback";
const SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/drive.file",
];
const HOBNA_FOLDER_NAME = "Hobna";

export function isGoogleEnabled() {
  return !!(CLIENT_ID && CLIENT_SECRET);
}

export function getOAuth2Client() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);
}

export function getAuthUrl(state: string) {
  const oauth2 = getOAuth2Client();
  return oauth2.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state,
  });
}

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string | null;
  expiry_date?: number;
}

export interface GoogleUserInfo {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export async function exchangeCode(code: string): Promise<GoogleTokens> {
  const oauth2 = getOAuth2Client();
  const { tokens } = await oauth2.getToken(code);
  return {
    access_token: tokens.access_token || "",
    refresh_token: tokens.refresh_token || null,
    expiry_date: tokens.expiry_date || undefined,
  };
}

export async function getUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({ access_token: accessToken });
  const people = google.people({ version: "v1", auth: oauth2 });
  const me = await people.people.get({
    resourceName: "people/me",
    personFields: "names,emailAddresses,photos",
  });
  const data = me.data;
  const name = data.names?.[0]?.displayName || "";
  const email = data.emailAddresses?.[0]?.value || "";
  const picture = data.photos?.[0]?.url || "";
  return { id: data.resourceName?.replace("people/", "") || "", email, name, picture };
}

export async function refreshAccessToken(refreshToken: string): Promise<GoogleTokens> {
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2.refreshAccessToken();
  return {
    access_token: credentials.access_token || "",
    refresh_token: credentials.refresh_token || refreshToken,
    expiry_date: credentials.expiry_date || undefined,
  };
}

export function getValidAccessToken(userId: number): string | null {
  const row = db
    .prepare("SELECT access_token, refresh_token, expires_at FROM user_tokens WHERE user_id = ?")
    .get(userId) as { access_token: string; refresh_token: string; expires_at: number } | undefined;
  if (!row) return null;

  // Token still valid (with 5 min buffer)
  if (row.expires_at > Date.now() + 300_000) {
    return row.access_token;
  }

  // Try refresh
  if (!row.refresh_token) return null;
  try {
    const refreshed = refreshAccessTokenSync(row.refresh_token);
    db.prepare(
      "UPDATE user_tokens SET access_token = ?, refresh_token = ?, expires_at = ? WHERE user_id = ?"
    ).run(refreshed.access_token, refreshed.refresh_token, refreshed.expiry_date || Date.now() + 3600_000, userId);
    return refreshed.access_token;
  } catch (e) {
    console.error("[google] token refresh failed for user", userId, e);
    return null;
  }
}

function refreshAccessTokenSync(refreshToken: string): GoogleTokens {
  // Synchronous wrapper using child_process for token refresh
  const { execSync } = require("node:child_process") as typeof import("node:child_process");
  const script = `
    const { google } = require("googleapis");
    const oauth2 = new google.auth.OAuth2(
      ${JSON.stringify(CLIENT_ID)},
      ${JSON.stringify(CLIENT_SECRET)},
      ${JSON.stringify(REDIRECT_URI)}
    );
    oauth2.setCredentials({ refresh_token: ${JSON.stringify(refreshToken)} });
    oauth2.refreshAccessToken().then(({ credentials }) => {
      process.stdout.write(JSON.stringify({
        access_token: credentials.access_token || "",
        refresh_token: credentials.refresh_token || ${JSON.stringify(refreshToken)},
        expiry_date: credentials.expiry_date || null
      }));
    }).catch((e) => { process.stderr.write(e.message); process.exit(1); });
  `;
  const out = execSync(`node -e '${script.replace(/'/g, "'\\''")}'`, {
    encoding: "utf8",
    timeout: 15000,
  });
  return JSON.parse(out.trim());
}

export async function createDriveFolder(accessToken: string, parentId?: string): Promise<string> {
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: "v3", auth: oauth2 });

  // Check if folder already exists
  const query = `name='${HOBNA_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentId ? ` and '${parentId}' in parents` : " and 'root' in parents"}`;
  const existing = await drive.files.list({ q: query, fields: "files(id)" });
  if (existing.data.files?.length) {
    return existing.data.files[0].id!;
  }

  // Create folder
  const fileMetadata: any = {
    name: HOBNA_FOLDER_NAME,
    mimeType: "application/vnd.google-apps.folder",
  };
  if (parentId) {
    fileMetadata.parents = [parentId];
  }
  const file = await drive.files.create({
    resource: fileMetadata,
    fields: "id",
  });
  return file.data.id!;
}

export async function uploadToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  mimeType: string,
  fileBuffer: Buffer
): Promise<string> {
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: "v3", auth: oauth2 });

  const fileMetadata = {
    name: fileName,
    parents: [folderId],
  };

  const media = {
    mimeType,
    body: new (require("node:stream").Readable)({
      read() {
        this.push(fileBuffer);
        this.push(null);
      },
    }),
  };

  const file = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: "id",
  });
  return file.data.id!;
}

export async function downloadFromDrive(accessToken: string, fileId: string): Promise<Buffer> {
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: "v3", auth: oauth2 });

  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  return Buffer.from(res.data as ArrayBuffer);
}

export async function deleteFromDrive(accessToken: string, fileId: string): Promise<void> {
  const oauth2 = getOAuth2Client();
  oauth2.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: "v3", auth: oauth2 });
  await drive.files.delete({ fileId });
}

export async function getDriveFileInfo(accessToken: string, fileId: string): Promise<{ name: string; size: number } | null> {
  try {
    const oauth2 = getOAuth2Client();
    oauth2.setCredentials({ access_token: accessToken });
    const drive = google.drive({ version: "v3", auth: oauth2 });
    const res = await drive.files.get({ fileId, fields: "name,size" });
    return { name: res.data.name || "", size: Number(res.data.size || 0) };
  } catch {
    return null;
  }
}
