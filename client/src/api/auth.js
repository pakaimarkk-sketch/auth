const AUTH_URL = "/api/auth";

async function getCsrfToken() {
  const response = await fetch(`${AUTH_URL}/csrf-token`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Nem sikerült lekérni a biztonsági tokent.");
  }

  const data = await response.json();

  return data.token;
}

async function postAuth(path, body) {
  const token = await getCsrfToken();

  const response = await fetch(`${AUTH_URL}${path}`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": token,
    },
    body: JSON.stringify(body ?? {}),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "A kérés sikertelen.");
  }

  return data;
}

export async function getAuthConfig() {
  const response = await fetch(`${AUTH_URL}/config`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Nem sikerült lekérni a belépési beállításokat.");
  }

  return response.json();
}

export function signUp(username, password, email) {
  return postAuth("/sign-up", { username, password, email });
}

export function requestEmailVerification() {
  return postAuth("/request-email-verification");
}

export function verifyEmail(token) {
  return postAuth("/verify-email", { token });
}

export function changePassword(currentPassword, newPassword) {
  return postAuth("/change-password", {
    currentPassword,
    newPassword,
  });
}

export function forgotPassword(email) {
  return postAuth("/forgot-password", { email });
}

export function resetPassword(token, newPassword) {
  return postAuth("/reset-password", {
    token,
    newPassword,
  });
}

export function logIn(identifier, password) {
  return postAuth("/log-in", { identifier, password });
}

export function logOut() {
  return postAuth("/log-out");
}

export async function getCurrentUser() {
  const response = await fetch(`${AUTH_URL}/me`, {
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error("Nem sikerült ellenőrizni a bejelentkezést.");
  }

  return response.json();
}

export async function getSessions() {
  const response = await fetch(`${AUTH_URL}/sessions`, {
    credentials: "include",
    cache: "no-store",
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || "Nem sikerült lekérni a sessionöket.");
  }

  return data.sessions;
}

export function revokeSession(id) {
  return postAuth("/sessions/revoke", { id });
}

export function revokeOtherSessions() {
  return postAuth("/sessions/revoke-others");
}

export function startGoogleLink(password) {
  return postAuth("/google/link", { password });
}

export function startGoogleDeleteCheck() {
  return postAuth("/account/delete/google");
}

export function startFacebookLink(password) {
  return postAuth("/facebook/link", { password });
}

export function startFacebookDeleteCheck() {
  return postAuth("/account/delete/facebook");
}

export function deleteAccount(password, confirmation) {
  return postAuth("/account/delete", {
    password,
    confirmation,
  });
}
