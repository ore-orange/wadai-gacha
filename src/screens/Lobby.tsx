import { ROUND_MODE_LABELS, type RoomState, type RoundMode } from "@/lib/game";

type Props = {
  state: RoomState;
  isHost: boolean;
  busy: boolean;
  mode: RoundMode;
  onModeChange: (mode: RoundMode) => void;
  onStart: () => void;
};

const MODES: RoundMode[] = ["single", "everyone"];

export function Lobby({ state, isHost, busy, mode, onModeChange, onStart }: Props) {
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
        <>
          <section className="card">
            <h2>遊び方</h2>
            <fieldset className="modes">
              <legend className="sr-only">遊び方</legend>
              {MODES.map((m) => (
                <label key={m} className="mode">
                  <input
                    type="radio"
                    name="mode"
                    value={m}
                    checked={mode === m}
                    onChange={() => onModeChange(m)}
                  />
                  <span className="mode-body">
                    <strong>{ROUND_MODE_LABELS[m].title}</strong>
                    <span className="note">{ROUND_MODE_LABELS[m].description}</span>
                  </span>
                </label>
              ))}
            </fieldset>
          </section>
          <button type="button" onClick={onStart} disabled={busy}>
            ガチャへ進む
          </button>
        </>
      ) : (
        <p className="note">ホストが開始するのを待っています…</p>
      )}
    </>
  );
}
