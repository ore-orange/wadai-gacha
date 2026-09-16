#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// data/topics.csv（title,situation）を読み込み、topics テーブルに投入するスクリプト。
// RLS で anon key からの INSERT は許可していないため、service_role key で実行する。
//
// - タイトルが既に存在する行はスキップ（title の UNIQUE 制約で冪等）
// - situation が書かれている行は、既存行でも situation を更新する
// - situation が空の行は新規追加のみ（既存行の situation は変更しない。本番で手動設定した値を消さないため）
//
// ローカル: pnpm db:seed:topics
// 本番:     GitHub Actions（.github/workflows/seed.yml）が main へのマージ時に実行する
//           手動なら SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-topics.mjs

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

const filePath = resolve(process.argv[2] ?? "data/topics.csv");

/** "タイトル,シチュエーション" の行を { title, situation } に変換する。区切りは最後のカンマ */
function parseLine(line) {
  const i = line.lastIndexOf(",");
  if (i === -1) {
    return { title: line, situation: null };
  }
  const title = line.slice(0, i).trim();
  const situation = line.slice(i + 1).trim();
  return { title, situation: situation === "" ? null : situation };
}

const rows = readFileSync(filePath, "utf-8")
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line !== "" && !line.startsWith("#") && line !== "title,situation")
  .map(parseLine)
  .filter((row) => row.title !== "");

if (rows.length === 0) {
  console.log(`${filePath} に投入対象の行がありません。`);
  process.exit(0);
}

const supabase = createClient(url, serviceRoleKey);

// situation あり: 既存行の situation も更新する
const withSituation = rows.filter((r) => r.situation !== null);
// situation なし: 新規追加のみ（既存行には触らない）
const withoutSituation = rows.filter((r) => r.situation === null).map(({ title }) => ({ title }));

let inserted = 0;

if (withSituation.length > 0) {
  const { data, error } = await supabase
    .from("topics")
    .upsert(withSituation, { onConflict: "title" })
    .select("id");
  if (error) {
    console.error("投入に失敗しました:", error.message);
    if (error.message.includes("situation_type")) {
      console.error(
        "situation の値が enum に含まれていません。data/topics.csv の先頭コメントを確認してください。",
      );
    }
    process.exit(1);
  }
  inserted += data.length;
}

if (withoutSituation.length > 0) {
  const { data, error } = await supabase
    .from("topics")
    .upsert(withoutSituation, { onConflict: "title", ignoreDuplicates: true })
    .select("id");
  if (error) {
    console.error("投入に失敗しました:", error.message);
    process.exit(1);
  }
  inserted += data.length;
}

console.log(
  `${filePath} の ${rows.length} 件を処理しました（新規追加または更新: ${inserted} 件、既存のためスキップ: ${rows.length - inserted} 件）。`,
);
