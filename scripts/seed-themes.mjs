#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";

// data/themes.csv（slot,text,example）を読み込み、themes テーブルに投入するスクリプト。
// RLS で anon key からの INSERT は許可していないため、service_role key で実行する。
// 同じ (slot, text) は UNIQUE 制約で新規追加されず、example だけ更新される（何度実行しても安全）。
//
// ローカル: pnpm db:seed:themes
// 本番:     GitHub Actions（.github/workflows/seed.yml）が main へのマージ時に実行する
//           手動なら SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-themes.mjs
//
// 終了コード:
//   0 = 成功
//   1 = 失敗（設定ミスなど。再試行しても直らない）
//   2 = DB のスキーマがまだ CSV に追いついていない（マイグレーション適用待ち。再試行すれば通る）

const SLOTS = ["when", "where", "who", "what", "how"];

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "SUPABASE_URL（または VITE_SUPABASE_URL）と SUPABASE_SERVICE_ROLE_KEY が必要です。\n" +
      "ローカル: `pnpm db:seed:themes`（.env を読み込む）\n" +
      "本番: `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/seed-themes.mjs`",
  );
  process.exit(1);
}

const filePath = resolve(process.argv[2] ?? "data/themes.csv");

/** 前後の空白と引用符を取り除く */
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

const header = (lines.shift() ?? "").split(",").map((c) => clean(c).toLowerCase());
if (header[0] !== "slot" || header[1] !== "text" || header[2] !== "example") {
  console.error(`${filePath} の 1 行目は "slot,text,example" にしてください。`);
  process.exit(1);
}

/**
 * "枠,質問,答えの例" の行を { slot, text, example } にする。
 * 最初のカンマで枠、最後のカンマで例を切り出し、間を質問にする（質問にカンマがあっても壊れない）
 */
function parseLine(line) {
  const first = line.indexOf(",");
  const last = line.lastIndexOf(",");
  if (first === -1) return null;
  if (last === first) {
    return {
      slot: clean(line.slice(0, first)).toLowerCase(),
      text: clean(line.slice(first + 1)),
      example: null,
    };
  }
  const example = clean(line.slice(last + 1));
  return {
    slot: clean(line.slice(0, first)).toLowerCase(),
    text: clean(line.slice(first + 1, last)),
    example: example === "" ? null : example,
  };
}

const rows = lines.map(parseLine).filter((row) => row !== null && row.text !== "");

const invalid = rows.filter((row) => !SLOTS.includes(row.slot));
if (invalid.length > 0) {
  console.error(
    `枠の値が不正な行があります: ${invalid.map((r) => `"${r.slot},${r.text}"`).join(", ")}\n` +
      `枠は ${SLOTS.join(" / ")} のいずれかにしてください。`,
  );
  process.exit(1);
}

if (rows.length === 0) {
  console.log(`${filePath} に投入対象の行がありません。`);
  process.exit(0);
}

const supabase = createClient(url, serviceRoleKey);

/** DB のスキーマが CSV に追いついていない（列やテーブルが無い）エラーか */
function isSchemaNotReady(error) {
  return (
    error.code === "22P02" ||
    error.code === "42703" ||
    error.code === "42P01" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    /invalid input value for enum|does not exist|schema cache/.test(error.message)
  );
}

const { error } = await supabase.from("themes").upsert(rows, { onConflict: "slot,text" });

if (error) {
  console.error("投入に失敗しました:", error.message);
  if (isSchemaNotReady(error)) {
    console.error(
      "DB のスキーマが data/themes.csv の内容に追いついていません。\n" +
        "- main へのマージ直後なら、Supabase のマイグレーション適用待ちの可能性があります（ワークフローが再試行します）\n" +
        "- ローカルなら `npx supabase db reset` で最新のマイグレーションを適用してください",
    );
    process.exit(2);
  }
  process.exit(1);
}

const bySlot = SLOTS.map((s) => `${s}: ${rows.filter((r) => r.slot === s).length}`).join(", ");
console.log(
  `${filePath} の ${rows.length} 件を投入しました（既存の質問は答えの例を更新）。枠ごとの件数 → ${bySlot}`,
);
