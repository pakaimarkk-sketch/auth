import { useEffect, useState } from "react";
import { getSessions, revokeSession, revokeOtherSessions } from "../api/auth";

export default function SessionList() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    async function load() {
      try {
        const rows = await getSessions();

        if (!ignore) setSessions(rows);
      } catch (error) {
        if (!ignore) setError(error.message);
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    load();

    return () => {
      ignore = true;
    };
  }, []);

  async function runAction(action) {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const data = await action();
      setMessage(data.message);
      setSessions(await getSessions());
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>Aktív bejelentkezések</h2>

      {loading && <p>Betöltés…</p>}
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}

      <ul>
        {sessions.map((session) => (
          <li key={session.id}>
            <p>
              {session.current
                ? "Jelenlegi bejelentkezés"
                : "Másik bejelentkezés"}
            </p>

            <p>{session.browser}</p>

            <p>
              Belépés:{" "}
              {session.loggedInAt
                ? new Date(session.loggedInAt).toLocaleString("hu-HU")
                : "Ismeretlen"}
            </p>

            <p>
              Lejárat: {new Date(session.expiresAt).toLocaleString("hu-HU")}
            </p>

            {!session.current && (
              <button
                type="button"
                disabled={loading}
                onClick={() => runAction(() => revokeSession(session.id))}
              >
                Session megszüntetése
              </button>
            )}
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={loading}
        onClick={() => runAction(revokeOtherSessions)}
      >
        Kijelentkezés minden más sessionből
      </button>
    </section>
  );
}
