import { useState } from "react";
import AuthCard from "./components/AuthCard";
import "./App.css";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import LogIn from "./components/LogIn";
import SignUp from "./components/SignUp";
import EmailVerification from "./components/EmailVerification";
import PasswordForm from "./components/PasswordForm";
import SessionList from "./components/SessionList";
import GoogleLink from "./components/GoogleLink";
import DeleteAccount from "./components/DeleteAccount";
import SetPassword from "./components/SetPassword";
import FacebookLink from "./components/FacebookLink";

function AuthScreen() {
  const { user, checkingSession, sessionError, logOut, providers } = useAuth();

  const [screen, setScreen] = useState("login");
  const [notice, setNotice] = useState("");
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogOut() {
    setLogoutError("");
    setLoggingOut(true);

    try {
      await logOut();
      setScreen("login");
      setNotice("");
    } catch (error) {
      setLogoutError(error.message);
    } finally {
      setLoggingOut(false);
    }
  }

  const [verificationToken] = useState(() => {
    return new URLSearchParams(window.location.hash.slice(1)).get(
      "verify-email",
    );
  });

  const [resetToken] = useState(() =>
    new URLSearchParams(window.location.hash.slice(1)).get("reset-password"),
  );

  const [oauthError] = useState(() => {
    const code = new URLSearchParams(window.location.search).get("authError");

    if (code === "account-link-required") {
      return "Ehhez az e-mail-címhez már tartozik fiók. Jelentkezz be a meglévő módon; a Google-fiók összekapcsolását külön adjuk hozzá.";
    }

    if (code === "google-login-failed") {
      return "A Google-belépés nem sikerült. Próbáld újra.";
    }

    if (code === "facebook-login-failed") {
      return "A Facebook-belépés nem sikerült. Próbáld újra.";
    }

    if (code === "facebook-link-required") {
      return "Ehhez az e-mail-címhez már tartozik fiók. Lépj be a meglévő módon, majd kapcsold hozzá a Facebook-fiókot.";
    }

    if (code === "facebook-email-required") {
      return "A Facebook nem adott vissza használható e-mail-címet. Regisztrálj e-maillel és jelszóval; a Facebook-kapcsolás csak megosztott, egyező címmel használható.";
    }

    return "";
  });

  const [googleLinkResult] = useState(() => {
    const result = new URLSearchParams(window.location.search).get(
      "googleLink",
    );

    if (result === "success") {
      return "A Google-fiók összekapcsolása sikeres.";
    }

    if (result === "failed") {
      return "Az összekapcsolás nem sikerült. Ellenőrizd az e-mail-címet és próbáld újra.";
    }

    return "";
  });

  const [facebookLinkResult] = useState(() => {
    const result = new URLSearchParams(window.location.search).get(
      "facebookLink",
    );

    if (result === "success") {
      return "A Facebook-fiók összekapcsolása sikeres.";
    }

    if (result === "failed") {
      return "A Facebook-összekapcsolás nem sikerült. Ellenőrizd, hogy az e-mail-cím egyezik, és engedélyezted a megosztását.";
    }

    return "";
  });

  function handleSignUpSuccess() {
    setScreen("login");
    setNotice("Sikeres regisztráció! Most jelentkezz be.");
  }

  function switchScreen() {
    setNotice("");
    setScreen((current) => (current === "login" ? "signup" : "login"));
  }

  if (checkingSession) {
    return <p>Bejelentkezés ellenőrzése…</p>;
  }

  if (sessionError) {
    return (
      <div>
        <p role="alert">{sessionError}</p>
        <button type="button" onClick={() => window.location.reload()}>
          Újrapróbálás
        </button>
      </div>
    );
  }

  if (verificationToken) {
    return <EmailVerification token={verificationToken} />;
  }

  if (resetToken) {
    return <PasswordForm mode="reset" token={resetToken} />;
  }

  if (user) {
    return (
      <div>
        <p>Bejelentkezve: {user.username}</p>
        <EmailVerification user={user} />
        {user.hasPassword ? (
          <PasswordForm mode="change" />
        ) : (
          <SetPassword user={user} />
        )}
        <SessionList />

        {logoutError && <p role="alert">{logoutError}</p>}

        <button type="button" onClick={handleLogOut} disabled={loggingOut}>
          {loggingOut ? "Kijelentkezés…" : "Kijelentkezés"}
        </button>

        {googleLinkResult && <p role="status">{googleLinkResult}</p>}

        {facebookLinkResult && <p role="status">{facebookLinkResult}</p>}

        {providers.google && user.hasPassword && <GoogleLink />}

        {providers.facebook && user.hasPassword && user.emailVerified && (
          <FacebookLink />
        )}
        <DeleteAccount />
      </div>
    );
  }

  return (
    <main>
      {oauthError && <p role="alert">{oauthError}</p>}

      {notice && <p role="status">{notice}</p>}

      {screen === "signup" ? (
        <SignUp onSuccess={handleSignUpSuccess} />
      ) : screen === "forgot" ? (
        <PasswordForm mode="forgot" />
      ) : (
        <LogIn />
      )}

      {screen === "login" && (
        <button
          type="button"
          onClick={() => {
            setNotice("");
            setScreen("forgot");
          }}
        >
          Elfelejtettem a jelszavam
        </button>
      )}

      <button type="button" onClick={switchScreen}>
        {screen === "login"
          ? "Nincs fiókod? Regisztráció"
          : "Van már fiókod? Bejelentkezés"}
      </button>
    </main>
  );
}

function AuthDemo() {
  const { user } = useAuth();
  return (
    <div className="auth-demo">
      <AuthCard variant={user ? "account" : "entry"}>
        <AuthScreen />
      </AuthCard>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthDemo />
    </AuthProvider>
  );
}

