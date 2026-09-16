#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// data/topics.csv を読み込み、topics テーブルに投入するスクリプト。
// 1 行目のヘッダー（title,situation,university など）で列を判定するので、タグ列は増やせる。
// RLS で anon key からの INSERT は許可していないため、service_role key で実行する。
//
// - タイトルが既に存在する行はスキップ（title の UNIQUE 制約で冪等）
// - タグ列（situation / university …）に値が書かれていれば、既存行でもその列を更新する
// - 空欄の列は変更しない（本番で手動設定した値を消さないため）
//
// ローカル: pnpm db:seed:topics
// 本番:     GitHub Actions（.github/workflows/seed.yml）が main へのマージ時に実行する
//           手動なら SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-topics.mjs
//
// 終了コード:
//   0 = 成功
//   1 = 失敗（設定ミスなど。再試行しても直らない）
//   2 = DB のスキーマがまだ CSV に追いついていない（マイグレーション適用待ち。再試行すれば通る）
//       main へのマージ時は Supabase のマイグレーション適用とこのスクリプトが同時に走るため、
//       ワークフロー側で 2 のときだけ待って再試行する

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

/** 前後の空白と引用符を取り除く（"タイトル" のように囲まれていても読めるように） */
function clean(value) {
  return value
    .trim()
    .replace(/^["']+|["']+$/g, "")
    .trim();
}

const lines = readFileSync(filePath, "utf-8")
  .split("\n")
  .map((line) => clean(line))
  .filter((line) => line !== "" && !line.startsWith("#"));

// 1 行目はヘッダー。先頭列は title、残りがタグ列（situation, university, ...）
const header = (lines.shift() ?? "").split(",").map((c) => clean(c).toLowerCase());
if (header[0] !== "title") {
  console.error(
    `${filePath} の 1 行目は "title,situation,university" のようなヘッダーにしてください。`,
  );
  process.exit(1);
}
const tagColumns = header.slice(1);

/**
 * 1 行を { title, situation, university, ... } に変換する。
 * タグ列の数だけ末尾からカンマで切り出し、残りをタイトルにする（タイトルにカンマがあっても壊れない）。
 */
function parseLine(line) {
  const parts = line.split(",");
  const tags = parts.splice(Math.max(parts.length - tagColumns.length, 1)).map(clean);
  const row = { title: clean(parts.join(",")) };
  tagColumns.forEach((column, i) => {
    const value = tags[i] ?? "";
    row[column] = value === "" ? null : value;
  });
  return row;
}

const rows = lines.map(parseLine).filter((row) => row.title !== "");

if (rows.length === 0) {
  console.log(`${filePath} に投入対象の行がありません。`);
  process.exit(0);
}

const supabase = createClient(url, serviceRoleKey);

/** DB のスキーマが CSV に追いついていない（enum 値や列が無い）エラーか */
function isSchemaNotReady(error) {
  // 22P02: invalid input value for enum / 42703: column does not exist / PGRST204: schema cache に列が無い
  return (
    error.code === "22P02" ||
    error.code === "42703" ||
    error.code === "PGRST204" ||
    /invalid input value for enum|does not exist|schema cache/.test(error.message)
  );
}

function fail(error) {
  console.error("投入に失敗しました:", error.message);
  if (isSchemaNotReady(error)) {
    console.error(
      "DB のスキーマが data/topics.csv の内容に追いついていません。\n" +
        "- main へのマージ直後なら、Supabase のマイグレーション適用待ちの可能性があります（ワークフローが再試行します）\n" +
        "- ローカルなら `npx supabase db reset` で最新のマイグレーションを適用してください\n" +
        "- situation の値が enum に含まれているか data/topics.csv の先頭コメントも確認してください",
    );
    process.exit(2);
  }
  process.exit(1);
}

// 「どのタグ列に値があるか」でグループ分けして投入する。
// 同じ列構成の行だけをまとめて upsert すると、書かれている列だけが更新され、空欄の列は既存値のまま残る。
const groups = new Map();
for (const row of rows) {
  const columns = tagColumns.filter((c) => row[c] !== null);
  const key = columns.join(",");
  if (!groups.has(key)) groups.set(key, { columns, rows: [] });
  groups.get(key).rows.push(row);
}

let inserted = 0;

for (const { columns, rows: groupRows } of groups.values()) {
  const payload = groupRows.map((row) => {
    const obj = { title: row.title };
    for (const c of columns) obj[c] = row[c];
    return obj;
  });
  const { data, error } = await supabase
    .from("topics")
    // タグが 1 つも無い行は新規追加のみ（既存行に触らない）
    .upsert(payload, { onConflict: "title", ignoreDuplicates: columns.length === 0 })
    .select("id");
  if (error) fail(error);
  inserted += data.length;
}

console.log(
  `${filePath} の ${rows.length} 件を処理しました（新規追加または更新: ${inserted} 件、既存のためスキップ: ${rows.length - inserted} 件）。`,
);
