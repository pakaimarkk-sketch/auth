import { useState } from "react";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import LogIn from "./components/LogIn";
import SignUp from "./components/SignUp";

function AuthScreen() {
  const { user, checkingSession, sessionError, logOut } = useAuth();

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

  if (user) {
    return (
      <div>
        <p>Bejelentkezve: {user.username}</p>

        {logoutError && <p role="alert">{logoutError}</p>}

        <button type="button" onClick={handleLogOut} disabled={loggingOut}>
          {loggingOut ? "Kijelentkezés…" : "Kijelentkezés"}
        </button>
      </div>
    );
  }

  return (
    <main>
      {notice && <p role="status">{notice}</p>}

      {screen === "login" ? (
        <LogIn />
      ) : (
        <SignUp onSuccess={handleSignUpSuccess} />
      )}

      <button type="button" onClick={switchScreen}>
        {screen === "login"
          ? "Nincs fiókod? Regisztráció"
          : "Van már fiókod? Bejelentkezés"}
      </button>
    </main>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthScreen />
    </AuthProvider>
  );
}
