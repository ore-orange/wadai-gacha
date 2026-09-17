import { beforeEach, describe, expect, it } from "vitest";
import { clearSession, loadSession, saveSession } from "./session";

const session = { roomId: "r", code: "1234", playerId: "p", token: "t" };

beforeEach(() => localStorage.clear());

describe("session", () => {
  it("保存して読み戻せる", () => {
    saveSession(session);
    expect(loadSession()).toEqual(session);
  });

  it("消せる", () => {
    saveSession(session);
    clearSession();
    expect(loadSession()).toBeNull();
  });

  it("壊れた値や欠けた値は null", () => {
    localStorage.setItem("tmg:session", "{not json");
    expect(loadSession()).toBeNull();
    localStorage.setItem("tmg:session", JSON.stringify({ roomId: "r" }));
    expect(loadSession()).toBeNull();
  });
});
