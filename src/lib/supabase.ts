import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY が設定されていません。.env.example を参考に .env を作成してください。",
  );
}

// anon key はブラウザに公開される前提。データの保護は Supabase 側の RLS で行う。
export const supabase = createClient<Database>(url, anonKey);
