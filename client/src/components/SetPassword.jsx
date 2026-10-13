import { useState } from "react";
import { forgotPassword } from "../api/auth";

export default function SetPassword({ user }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleRequest() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const data = await forgotPassword(user.email);
      setMessage(data.message);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section>
      <h2>Helyi jelszó beállítása</h2>

      <p>
        Jelenleg Google-lel lépsz be. Helyi jelszó beállítása után
        felhasználónévvel és jelszóval is beléphetsz.
      </p>

      <p>A beállítási linket ehhez a címhez kérjük: {user.email}</p>

      {!user.emailVerified && <p>Előbb erősítsd meg az e-mail-címedet.</p>}

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}

      <button
        type="button"
        disabled={loading || !user.email || !user.emailVerified}
        onClick={handleRequest}
      >
        {loading ? "Folyamatban…" : "Jelszóbeállítási link kérése"}
      </button>
    </section>
  );
}
