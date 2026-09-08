export type PersonTag = "ammar" | "alaa" | "both" | null;

export interface User {
  id: number;
  username: string;
  name: string;
}

export interface Asset {
  id: string;
  type: "image" | "video";
  ext: string;
  orig_name: string;
  size: number;
  width: number | null;
  height: number | null;
  duration: number | null;
  taken_at: string;
  person: PersonTag;
  caption: string;
  created_by: number;
  created_at: string;
  likes: number;
  liked_by_me: number;
  comments: number;
  in_events: number;
}

export interface AssetDetail extends Asset {
  comments_list: CommentRow[];
  event_ids: string[];
}

export interface CommentRow {
  id: number;
  asset_id: string;
  user_id: number;
  user_name: string;
  text: string;
  created_at: string;
}

export interface EventRow {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  description: string;
  cover_asset_id: string | null;
  created_by: number;
  created_at: string;
  count: number;
  cover: Asset | null;
}

export interface Stats {
  images: number;
  videos: number;
  events: number;
  days: number;
}
