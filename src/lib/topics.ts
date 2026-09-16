import { Constants, type Enums, type Tables } from "./database.types";
import { supabase } from "./supabase";

export type Topic = Pick<Tables<"topics">, "id" | "title" | "situation">;
export type Situation = Enums<"situation_type">;

/** 絞り込み UI の選択肢。DB の enum から生成されるので `pnpm db:types` を流せば自動で追従する */
export const SITUATIONS = Constants.public.Enums.situation_type;

/** 全ての話題を取得する */
export async function fetchTopics(): Promise<Topic[]> {
  const { data, error } = await supabase.from("topics").select("id, title, situation");
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
