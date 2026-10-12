import { useState } from "react";
import { signUp } from "../api/auth";

export default function SignUp({ onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("A két jelszó nem egyezik.");
      return;
    }

    setLoading(true);

    try {
      await signUp(username, password);
    } catch (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit}>
      <h1>Regisztráció</h1>

      <label htmlFor="signup-username">Felhasználónév</label>
      <input
        id="signup-username"
        autoComplete="username"
        value={username}
        onChange={(event) => setUsername(event.target.value)}
        minLength={3}
        maxLength={50}
        required
      />

      <label htmlFor="signup-password">Jelszó</label>
      <input
        id="signup-password"
        type="password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        minLength={12}
        required
      />

      <label htmlFor="signup-confirm-password">Jelszó megerősítése</label>
      <input
        id="signup-confirm-password"
        type="password"
        autoComplete="new-password"
        value={confirmPassword}
        onChange={(event) => setConfirmPassword(event.target.value)}
        minLength={12}
        required
      />

      {error && <p role="alert">{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Regisztráció…" : "Regisztráció"}
      </button>
    </form>
  );
}
