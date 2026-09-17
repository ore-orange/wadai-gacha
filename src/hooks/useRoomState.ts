import { useCallback, useEffect, useRef, useState } from "react";
import { getRoomState, type RoomState } from "@/lib/game";
import type { Session } from "@/lib/session";
import { supabase } from "@/lib/supabase";

// Realtime が届かない環境（ネットワーク制限など）でも進行できるよう、定期的にも取り直す
const POLL_INTERVAL_MS = 5000;

/**
 * 部屋の状態を取得し、他の端末での変更（参加・ガチャ・送信…）に追従する。
 * 状態は常に get_room_state の結果だけを使い、Realtime のイベントは「取り直す合図」としてだけ使う。
 */
export function useRoomState(session: Session) {
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      setState(await getRoomState(session));
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      inFlight.current = false;
    }
  }, [session]);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel(`room:${session.roomId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${session.roomId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${session.roomId}` },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rounds", filter: `room_id=eq.${session.roomId}` },
        refresh,
      )
      // round_themes は room_id を持たないので絞り込めない。件数が少ないので全件購読して取り直す
      .on("postgres_changes", { event: "*", schema: "public", table: "round_themes" }, refresh)
      .subscribe();

    const timer = setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [session.roomId, refresh]);

  return { state, error, refresh };
}
