import { useState } from "react";
import { clearSession, loadSession, type Session, saveSession } from "@/lib/session";
import { Home } from "@/screens/Home";
import { Room } from "@/screens/Room";

export function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());

  const enter = (s: Session) => {
    saveSession(s);
    setSession(s);
  };
  const leave = () => {
    clearSession();
    setSession(null);
  };

  return (
    <main>
      <h1>T.S.Revolution</h1>
      {session ? <Room session={session} onLeave={leave} /> : <Home onEnter={enter} />}
    </main>
  );
}
