import { useEffect, useState } from "react";
import "./auth-card.css";

export default function AuthCard({
  children,
  theme,
  onThemeChange,
  storageKey = "auth-ui-theme",
  variant = "entry",
}) {
  const [savedTheme, setSavedTheme] = useState(() => {
    try {
      const value = localStorage.getItem(storageKey);
      return ["light", "dark", "system"].includes(value) ? value : "system";
    } catch {
      return "system";
    }
  });
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  const preference = theme ?? savedTheme;
  const resolvedTheme = preference === "system"
    ? (systemDark ? "dark" : "light")
    : preference;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = (event) => setSystemDark(event.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  function changeTheme(value) {
    if (theme === undefined) {
      setSavedTheme(value);
      try { localStorage.setItem(storageKey, value); } catch { /* Storage may be unavailable. */ }
    }
    onThemeChange?.(value);
  }

  return (
    <section
      className={`auth-widget auth-widget--${variant}`}
      data-theme={resolvedTheme}
      aria-label={variant === "account" ? "Fiókbeállítások" : "Fiókhozzáférés"}
    >
      <header className="auth-widget__toolbar">
        <span className="auth-widget__brand">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="5" y="10" width="14" height="11" rx="3" stroke="currentColor" strokeWidth="1.7" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" stroke="currentColor" strokeWidth="1.7" />
            <circle cx="12" cy="15" r="1.5" fill="currentColor" />
          </svg>
          {variant === "account" ? "Fiókbeállítások" : "Saját fiók"}
        </span>
        <label className="auth-widget__theme">
          <span>Téma</span>
          <select value={preference} onChange={(event) => changeTheme(event.target.value)}>
            <option value="system">Rendszer</option>
            <option value="light">Világos</option>
            <option value="dark">Sötét</option>
          </select>
        </label>
      </header>
      <div className="auth-widget__content">{children}</div>
    </section>
  );
}

