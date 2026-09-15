import { describe, expect, it, vi } from "vitest";

// supabase クライアントは env が必要なのでモックする
vi.mock("./supabase", () => ({ supabase: {} }));

const { pickRandomTopic } = await import("./topics");

const topics = [
  { id: "a", title: "A" },
  { id: "b", title: "B" },
  { id: "c", title: "C" },
];

describe("pickRandomTopic", () => {
  it("候補が空なら null を返す", () => {
    expect(pickRandomTopic([])).toBeNull();
  });

  it("候補の中から 1 つ返す", () => {
    for (let i = 0; i < 20; i++) {
      const picked = pickRandomTopic(topics);
      expect(topics).toContainEqual(picked);
    }
  });

  it("excludeId と同じ話題は返さない", () => {
    for (let i = 0; i < 50; i++) {
      expect(pickRandomTopic(topics, "a")?.id).not.toBe("a");
    }
  });

  it("候補が 1 つだけなら excludeId と同じでもそれを返す", () => {
    expect(pickRandomTopic([topics[0]], "a")).toEqual(topics[0]);
  });
});
