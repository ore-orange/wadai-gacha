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

describe("particles", () => {
  it("枠ごとの助詞を付ける", async () => {
    const { withParticle } = await import("./slots");
    expect(withParticle("where", "学校")).toBe("学校で");
    expect(withParticle("who", "姉")).toBe("姉が");
    expect(withParticle("what", "焼きそば")).toBe("焼きそばを");
    expect(withParticle("when", "昨日")).toBe("昨日");
    expect(withParticle("how", "落とした")).toBe("落とした");
  });

  it("入力に助詞が含まれていたら 1 つだけ外す", async () => {
    const { stripParticle } = await import("./slots");
    expect(stripParticle("where", "学校で")).toBe("学校");
    expect(stripParticle("where", " 学校 ")).toBe("学校");
    expect(stripParticle("who", "姉が")).toBe("姉");
    expect(stripParticle("what", "本を")).toBe("本");
    // 助詞だけの入力は空にはしない（"が" 1 文字はそのまま）
    expect(stripParticle("who", "が")).toBe("が");
    // 助詞のない枠は何もしない
    expect(stripParticle("when", "昨日")).toBe("昨日");
    expect(stripParticle("how", "落とした")).toBe("落とした");
  });
});
