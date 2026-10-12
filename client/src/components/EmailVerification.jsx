import { useState } from "react";
import { requestEmailVerification, verifyEmail } from "../api/auth";

export default function EmailVerification({ token, user }) {
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleClick() {
    setError("");
    setMessage("");
    setLoading(true);

    try {
      const data = token
        ? await verifyEmail(token)
        : await requestEmailVerification();

      setMessage(data.message);

      if (token) {
        setDone(true);
        window.history.replaceState(
          null,
          "",
          window.location.pathname + window.location.search,
        );
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!token && (!user?.email || user.emailVerified)) {
    return null;
  }

  return (
    <section>
      {!token && <p>E-mail-címed még nincs megerősítve.</p>}

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}

      {!done && (
        <button type="button" onClick={handleClick} disabled={loading}>
          {loading
            ? "Folyamatban…"
            : token
              ? "E-mail-cím megerősítése"
              : "Megerősítési link kérése"}
        </button>
      )}

      {done && (
        <button type="button" onClick={() => window.location.reload()}>
          Vissza az alkalmazáshoz
        </button>
      )}
    </section>
  );
}
