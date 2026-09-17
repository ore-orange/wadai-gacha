import type { Enums } from "./database.types";
import type { Session } from "./session";
import type { Slot } from "./slots";
import { supabase } from "./supabase";

export type RoomPhase = Enums<"room_phase">;
export type RoundPhase = Enums<"round_phase">;
export type RoundMode = Enums<"round_mode">;

export const ROUND_MODE_LABELS: Record<RoundMode, { title: string; description: string }> = {
  single: {
    title: "みんなで 1 文",
    description: "5 つの枠をランダムに配り、1 人 1 枠ずつ書いて 1 つの文を作る",
  },
  everyone: {
    title: "1 人 5 枠",
    description: "全員が 5 枠すべてを書き、枠ごとに混ぜて人数分の文を作る",
  },
};

export type Player = { id: string; name: string };

export type MyEntry = {
  id: string;
  slot: Slot;
  theme: string;
  example: string | null;
  text: string | null;
  submitted: boolean;
};

export type SentencePart = { slot: Slot; text: string | null };

export type Round = {
  id: string;
  number: number;
  mode: RoundMode;
  phase: RoundPhase;
  submitted_count: number;
  total_count: number;
  sentences: SentencePart[][] | null;
  reveal_index: number;
  themes: Partial<Record<Slot, { id: string; text: string }>>;
  my_entries: MyEntry[];
};

export type RoomState = {
  room: { id: string; code: string; phase: RoomPhase; host_player_id: string | null };
  players: Player[];
  me: { player_id: string; name: string };
  round: Round | null;
};

type JoinResult = { room_id: string; code: string; player_id: string; token: string };

function toSession(r: JoinResult): Session {
  return { roomId: r.room_id, code: r.code, playerId: r.player_id, token: r.token };
}

function fail(error: { message: string } | null): never {
  throw new Error(error?.message ?? "不明なエラーが発生しました");
}

export async function createRoom(name: string): Promise<Session> {
  const { data, error } = await supabase.rpc("create_room", { p_name: name });
  if (error) fail(error);
  return toSession(data as JoinResult);
}

export async function joinRoom(code: string, name: string): Promise<Session> {
  const { data, error } = await supabase.rpc("join_room", { p_code: code, p_name: name });
  if (error) fail(error);
  return toSession(data as JoinResult);
}

export async function getRoomState(session: Session): Promise<RoomState> {
  const { data, error } = await supabase.rpc("get_room_state", {
    p_room_id: session.roomId,
    p_token: session.token,
  });
  if (error) fail(error);
  return data as RoomState;
}

export async function startRound(session: Session, mode: RoundMode): Promise<void> {
  const { error } = await supabase.rpc("start_round", {
    p_room_id: session.roomId,
    p_token: session.token,
    p_mode: mode,
  });
  if (error) fail(error);
}

export async function rerollTheme(session: Session, roundId: string, slot: Slot): Promise<void> {
  const { error } = await supabase.rpc("reroll_theme", {
    p_round_id: roundId,
    p_slot: slot,
    p_token: session.token,
  });
  if (error) fail(error);
}

export async function dealSlots(session: Session, roundId: string): Promise<void> {
  const { error } = await supabase.rpc("deal_slots", {
    p_round_id: roundId,
    p_token: session.token,
  });
  if (error) fail(error);
}

export async function submitEntry(session: Session, entryId: string, text: string): Promise<void> {
  const { error } = await supabase.rpc("submit_entry", {
    p_entry_id: entryId,
    p_text: text,
    p_token: session.token,
  });
  if (error) fail(error);
}

export async function setRevealIndex(
  session: Session,
  roundId: string,
  index: number,
): Promise<void> {
  const { error } = await supabase.rpc("set_reveal_index", {
    p_round_id: roundId,
    p_index: index,
    p_token: session.token,
  });
  if (error) fail(error);
}

export async function reshuffleSentences(session: Session, roundId: string): Promise<void> {
  const { error } = await supabase.rpc("reshuffle_sentences", {
    p_round_id: roundId,
    p_token: session.token,
  });
  if (error) fail(error);
}

export async function finishRoom(session: Session): Promise<void> {
  const { error } = await supabase.rpc("finish_room", {
    p_room_id: session.roomId,
    p_token: session.token,
  });
  if (error) fail(error);
}
