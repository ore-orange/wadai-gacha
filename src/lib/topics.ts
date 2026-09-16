import { Constants, type Enums, type Tables } from "./database.types";
import { supabase } from "./supabase";

export type Topic = Pick<Tables<"topics">, "id" | "title" | "situation" | "university">;
export type Situation = Enums<"situation_type">;
export type University = Enums<"university_type">;

/** 絞り込み UI の選択肢。DB の enum から生成されるので `pnpm db:types` を流せば自動で追従する */
export const SITUATIONS = Constants.public.Enums.situation_type;
export const UNIVERSITIES = Constants.public.Enums.university_type;

/** 全ての話題を取得する */
export async function fetchTopics(): Promise<Topic[]> {
  const { data, error } = await supabase.from("topics").select("id, title, situation, university");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

/**
 * 話題をランダムに 1 つ選ぶ。
 * `excludeId` を渡すと、候補が 2 つ以上あるときは同じ話題を連続で返さない。
 */
export function pickRandomTopic(topics: Topic[], excludeId?: string): Topic | null {
  const candidates = topics.length > 1 ? topics.filter((t) => t.id !== excludeId) : topics;
  if (candidates.length === 0) {
    return null;
  }
  return candidates[Math.floor(Math.random() * candidates.length)];
}

/**
 * 絞り込み条件に合う話題だけを返す。
 * - シチュエーション: 未選択（null）なら全部が対象
 * - 大学: 未選択（null）なら「大学タグの無い話題」だけが対象。
 *   特定の大学向けの話題は、その大学を選んだときだけ出す
 */
export function filterTopics(
  topics: Topic[],
  situation: Situation | null,
  university: University | null,
): Topic[] {
  return topics.filter(
    (t) => (situation === null || t.situation === situation) && t.university === university,
  );
}
