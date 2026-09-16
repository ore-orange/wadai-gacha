import type { Situation } from "./topics";

/**
 * シチュエーションの表示名。
 * DB / CSV では英語のキー（enum 値）で管理し、画面に出すときだけここで日本語に変換する。
 * enum に値を追加したら、マイグレーション → `pnpm db:types` → ここに表示名を追加する
 * （追加し忘れると型エラーになる）。
 */
export const SITUATION_LABELS: Record<Situation, string> = {
  group_work: "グループワーク",
  welcome_party: "サークルの新歓",
  mixer: "合コン",
};

export function situationLabel(situation: Situation): string {
  return SITUATION_LABELS[situation];
}
