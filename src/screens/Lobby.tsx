import type { RoomState } from "@/lib/game";

type Props = {
  state: RoomState;
  isHost: boolean;
  busy: boolean;
  onStart: () => void;
};

export function Lobby({ state, isHost, busy, onStart }: Props) {
  return (
    <>
      <section className="card">
        <p className="note">部屋コード</p>
        <p className="code">{state.room.code}</p>
        <p className="note">
          同じ Wi-Fi でなくても OK。各自のスマホでこのコードを入力してもらいましょう
        </p>
      </section>

      <section className="card">
        <h2>参加者（{state.players.length} 人）</h2>
        <ul className="players">
          {state.players.map((p) => (
            <li key={p.id}>
              {p.name}
              {p.id === state.room.host_player_id && <span className="badge">ホスト</span>}
              {p.id === state.me.player_id && <span className="badge me">あなた</span>}
            </li>
          ))}
        </ul>
      </section>

      {isHost ? (
        <button type="button" onClick={onStart} disabled={busy}>
          ガチャへ進む
        </button>
      ) : (
        <p className="note">ホストが開始するのを待っています…</p>
      )}
    </>
  );
}
