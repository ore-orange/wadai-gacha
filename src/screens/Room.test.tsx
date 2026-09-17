import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RoomState } from "@/lib/game";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const startRound = vi.fn(async () => {});
const rerollTheme = vi.fn(async () => {});
const dealSlots = vi.fn(async () => {});
const submitEntry = vi.fn(async () => {});
const finishRoom = vi.fn(async () => {});
const setRevealIndex = vi.fn(async () => {});
const reshuffleSentences = vi.fn(async () => {});
vi.mock("@/lib/game", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/game")>();
  return {
    ROUND_MODE_LABELS: mod.ROUND_MODE_LABELS,
    startRound,
    rerollTheme,
    dealSlots,
    submitEntry,
    finishRoom,
    setRevealIndex,
    reshuffleSentences,
  };
});

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
  it("ロビー: ホストは遊び方を選んで開始できる", () => {
    current = base;
    render(<Room session={session} onLeave={() => {}} />);
    expect(screen.getByText("1234")).toBeTruthy();
    fireEvent.click(screen.getByRole("radio", { name: /1 人 5 枠/ }));
    fireEvent.click(screen.getByRole("button", { name: "ガチャへ進む" }));
    expect(startRound).toHaveBeenCalledWith(session, "everyone");
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
        reveal_index: 0,
        themes: { when: { id: "t1", text: "高校時代で一番楽しかった時期は？" } },
        my_entries: [],
      },
    };
    render(<Room session={session} onLeave={() => {}} />);
    expect(screen.getByText("高校時代で一番楽しかった時期は？")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "いつの小テーマを引き直す" }));
    expect(rerollTheme).toHaveBeenCalledWith(session, "rd", "when");

    // 操作中はボタンが無効になるので、終わるのを待ってから次の操作
    const deal = screen.getByRole("button", { name: "この質問で配る" });
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
        reveal_index: 0,
        themes: {},
        my_entries: [
          {
            id: "e1",
            slot: "where",
            theme: "最近よく行く場所は？",
            example: "駅前のマック",
            text: null,
            submitted: false,
          },
        ],
      },
    };
    render(<Room session={session} onLeave={() => {}} />);
    expect(screen.getByText("最近よく行く場所は？")).toBeTruthy();
    // 質問に合った例がプレースホルダーに出る
    expect(screen.getByPlaceholderText("例: 駅前のマック")).toBeTruthy();
    // 助詞まで打っても外して送る
    fireEvent.change(screen.getByRole("textbox"), {
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
        reveal_index: 0,
        themes: {},
        my_entries: [],
      },
    };
    render(<Room session={session} onLeave={() => {}} />);
    for (const t of ["昨日", "駅前で", "姉が", "スマホを", "なくした"]) {
      expect(screen.getByText(t)).toBeTruthy();
    }
    // 1 文しか無いので送りボタンは出ない
    expect(screen.queryByRole("button", { name: "次の文へ" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "次のラウンドへ" }));
    expect(startRound).toHaveBeenCalledWith(session, "single");
  });

  it("発表（1 人 5 枠）: 1 文ずつ表示し、ホストが送れる・シャッフルできる", () => {
    const mk = (n: number) =>
      (["when", "where", "who", "what", "how"] as const).map((slot) => ({
        slot,
        text: `${slot}${n}`,
      }));
    current = {
      ...base,
      room: { ...base.room, phase: "playing" },
      round: {
        id: "rd",
        number: 1,
        mode: "everyone",
        phase: "revealed",
        submitted_count: 10,
        total_count: 10,
        sentences: [mk(1), mk(2)],
        reveal_index: 0,
        themes: {},
        my_entries: [],
      },
    };
    render(<Room session={session} onLeave={() => {}} />);
    expect(screen.getByText("1 / 2 文目")).toBeTruthy();
    expect(screen.getByText("when1")).toBeTruthy();
    expect(screen.queryByText("when2")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "次の文へ" }));
    expect(setRevealIndex).toHaveBeenCalledWith(session, "rd", 1);
  });

  it("発表（1 人 5 枠）: 最後の文では一覧が出て、シャッフルできる", () => {
    const mk = (n: number) =>
      (["when", "where", "who", "what", "how"] as const).map((slot) => ({
        slot,
        text: `${slot}${n}`,
      }));
    current = {
      ...base,
      room: { ...base.room, phase: "playing" },
      round: {
        id: "rd",
        number: 1,
        mode: "everyone",
        phase: "revealed",
        submitted_count: 10,
        total_count: 10,
        sentences: [mk(1), mk(2)],
        reveal_index: 1,
        themes: {},
        my_entries: [],
      },
    };
    render(<Room session={session} onLeave={() => {}} />);
    expect(screen.getByText("2 / 2 文目")).toBeTruthy();
    expect(screen.getByText("全部の文を見る")).toBeTruthy();
    expect(screen.getAllByText("when1").length).toBe(1); // 一覧側
    expect(screen.getAllByText("when2").length).toBe(2); // 現在の文 + 一覧
    expect(screen.getByRole("button", { name: "次の文へ" })).toHaveProperty("disabled", true);

    fireEvent.click(screen.getByRole("button", { name: "もう一度シャッフル" }));
    expect(reshuffleSentences).toHaveBeenCalledWith(session, "rd");
  });
});
