import { useState } from "react";
import { changePassword, forgotPassword, resetPassword } from "../api/auth";

export default function PasswordForm({ mode, token }) {
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const isForgot = mode === "forgot";

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!isForgot && newPassword !== confirmation) {
      setError("A két új jelszó nem egyezik.");
      return;
    }

    setLoading(true);

    try {
      let data;

      if (isForgot) {
        data = await forgotPassword(email);
      } else if (mode === "change") {
        data = await changePassword(currentPassword, newPassword);
      } else {
        data = await resetPassword(token, newPassword);
      }

      setMessage(data.message);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmation("");

      if (!isForgot) {
        setDone(true);

        if (mode === "reset") {
          window.history.replaceState(
            null,
            "",
            window.location.pathname + window.location.search,
          );
        }
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <section>
        <p role="status">{message}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Vissza a belépéshez
        </button>
      </section>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>
        {isForgot
          ? "Elfelejtett jelszó"
          : mode === "change"
            ? "Jelszóváltoztatás"
            : "Új jelszó megadása"}
      </h2>

      {isForgot ? (
        <label>
          E-mail-cím
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            maxLength={254}
            required
          />
        </label>
      ) : (
        <>
          {mode === "change" && (
            <label>
              Jelenlegi jelszó
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </label>
          )}

          <label>
            Új jelszó
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={12}
              required
            />
          </label>

          <label>
            Új jelszó megerősítése
            <input
              type="password"
              autoComplete="new-password"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              minLength={12}
              required
            />
          </label>
        </>
      )}

      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Folyamatban…" : isForgot ? "Link kérése" : "Mentés"}
      </button>
    </form>
  );
}
