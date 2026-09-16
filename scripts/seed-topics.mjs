#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// data/topics.txt（1行 = 1件のタイトル）を読み込み、topics テーブルに投入するスクリプト。
// RLS で anon key からの INSERT は許可していないため、service_role key で実行する。
//
// ローカル: pnpm db:seed:topics
// 本番:     SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-topics.mjs

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "SUPABASE_URL（または VITE_SUPABASE_URL）と SUPABASE_SERVICE_ROLE_KEY が必要です。\n" +
      "ローカル: `pnpm db:seed:topics`（.env を読み込む）\n" +
      "本番: `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-topics.mjs`",
  );
  process.exit(1);
}

const filePath = resolve(process.argv[2] ?? "data/topics.txt");

const titles = readFileSync(filePath, "utf-8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line !== "" && !line.startsWith("#"));

if (titles.length === 0) {
  console.log(`${filePath} に投入対象の行がありません。`);
  process.exit(0);
}

const supabase = createClient(url, serviceRoleKey);

const { data, error } = await supabase
  .from("topics")
  .upsert(
    titles.map((title) => ({ title })),
    { onConflict: "title", ignoreDuplicates: true },
  )
  .select("id, title");

if (error) {
  console.error("投入に失敗しました:", error.message);
  process.exit(1);
}

console.log(`${filePath} の ${titles.length} 件のうち、${data.length} 件を新規投入しました。`);
