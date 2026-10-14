import { useState } from "react";
import {
  deleteAccount,
  startGoogleDeleteCheck,
  startFacebookDeleteCheck,
} from "../api/auth";
import { useAuth } from "../auth/AuthContext";

export default function DeleteAccount() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const { user, providers } = useAuth();

  const [googleChecked] = useState(
    () =>
      new URLSearchParams(window.location.search).get("deleteCheck") ===
      "success",
  );

  const [facebookChecked] = useState(
    () =>
      new URLSearchParams(window.location.search).get("facebookDeleteCheck") ===
      "success",
  );

  async function handleGoogleCheck() {
    setError("");
    setLoading(true);

    try {
      const data = await startGoogleDeleteCheck();
      window.location.assign(data.startUrl);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleFacebookCheck() {
    setError("");
    setLoading(true);

    try {
      const data = await startFacebookDeleteCheck();
      window.location.assign(data.startUrl);
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  }

  async function handleDelete(event) {
    event.preventDefault();
    setError("");

    if (!window.confirm("Biztosan végleg törlöd ezt a fiókot?")) {
      return;
    }

    setLoading(true);

    try {
      await deleteAccount(password, confirmation);
      setPassword("");
      setDeleted(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }

  if (deleted) {
    return (
      <section>
        <p role="status">A fiókod törölve lett.</p>

        <button type="button" onClick={() => window.location.assign("/")}>
          Vissza a belépéshez
        </button>
      </section>
    );
  }

  return (
    <section>
      <h2>Fióktörlés</h2>

      <p>
        Ez végleg törli a helyi fiókodat, a kapcsolt belépési módokat és a hozzá
        tartozó hitelesítési tokeneket. Magát a Google- vagy Facebook-fiókodat
        nem törli.
      </p>

      <p>
        Ha van helyi jelszavad, add meg alább. Ha nincs, ellenőrizd a fiókodhoz
        kapcsolt külső belépési módot.
      </p>

      {!user.hasPassword && providers.google && (
        <button type="button" disabled={loading} onClick={handleGoogleCheck}>
          Google-fiók ellenőrzése
        </button>
      )}

      {!user.hasPassword && providers.facebook && (
        <button type="button" disabled={loading} onClick={handleFacebookCheck}>
          Facebook-fiók ellenőrzése
        </button>
      )}

      {googleChecked && (
        <p>
          A Google-ellenőrzés sikeres. A törlési engedély 5 percig érvényes.
        </p>
      )}

      {facebookChecked && (
        <p>
          A Facebook-ellenőrzés sikeres. A törlési engedély 5 percig érvényes.
        </p>
      )}

      <form onSubmit={handleDelete}>
        <label>
          Jelenlegi jelszó, ha van
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        <label>
          Megerősítés: írd be, hogy TÖRLÉS
          <input
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            autoComplete="off"
            required
          />
        </label>

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={loading || confirmation !== "TÖRLÉS"}>
          {loading ? "Törlés…" : "Fiók végleges törlése"}
        </button>
      </form>
    </section>
  );
}
