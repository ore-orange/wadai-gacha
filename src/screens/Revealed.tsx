import type { Round } from "@/lib/game";
import { slotLabel } from "@/lib/slots";

type Props = {
  round: Round;
  isHost: boolean;
  busy: boolean;
  onNext: () => void;
  onFinish: () => void;
};

export function Revealed({ round, isHost, busy, onNext, onFinish }: Props) {
  const sentences = round.sentences ?? [];
  return (
    <>
      <h2>ラウンド {round.number} の結果</h2>
      {sentences.map((parts, i) => (
        <section className="card sentence" key={parts.map((p) => p.text).join("|")}>
          {sentences.length > 1 && <p className="note">{i + 1} 文目</p>}
          <p className="sentence-text">
            {parts.map((p) => (
              <span key={p.slot} className={`part part-${p.slot}`} title={slotLabel(p.slot)}>
                {p.text ?? "（未入力）"}
              </span>
            ))}
          </p>
        </section>
      ))}
      <p className="note">誰がどの枠を書いたかは秘密です。気になるところを聞いてみましょう</p>

      {isHost ? (
        <div className="actions">
          <button type="button" onClick={onNext} disabled={busy}>
            次のラウンドへ
          </button>
          <button type="button" className="secondary" onClick={onFinish} disabled={busy}>
            終了する
          </button>
        </div>
      ) : (
        <p className="note">ホストが次に進めるのを待っています…</p>
      )}
    </>
  );
}
