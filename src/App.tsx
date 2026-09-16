import { useEffect, useState } from "react";
import { situationLabel } from "@/lib/situations";
import {
  fetchTopics,
  pickRandomTopic,
  SITUATIONS,
  type Situation,
  type Topic,
  UNIVERSITIES,
  type University,
} from "@/lib/topics";
import { universityLabel } from "@/lib/universities";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; topics: Topic[]; current: Topic | null };

export function App() {
  const [state, setState] = useState<State>({ status: "loading" });
  const [situation, setSituation] = useState<Situation | null>(null);
  const [university, setUniversity] = useState<University | null>(null);

  useEffect(() => {
    fetchTopics()
      .then((topics) => setState({ status: "ready", topics, current: null }))
      .catch((e: unknown) =>
        setState({ status: "error", message: e instanceof Error ? e.message : String(e) }),
      );
  }, []);

  const topics = state.status === "ready" ? state.topics : [];
  const candidates = topics.filter(
    (t) =>
      (situation === null || t.situation === situation) &&
      (university === null || t.university === university),
  );

  const spin = () => {
    if (state.status !== "ready") return;
    setState({ ...state, current: pickRandomTopic(candidates, state.current?.id) });
  };

  // 同じものをもう一度押したら解除。絞り込み対象外の結果が残らないよう表示中の話題も消す
  const clearCurrent = () => {
    if (state.status === "ready") setState({ ...state, current: null });
  };
  const toggleSituation = (value: Situation) => {
    setSituation((prev) => (prev === value ? null : value));
    clearCurrent();
  };
  const toggleUniversity = (value: University) => {
    setUniversity((prev) => (prev === value ? null : value));
    clearCurrent();
  };

  return (
    <main>
      <h1>話題ガチャ</h1>

      {state.status === "loading" && <p>読み込み中...</p>}

      {state.status === "error" && <p role="alert">話題を取得できませんでした: {state.message}</p>}

      {state.status === "ready" && (
        <>
          <section className="result" aria-live="polite">
            {state.current ? (
              <p className="topic">{state.current.title}</p>
            ) : (
              <p className="placeholder">ボタンを押して話題を引こう</p>
            )}
          </section>
          <button type="button" onClick={spin} disabled={candidates.length === 0}>
            {state.current ? "もう一回" : "ガチャを回す"}
          </button>
          {state.topics.length === 0 && <p className="note">話題がまだ登録されていません</p>}
          {state.topics.length > 0 && candidates.length === 0 && (
            <p className="note">この条件の話題はまだありません</p>
          )}

          <section className="filter">
            <h2 className="filter-label">シチュエーション</h2>
            <div className="chips">
              {SITUATIONS.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="chip"
                  aria-pressed={situation === value}
                  onClick={() => toggleSituation(value)}
                >
                  {situationLabel(value)}
                </button>
              ))}
            </div>
          </section>

          <section className="filter">
            <h2 className="filter-label">大学</h2>
            <div className="chips">
              {UNIVERSITIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  className="chip"
                  aria-pressed={university === value}
                  onClick={() => toggleUniversity(value)}
                >
                  {universityLabel(value)}
                </button>
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
