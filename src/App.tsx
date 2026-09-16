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

  // 読み込み完了と同時に 1 件引いて、開いた瞬間から話題が出ている状態にする
  useEffect(() => {
    fetchTopics()
      .then((topics) => setState({ status: "ready", topics, current: pickRandomTopic(topics) }))
      .catch((e: unknown) =>
        setState({ status: "error", message: e instanceof Error ? e.message : String(e) }),
      );
  }, []);

  const filterTopics = (topics: Topic[], s: Situation | null, u: University | null) =>
    topics.filter((t) => (s === null || t.situation === s) && (u === null || t.university === u));

  const topics = state.status === "ready" ? state.topics : [];
  const candidates = filterTopics(topics, situation, university);

  const spin = () => {
    if (state.status !== "ready") return;
    setState({ ...state, current: pickRandomTopic(candidates, state.current?.id) });
  };

  // 絞り込みを変えたら、その条件で改めて 1 件引き直す（同じものをもう一度押したら解除）
  const toggleSituation = (value: Situation) => {
    const next = situation === value ? null : value;
    setSituation(next);
    if (state.status === "ready") {
      setState({
        ...state,
        current: pickRandomTopic(filterTopics(state.topics, next, university)),
      });
    }
  };
  const toggleUniversity = (value: University) => {
    const next = university === value ? null : value;
    setUniversity(next);
    if (state.status === "ready") {
      setState({ ...state, current: pickRandomTopic(filterTopics(state.topics, situation, next)) });
    }
  };

  return (
    <main>
      <h1>T.M.Generation</h1>

      {state.status === "loading" && <p>読み込み中...</p>}

      {state.status === "error" && <p role="alert">話題を取得できませんでした: {state.message}</p>}

      {state.status === "ready" && (
        <>
          <section className="result" aria-live="polite">
            {state.current ? (
              <p className="topic">{state.current.title}</p>
            ) : (
              <p className="placeholder">話題がありません</p>
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
