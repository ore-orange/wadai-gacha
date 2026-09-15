import { useEffect, useState } from "react";
import { fetchTopics, pickRandomTopic, type Topic } from "@/lib/topics";

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; topics: Topic[]; current: Topic | null };

export function App() {
  const [state, setState] = useState<State>({ status: "loading" });

  useEffect(() => {
    fetchTopics()
      .then((topics) => setState({ status: "ready", topics, current: null }))
      .catch((e: unknown) =>
        setState({ status: "error", message: e instanceof Error ? e.message : String(e) }),
      );
  }, []);

  const spin = () => {
    if (state.status !== "ready") return;
    setState({ ...state, current: pickRandomTopic(state.topics, state.current?.id) });
  };

  return (
    <main>
      <h1>話題ガチャ（仮）</h1>

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
          <button type="button" onClick={spin} disabled={state.topics.length === 0}>
            {state.current ? "もう一回" : "ガチャを回す"}
          </button>
          {state.topics.length === 0 && <p className="note">話題がまだ登録されていません</p>}
        </>
      )}
    </main>
  );
}
