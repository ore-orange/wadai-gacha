import { describe, expect, it } from "vitest";
import { SLOT_LABELS, SLOTS, slotLabel } from "./slots";

describe("slots", () => {
  it("5 つの枠が文の順番で並んでいる", () => {
    expect(SLOTS).toEqual(["when", "where", "who", "what", "how"]);
  });

  it("すべての枠に日本語の表示名がある", () => {
    for (const slot of SLOTS) {
      expect(SLOT_LABELS[slot]).toBeTruthy();
      expect(slotLabel(slot)).toBe(SLOT_LABELS[slot]);
    }
  });
});
