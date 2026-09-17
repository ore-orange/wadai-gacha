import { useState } from "react";
import { useRoomState } from "@/hooks/useRoomState";
import {
  dealSlots,
  finishRoom,
  type RoundMode,
  rerollTheme,
  reshuffleSentences,
  setRevealIndex,
  startRound,
  submitEntry,
} from "@/lib/game";
import type { Session } from "@/lib/session";
import type { Slot } from "@/lib/slots";
import { Lobby } from "./Lobby";
import { Revealed } from "./Revealed";
import { Rolling } from "./Rolling";
import { Writing } from "./Writing";

type Props = { session: Session; onLeave: () => void };

/** 部屋に入ったあとの画面。部屋とラウンドのフェーズに応じて画面を切り替える */
export function Room({ session, onLeave }: Props) {
  const { state, error, refresh } = useRoomState(session);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [mode, setMode] = useState<RoundMode>("single");

  const act = async (fn: () => Promise<void>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
      await refresh();
    } catch (e: unknown) {
      setActionError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  if (error && !state) {
    return (
      <>
        <p role="alert">{error}</p>
        <button type="button" className="secondary" onClick={onLeave}>
          ホームに戻る
        </button>
      </>
    );
  }
  if (!state) {
    return <p>読み込み中...</p>;
  }

  const isHost = state.me.player_id === state.room.host_player_id;
  const round = state.round;

  let screen: React.ReactNode;
  if (state.room.phase === "finished") {
    screen = (
      <>
        <section className="card">
          <p>ゲームを終了しました。おつかれさまでした！</p>
        </section>
        <button type="button" onClick={onLeave}>
          ホームに戻る
        </button>
      </>
    );
  } else if (!round || state.room.phase === "lobby") {
    screen = (
      <Lobby
        state={state}
        isHost={isHost}
        busy={busy}
        mode={mode}
        onModeChange={setMode}
        onStart={() => act(() => startRound(session, mode))}
      />
    );
  } else if (round.phase === "rolling") {
    screen = (
      <Rolling
        round={round}
        isHost={isHost}
        busy={busy}
        onReroll={(slot: Slot) => act(() => rerollTheme(session, round.id, slot))}
        onDeal={() => act(() => dealSlots(session, round.id))}
        onFinish={() => act(() => finishRoom(session))}
      />
    );
  } else if (round.phase === "writing") {
    screen = (
      <Writing
        round={round}
        busy={busy}
        onSubmit={(entryId, text) => act(() => submitEntry(session, entryId, text))}
      />
    );
  } else {
    screen = (
      <Revealed
        round={round}
        isHost={isHost}
        busy={busy}
        onShow={(i) => act(() => setRevealIndex(session, round.id, i))}
        onReshuffle={() => act(() => reshuffleSentences(session, round.id))}
        // 次のラウンドも同じ遊び方で始める
        onNextRound={() => act(() => startRound(session, round.mode))}
        onFinish={() => act(() => finishRoom(session))}
      />
    );
  }

  return (
    <>
      <header className="room-header">
        <span className="note">
          部屋 {state.room.code} ・ {state.me.name}
          {isHost && "（ホスト）"}
        </span>
        <button type="button" className="link" onClick={onLeave}>
          退出
        </button>
      </header>
      {screen}
      {actionError && <p role="alert">{actionError}</p>}
    </>
  );
}
