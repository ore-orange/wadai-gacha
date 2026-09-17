import { type FormEvent, useState } from "react";
import { createRoom, joinRoom } from "@/lib/game";
import type { Session } from "@/lib/session";

type Props = { onEnter: (session: Session) => void };

export function Home({ onEnter }: Props) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<Session>) => {
    setBusy(true);
    setError(null);
    try {
      onEnter(await fn());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const handleCreate = (e: FormEvent) => {
    e.preventDefault();
    run(() => createRoom(name));
  };
  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    run(() => joinRoom(code, name));
  };

  return (
    <>
      <p className="lead">
        「いつ・どこで・だれが・なにを・どうした」の 5 つの枠を、みんなで 1 つずつ埋めて 1
        つの文を作るゲーム。 各枠には毎回ガチャで質問が付き、それに本当のことで答えます。
      </p>

      <label className="field">
        <span>あなたの名前</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ニックネーム"
          maxLength={20}
          autoComplete="nickname"
        />
      </label>

      <form className="card" onSubmit={handleCreate}>
        <h2>部屋を作る</h2>
        <p className="note">あなたがホストになり、ガチャと進行を担当します</p>
        <button type="submit" disabled={busy || name.trim() === ""}>
          部屋を作る
        </button>
      </form>

      <form className="card" onSubmit={handleJoin}>
        <h2>部屋に参加する</h2>
        <label className="field">
          <span>部屋コード（4 桁）</span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 4))}
            placeholder="0000"
            inputMode="numeric"
            pattern="\d{4}"
            className="code-input"
          />
        </label>
        <button type="submit" disabled={busy || name.trim() === "" || code.length !== 4}>
          参加する
        </button>
      </form>

      {error && <p role="alert">{error}</p>}
    </>
  );
}
