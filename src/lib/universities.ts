import type { University } from "./topics";

/**
 * 大学の表示名。
 * DB / CSV では英語のキー（enum 値）で管理し、画面に出すときだけここで日本語に変換する。
 * enum に値を追加したら、マイグレーション → `pnpm db:types` → ここに表示名を追加する
 * （追加し忘れると型エラーになる）。
 */
export const UNIVERSITY_LABELS: Record<University, string> = {
  ryukyu: "琉球大学",
};

export function universityLabel(university: University): string {
  return UNIVERSITY_LABELS[university];
}
