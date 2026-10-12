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

export function signUp(username, password) {
  return postAuth("/sign-up", { username, password });
}

export function logIn(username, password) {
  return postAuth("/log-in", { username, password });
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
