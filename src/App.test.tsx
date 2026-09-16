import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const topics = [
  { id: "1", title: "最近ハマっていること", situation: "サークルの新歓" },
  { id: "2", title: "子どもの頃の夢", situation: "合コン" },
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
  it("ボタンを押すと話題が 1 つ表示される", async () => {
    render(<App />);
    const button = await screen.findByRole("button", { name: "ガチャを回す" });

    fireEvent.click(button);

    const shown = screen.getByText((text) => topics.some((t) => t.title === text));
    expect(shown).toBeTruthy();
    expect(screen.getByRole("button", { name: "もう一回" })).toBeTruthy();
  });

  it("シチュエーションを選ぶとハイライトされ、その話題だけが出る", async () => {
    render(<App />);
    const chip = await screen.findByRole("button", { name: "合コン" });

    fireEvent.click(chip);
    expect(screen.getByRole("button", { name: "合コン", pressed: true })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "ガチャを回す" }));

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
});
