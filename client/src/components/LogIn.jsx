import { useState } from "react";
import { useAuth } from "../auth/AuthContext";

export default function LogIn() {
  const { logIn } = useAuth();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      await logIn(identifier, password);
      setPassword("");
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Bejelentkezés</h1>

      <label htmlFor="login-identifier">Felhasználónév vagy e-mail-cím</label>

      <input
        id="login-identifier"
        type="text"
        autoComplete="username"
        value={identifier}
        onChange={(event) => setIdentifier(event.target.value)}
        maxLength={254}
        required
      />

      <label htmlFor="login-password">Jelszó</label>
      <input
        id="login-password"
        type="password"
        autoComplete="current-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        required
      />

      {error && <p role="alert">{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Bejelentkezés…" : "Bejelentkezés"}
      </button>
      <a href="/api/auth/google">Belépés Google-lel</a>
    </form>
  );
}
