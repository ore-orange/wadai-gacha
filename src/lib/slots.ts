import { Constants, type Enums } from "./database.types";

export type Slot = Enums<"slot_type">;

/** 5 つの枠。文にしたときの順番（DB の enum と同じ） */
export const SLOTS = Constants.public.Enums.slot_type;

export const SLOT_LABELS: Record<Slot, string> = {
  when: "いつ",
  where: "どこで",
  who: "だれが",
  what: "なにを",
  how: "どうした",
};

export function slotLabel(slot: Slot): string {
  return SLOT_LABELS[slot];
}

/**
 * 枠ごとに自動で付ける助詞。ユーザーは「〜」の部分だけを入力する。
 * いつ / どうした は助詞なし（「昨日の夜」「全部落とした」のように、そのまま文に入る）
 */
export const SLOT_PARTICLES: Record<Slot, string> = {
  when: "",
  where: "で",
  who: "が",
  what: "を",
  how: "",
};

/** 入力に助詞まで書かれていたら 1 つだけ取り除く（「学校で」→「学校」。二重に付かないようにする） */
export function stripParticle(slot: Slot, text: string): string {
  const trimmed = text.trim();
  const particle = SLOT_PARTICLES[slot];
  if (particle !== "" && trimmed.length > particle.length && trimmed.endsWith(particle)) {
    return trimmed.slice(0, -particle.length).trim();
  }
  return trimmed;
}

/** 文に入れる形にする（助詞を付ける） */
export function withParticle(slot: Slot, text: string): string {
  return text + SLOT_PARTICLES[slot];
}
