import { type FormEvent, useState } from "react";
import type { MyEntry, Round } from "@/lib/game";
import { slotLabel } from "@/lib/slots";

type Props = {
  round: Round;
  busy: boolean;
  onSubmit: (entryId: string, text: string) => Promise<void>;
};

export function Writing({ round, busy, onSubmit }: Props) {
  const pending = round.my_entries.filter((e) => !e.submitted);
  const done = round.my_entries.filter((e) => e.submitted);

  return (
    <>
      <h2>ラウンド {round.number}</h2>
      {pending.length > 0 ? (
        <>
          <p className="note">
            あなたの担当は{" "}
            <strong>{pending.map((e) => `「${slotLabel(e.slot)}」`).join("と")}</strong>
            {pending.length > 1 ? ` の ${pending.length} 枠です` : " です"}
            。小テーマに合う本当の出来事を書いてください
          </p>
          {pending.map((entry) => (
            <EntryForm key={entry.id} entry={entry} busy={busy} onSubmit={onSubmit} />
          ))}
        </>
      ) : (
        <section className="card">
          <p>
            送信しました。全員が書き終わるのを待っています…{" "}
            <strong>
              {round.submitted_count} / {round.total_count}
            </strong>
          </p>
        </section>
      )}

      {done.length > 0 && pending.length > 0 && (
        <p className="note">送信済み: {done.map((e) => slotLabel(e.slot)).join("、")}</p>
      )}
    </>
  );
}

function EntryForm({
  entry,
  busy,
  onSubmit,
}: {
  entry: MyEntry;
  busy: boolean;
  onSubmit: (entryId: string, text: string) => Promise<void>;
}) {
  const [text, setText] = useState(entry.text ?? "");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim() === "") return;
    onSubmit(entry.id, text);
  };

  return (
    <form className="card entry" onSubmit={handleSubmit}>
      <p className="slot-label big">{slotLabel(entry.slot)}</p>
      <p className="theme-text big">小テーマ: {entry.theme}</p>
      <label className="field">
        <span className="sr-only">{slotLabel(entry.slot)}の内容</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={PLACEHOLDERS[entry.slot]}
          maxLength={60}
        />
      </label>
      <button type="submit" disabled={busy || text.trim() === ""}>
        送信
      </button>
    </form>
  );
}

const PLACEHOLDERS: Record<MyEntry["slot"], string> = {
  when: "例: 高 2 の文化祭で",
  where: "例: 体育館の裏で",
  who: "例: 姉が",
  what: "例: 焼きそばを",
  how: "例: 全部落とした",
};
