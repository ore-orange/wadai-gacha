import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const topics = [
  { id: "1", title: "最近ハマっていること", situation: "welcome_party", university: null },
  { id: "2", title: "子どもの頃の夢", situation: "mixer", university: null },
  { id: "3", title: "方言について", situation: null, university: "ryukyu" },
] as const;

// supabase クライアントは env が必要なのでモックする（CI には .env が無い）
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

vi.mock("@/lib/topics", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/topics")>();
  return { ...mod, fetchTopics: vi.fn(async () => topics) };
});

const { App } = await import("./App");

afterEach(cleanup);

describe("App", () => {
  it("開いた時点で話題が 1 つ表示されている", async () => {
    render(<App />);
    await screen.findByRole("button", { name: "もう一回" });

    const shown = screen.getByText((text) => topics.some((t) => t.title === text));
    expect(shown).toBeTruthy();
  });

  it("もう一回を押すと別の話題に変わる", async () => {
    render(<App />);
    const button = await screen.findByRole("button", { name: "もう一回" });
    const before = screen.getByText((text) => topics.some((t) => t.title === text)).textContent;

    fireEvent.click(button);

    const after = screen.getByText((text) => topics.some((t) => t.title === text)).textContent;
    expect(after).not.toBe(before);
  });

  it("シチュエーションを選ぶとハイライトされ、その話題だけが出る", async () => {
    render(<App />);
    const chip = await screen.findByRole("button", { name: "合コン" });

    fireEvent.click(chip);
    expect(screen.getByRole("button", { name: "合コン", pressed: true })).toBeTruthy();

    expect(screen.getByText("子どもの頃の夢")).toBeTruthy();
    expect(screen.queryByText("最近ハマっていること")).toBeNull();
  });

  it("選択中のシチュエーションをもう一度押すと解除される", async () => {
    render(<App />);
    const chip = await screen.findByRole("button", { name: "合コン" });

    fireEvent.click(chip);
    fireEvent.click(chip);

    expect(screen.getByRole("button", { name: "合コン", pressed: false })).toBeTruthy();
  });

  it("大学を選んでいないときは大学タグ付きの話題は出ない", async () => {
    render(<App />);
    const button = await screen.findByRole("button", { name: "もう一回" });

    for (let i = 0; i < 20; i++) {
      expect(screen.queryByText("方言について")).toBeNull();
      fireEvent.click(button);
    }
  });

  it("大学を選ぶとその大学の話題だけが出る", async () => {
    render(<App />);
    const chip = await screen.findByRole("button", { name: "琉球大学" });

    fireEvent.click(chip);
    expect(screen.getByRole("button", { name: "琉球大学", pressed: true })).toBeTruthy();

    expect(screen.getByText("方言について")).toBeTruthy();
    expect(screen.queryByText("子どもの頃の夢")).toBeNull();
  });
});
