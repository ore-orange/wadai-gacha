import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Status = "checking" | "ok" | "error";

export function App() {
  const [status, setStatus] = useState<Status>("checking");
  const [message, setMessage] = useState("");

  // Supabase に接続できるか確認するだけの最小実装。
  // 実装が進んだらこのファイルは自由に書き換えて OK。
  useEffect(() => {
    supabase
      .from("topics")
      .select("id", { count: "exact", head: true })
      .then(({ error, count }) => {
        if (error) {
          setStatus("error");
          setMessage(error.message);
        } else {
          setStatus("ok");
          setMessage(`topics テーブルに ${count ?? 0} 件`);
        }
      });
  }, []);

  return (
    <main>
      <h1>話題ガチャ（仮）</h1>
      <p>
        Supabase 接続: <strong>{status}</strong>
        {message && <span> — {message}</span>}
      </p>
    </main>
  );
}
