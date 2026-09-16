import { describe, expect, it, vi } from "vitest";

// supabase クライアントは env が必要なのでモックする
vi.mock("./supabase", () => ({ supabase: {} }));

const { filterTopics, pickRandomTopic } = await import("./topics");

const topics = [
  { id: "a", title: "A", situation: null, university: null },
  { id: "b", title: "B", situation: null, university: null },
  { id: "c", title: "C", situation: null, university: null },
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

describe("filterTopics", () => {
  const all = [
    { id: "1", title: "一般A", situation: "mixer", university: null },
    { id: "2", title: "一般B", situation: "group_work", university: null },
    { id: "3", title: "琉大", situation: "mixer", university: "ryukyu" },
  ] as const;

  it("何も選んでいないときは大学タグの無い話題だけ", () => {
    expect(filterTopics([...all], null, null).map((t) => t.id)).toEqual(["1", "2"]);
  });

  it("大学を選ぶとその大学の話題だけ", () => {
    expect(filterTopics([...all], null, "ryukyu").map((t) => t.id)).toEqual(["3"]);
  });

  it("シチュエーションと大学は AND", () => {
    expect(filterTopics([...all], "mixer", null).map((t) => t.id)).toEqual(["1"]);
    expect(filterTopics([...all], "group_work", "ryukyu")).toEqual([]);
  });
});
