import { useState } from "react";
import { startGoogleLink } from "../api/auth";

export default function GoogleLink() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await startGoogleLink(password);
      setPassword("");
      window.location.assign(data.startUrl);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Google-fiók összekapcsolása</h2>

      <p>
        Válaszd azt a Google-fiókot, amelynek e-mail-címe megegyezik a helyi
        fiókod e-mail-címével.
      </p>

      <label>
        Jelenlegi jelszó
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </label>

      {error && <p role="alert">{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Átirányítás…" : "Google-fiók összekapcsolása"}
      </button>
    </form>
  );
}
