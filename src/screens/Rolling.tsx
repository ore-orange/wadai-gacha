import type { Round } from "@/lib/game";
import { SLOTS, type Slot, slotLabel } from "@/lib/slots";

type Props = {
  round: Round;
  isHost: boolean;
  busy: boolean;
  onReroll: (slot: Slot) => void;
  onDeal: () => void;
  onFinish: () => void;
};

export function Rolling({ round, isHost, busy, onReroll, onDeal, onFinish }: Props) {
  return (
    <>
      <h2>ラウンド {round.number} のお題</h2>
      <ul className="themes">
        {SLOTS.map((slot) => (
          <li key={slot} className="theme-row">
            <span className="slot-label">{slotLabel(slot)}</span>
            <span className="theme-text">{round.themes[slot]?.text ?? "…"}</span>
            {isHost && (
              <button
                type="button"
                className="icon-button"
                aria-label={`${slotLabel(slot)}の小テーマを引き直す`}
                onClick={() => onReroll(slot)}
                disabled={busy}
              >
                ↻
              </button>
            )}
          </li>
        ))}
      </ul>

      {isHost ? (
        <>
          <p className="note">気に入らない枠は ↻ で引き直せます。決まったら配りましょう</p>
          <div className="actions">
            <button type="button" onClick={onDeal} disabled={busy}>
              この小テーマで配る
            </button>
            <button type="button" className="secondary" onClick={onFinish} disabled={busy}>
              終了する
            </button>
          </div>
        </>
      ) : (
        <p className="note">ホストがお題を決めています…</p>
      )}
    </>
  );
}
