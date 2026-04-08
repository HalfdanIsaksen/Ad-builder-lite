export const API_URL = import.meta.env.VITE_API_URL as string;

async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    credentials: "include",
  });

  if (!res.ok) {
    let message = `Request failed: ${res.status}`;

    try {
      const data = await res.json();
      message = data?.error || message;
    } catch {
      const text = await res.text().catch(() => "");
      if (text) message = text;
    }

    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** ---- Auth ---- */
export type User = {
  id: string;
  username: string;
  email?: string;
};

export async function me() {
  return apiFetch<{ user: User | null }>("/auth/me", { method: "GET" });
}

export async function login(usernameOrEmail: string, password: string) {
  return apiFetch<{ id: string; username: string }>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ usernameOrEmail, password }),
  });
}

export async function register(username: string, email: string, password: string) {
  return apiFetch<{ id: string; username: string }>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, email, password }),
  });
}

export async function logout() {
  return apiFetch<{ ok: true }>("/auth/logout", { method: "POST" });
}

/** ---- Templates ---- */
export type TemplateRow = {
  id: string;
  name: string;
  json: any;
  updatedAt: string;
};

export async function listTemplates() {
  return apiFetch<TemplateRow[]>("/templates", { method: "GET" });
}

export async function saveTemplate(name: string, json: any) {
  return apiFetch<TemplateRow>("/templates", {
    method: "POST",
    body: JSON.stringify({ name, json }),
  });
}

export async function getTemplate(id: string) {
  return apiFetch<TemplateRow>(`/templates/${id}`, { method: "GET" });
}

/** ---- Projects ---- */
export type ProjectRow = {
  id: string;
  name: string;
  json: any;
  updatedAt: string;
};

export async function listProjects() {
  return apiFetch<ProjectRow[]>("/projects", { method: "GET" });
}

export async function saveProject(name: string, json: any) {
  return apiFetch<ProjectRow>("/projects", {
    method: "POST",
    body: JSON.stringify({ name, json }),
  });
}

export async function getProject(id: string) {
  return apiFetch<ProjectRow>(`/projects/${id}`, { method: "GET" });
}