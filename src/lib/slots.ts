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
