import { createContext, useContext, useEffect, useState } from "react";
import {
  getCurrentUser,
  logIn as requestLogIn,
  logOut as requestLogOut,
  getAuthConfig,
} from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [sessionError, setSessionError] = useState("");
  const [providers, setProviders] = useState({
    google: false,
    facebook: false,
  });

  useEffect(() => {
    let ignore = false;

    async function checkSession() {
      try {
        const [currentUser, config] = await Promise.all([
          getCurrentUser(),
          getAuthConfig(),
        ]);

        if (!ignore) {
          setUser(currentUser);
          setProviders(config.providers);
        }
      } catch (error) {
        if (!ignore) {
          setSessionError(error.message);
        }
      } finally {
        if (!ignore) {
          setCheckingSession(false);
        }
      }
    }

    checkSession();

    return () => {
      ignore = true;
    };
  }, []);

  async function logIn(identifier, password) {
    const data = await requestLogIn(identifier, password);
    setUser(data.user);
  }

  async function logOut() {
    await requestLogOut();
    setUser(null);
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        checkingSession,
        sessionError,
        logIn,
        logOut,
        providers,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("A useAuth csak AuthProvideren belül használható.");
  }

  return context;
}
