import { NextResponse } from "next/server";
import { apiUser } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const user = apiUser(request);
  if (!user) {
    return NextResponse.json({ user: null }, { status: 200 });
  }
  return NextResponse.json({ user: { id: user.id, username: user.username, name: user.name } });
}
