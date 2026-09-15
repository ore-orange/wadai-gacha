import { describe, expect, it, vi } from "vitest";

// Supabase クライアントは env が必要なのでテストではモックする
vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: () => ({
      select: () => Promise.resolve({ error: null, count: 0 }),
    }),
  },
}));

describe("App", () => {
  it("モジュールを読み込める", async () => {
    const { App } = await import("./App");
    expect(typeof App).toBe("function");
  });
});
