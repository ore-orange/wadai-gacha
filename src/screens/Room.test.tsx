import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RoomState } from "@/lib/game";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const startRound = vi.fn(async () => {});
const rerollTheme = vi.fn(async () => {});
const dealSlots = vi.fn(async () => {});
const submitEntry = vi.fn(async () => {});
const finishRoom = vi.fn(async () => {});
vi.mock("@/lib/game", () => ({ startRound, rerollTheme, dealSlots, submitEntry, finishRoom }));

// useRoomState をテストごとに差し替える
let current: RoomState | null = null;
vi.mock("@/hooks/useRoomState", () => ({
  useRoomState: () => ({ state: current, error: null, refresh: vi.fn(async () => {}) }),
}));

const { Room } = await import("./Room");

const session = { roomId: "r", code: "1234", playerId: "host", token: "t" };
const base: RoomState = {
  room: { id: "r", code: "1234", phase: "lobby", host_player_id: "host" },
  players: [
    { id: "host", name: "ホスト" },
    { id: "a", name: "A" },
  ],
  me: { player_id: "host", name: "ホスト" },
  round: null,
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Room", () => {
  it("ロビー: ホストには開始ボタンが出る", () => {
    current = base;
    render(<Room session={session} onLeave={() => {}} />);
    expect(screen.getByText("1234")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "ガチャへ進む" }));
    expect(startRound).toHaveBeenCalled();
  });

  it("ロビー: 参加者には開始ボタンが出ない", () => {
    current = { ...base, me: { player_id: "a", name: "A" } };
    render(<Room session={session} onLeave={() => {}} />);
    expect(screen.queryByRole("button", { name: "ガチャへ進む" })).toBeNull();
  });

  it("お題: ホストは引き直しと配布ができる", async () => {
    current = {
      ...base,
      room: { ...base.room, phase: "playing" },
      round: {
        id: "rd",
        number: 1,
        mode: "single",
        phase: "rolling",
        submitted_count: 0,
        total_count: 0,
        sentences: null,
        themes: { when: { id: "t1", text: "高校生の頃" } },
        my_entries: [],
      },
    };
    render(<Room session={session} onLeave={() => {}} />);
    expect(screen.getByText("高校生の頃")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "いつの小テーマを引き直す" }));
    expect(rerollTheme).toHaveBeenCalledWith(session, "rd", "when");

    // 操作中はボタンが無効になるので、終わるのを待ってから次の操作
    const deal = screen.getByRole("button", { name: "この小テーマで配る" });
    await waitFor(() => expect(deal).toHaveProperty("disabled", false));
    fireEvent.click(deal);
    expect(dealSlots).toHaveBeenCalledWith(session, "rd");
  });

  it("入力: 自分の枠を送信できる", () => {
    current = {
      ...base,
      room: { ...base.room, phase: "playing" },
      round: {
        id: "rd",
        number: 1,
        mode: "single",
        phase: "writing",
        submitted_count: 0,
        total_count: 5,
        sentences: null,
        themes: {},
        my_entries: [{ id: "e1", slot: "where", theme: "家の外", text: null, submitted: false }],
      },
    };
    render(<Room session={session} onLeave={() => {}} />);
    expect(screen.getByText("小テーマ: 家の外")).toBeTruthy();
    // 助詞まで打っても外して送る
    fireEvent.change(screen.getByPlaceholderText("例: 体育館の裏"), {
      target: { value: "駅前で" },
    });
    fireEvent.click(screen.getByRole("button", { name: "送信" }));
    expect(submitEntry).toHaveBeenCalledWith(session, "e1", "駅前");
  });

  it("発表: 助詞付きで文がつながって表示され、ホストは次へ進める", () => {
    current = {
      ...base,
      room: { ...base.room, phase: "playing" },
      round: {
        id: "rd",
        number: 1,
        mode: "single",
        phase: "revealed",
        submitted_count: 5,
        total_count: 5,
        sentences: [
          [
            { slot: "when", text: "昨日" },
            { slot: "where", text: "駅前" },
            { slot: "who", text: "姉" },
            { slot: "what", text: "スマホ" },
            { slot: "how", text: "なくした" },
          ],
        ],
        themes: {},
        my_entries: [],
      },
    };
    render(<Room session={session} onLeave={() => {}} />);
    for (const t of ["昨日", "駅前で", "姉が", "スマホを", "なくした"]) {
      expect(screen.getByText(t)).toBeTruthy();
    }
    fireEvent.click(screen.getByRole("button", { name: "次のラウンドへ" }));
    expect(startRound).toHaveBeenCalled();
  });
});
