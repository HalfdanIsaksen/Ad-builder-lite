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
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }

  // Some endpoints might return 204
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

/** ---- Auth ---- */
export type User = { id: string; email: string };

export async function me() {
  return apiFetch<User | null>("/auth/me", { method: "GET" });
}

export async function login(email: string, password: string) {
  return apiFetch<User>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email: string, password: string) {
  return apiFetch<User>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function logout() {
  return apiFetch<void>("/auth/logout", { method: "POST" });
}

/** ---- Templates ---- */
export type TemplateRow = {
  id: string;
  name: string;
  json: any; // your canvas/template schema
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
  json: any; // full project state schema
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
