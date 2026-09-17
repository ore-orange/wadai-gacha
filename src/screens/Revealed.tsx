import type { Round, SentencePart } from "@/lib/game";
import { slotLabel, withParticle } from "@/lib/slots";

type Props = {
  round: Round;
  isHost: boolean;
  busy: boolean;
  onShow: (index: number) => void;
  onReshuffle: () => void;
  onNextRound: () => void;
  onFinish: () => void;
};

export function Revealed({
  round,
  isHost,
  busy,
  onShow,
  onReshuffle,
  onNextRound,
  onFinish,
}: Props) {
  const sentences = round.sentences ?? [];
  const index = Math.min(round.reveal_index, Math.max(sentences.length - 1, 0));
  const current = sentences[index];
  const isLast = index >= sentences.length - 1;
  const hasMany = sentences.length > 1;

  return (
    <>
      <h2>ラウンド {round.number} の結果</h2>

      {current && (
        <section className="card sentence" aria-live="polite">
          {hasMany && (
            <p className="note">
              {index + 1} / {sentences.length} 文目
            </p>
          )}
          <Sentence parts={current} />
        </section>
      )}

      {isHost && hasMany && (
        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={() => onShow(index - 1)}
            disabled={busy || index === 0}
          >
            前の文
          </button>
          <button type="button" onClick={() => onShow(index + 1)} disabled={busy || isLast}>
            次の文へ
          </button>
        </div>
      )}
      {!isHost && hasMany && !isLast && (
        <p className="note">ホストが次の文をめくるのを待っています…</p>
      )}

      {isLast && hasMany && (
        <details className="card" open>
          <summary>全部の文を見る</summary>
          <ol className="sentence-list">
            {sentences.map((parts) => (
              <li key={parts.map((p) => p.text).join("|")}>
                <Sentence parts={parts} small />
              </li>
            ))}
          </ol>
        </details>
      )}

      <p className="note">誰がどの枠を書いたかは秘密です。気になるところを聞いてみましょう</p>

      {isHost ? (
        <div className="actions">
          {round.mode === "everyone" && (
            <button type="button" className="secondary" onClick={onReshuffle} disabled={busy}>
              もう一度シャッフル
            </button>
          )}
          <button type="button" onClick={onNextRound} disabled={busy}>
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

function Sentence({ parts, small = false }: { parts: SentencePart[]; small?: boolean }) {
  return (
    <p className={small ? "sentence-text small" : "sentence-text"}>
      {parts.map((p) => (
        <span key={p.slot} className={`part part-${p.slot}`} title={slotLabel(p.slot)}>
          {p.text === null ? "（未入力）" : withParticle(p.slot, p.text)}
        </span>
      ))}
    </p>
  );
}
