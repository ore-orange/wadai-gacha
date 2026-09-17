/**
 * 参加中の部屋の情報。リロードしても同じプレイヤーとして戻れるよう localStorage に置く。
 * token は本人確認用の秘密なので、画面には出さない。
 */
export type Session = {
  roomId: string;
  code: string;
  playerId: string;
  token: string;
};

const KEY = "tmg:session";

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Partial<Session>;
    if (!s.roomId || !s.code || !s.playerId || !s.token) return null;
    return s as Session;
  } catch {
    return null;
  }
}

export function saveSession(session: Session): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(session));
  } catch {
    // private モードなどで保存できなくても、メモリ上の状態だけで遊べる
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // noop
  }
}
