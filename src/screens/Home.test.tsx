import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const createRoom = vi.fn(async (name: string) => ({
  roomId: "r",
  code: "1234",
  playerId: "p",
  token: "t",
  name,
}));
const joinRoom = vi.fn(async () => ({ roomId: "r", code: "1234", playerId: "p2", token: "t2" }));
vi.mock("@/lib/game", () => ({ createRoom, joinRoom }));

const { Home } = await import("./Home");

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("Home", () => {
  it("名前が空だとボタンが押せない", () => {
    render(<Home onEnter={() => {}} />);
    expect(screen.getByRole("button", { name: "部屋を作る" })).toHaveProperty("disabled", true);
    expect(screen.getByRole("button", { name: "参加する" })).toHaveProperty("disabled", true);
  });

  it("名前を入れて部屋を作ると onEnter が呼ばれる", async () => {
    const onEnter = vi.fn();
    render(<Home onEnter={onEnter} />);
    fireEvent.change(screen.getByPlaceholderText("ニックネーム"), { target: { value: "ひびき" } });
    fireEvent.click(screen.getByRole("button", { name: "部屋を作る" }));

    await waitFor(() => expect(onEnter).toHaveBeenCalled());
    expect(createRoom).toHaveBeenCalledWith("ひびき");
  });

  it("コードは 4 桁の数字だけ受け付ける", async () => {
    const onEnter = vi.fn();
    render(<Home onEnter={onEnter} />);
    fireEvent.change(screen.getByPlaceholderText("ニックネーム"), { target: { value: "A" } });
    const code = screen.getByPlaceholderText("0000");
    fireEvent.change(code, { target: { value: "12a3456" } });
    expect((code as HTMLInputElement).value).toBe("1234");

    fireEvent.click(screen.getByRole("button", { name: "参加する" }));
    await waitFor(() => expect(joinRoom).toHaveBeenCalledWith("1234", "A"));
  });

  it("失敗したらエラーを表示する", async () => {
    createRoom.mockRejectedValueOnce(new Error("名前を入力してください"));
    render(<Home onEnter={() => {}} />);
    fireEvent.change(screen.getByPlaceholderText("ニックネーム"), { target: { value: "x" } });
    fireEvent.click(screen.getByRole("button", { name: "部屋を作る" }));
    expect(await screen.findByRole("alert")).toHaveProperty(
      "textContent",
      "名前を入力してください",
    );
  });
});
