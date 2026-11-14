// One door to the API. A refusal is never an answer: any non-2xx rejects with the server's own
// sentence, its status and its parsed body, so a caller that prints `error.message` prints the
// remedy (the default panel learned this in #181).

const TOKEN_KEY = "beeverforge_token";

const tokenCookie = () =>
  location.protocol === "https:" ? "__Host-beeverforge_token" : "beeverforge_token";

/** One credential cookie or none: two (a sibling host planted one) is treated as none. */
function cookieToken(): string {
  const name = tokenCookie();
  const all = document.cookie
    .split(";")
    .map((c) => c.trim())
    .filter((c) => c.startsWith(`${name}=`));
  return all.length === 1 ? decodeURIComponent(all[0]!.slice(name.length + 1)) : "";
}

export function token(): string {
  return cookieToken() || localStorage.getItem(TOKEN_KEY) || "";
}

export function setToken(value: string) {
  localStorage.setItem(TOKEN_KEY, value);
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${tokenCookie()}=${encodeURIComponent(value)}; path=/; SameSite=Strict; max-age=2592000${secure}`;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
  document.cookie = `${tokenCookie()}=; path=/; max-age=0`;
}

/** A browser nobody identified still gets its own product conversation, keyed by this cookie. */
export function ensureVisitor() {
  if (/(?:^|;\s*)beeverforge_visitor=/.test(document.cookie)) return;
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const id = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  document.cookie = `beeverforge_visitor=${id}; path=/; SameSite=Lax; max-age=31536000`;
}

export class Refusal extends Error {
  readonly status: number;
  readonly body: unknown;
  constructor(status: number, body: unknown) {
    const said =
      body && typeof body === "object"
        ? ((body as { detail?: unknown; message?: unknown }).detail ??
          (body as { message?: unknown }).message)
        : "";
    super(typeof said === "string" && said ? said : `the API answered ${status}`);
    this.name = "Refusal";
    this.status = status;
    this.body = body;
  }
}

export class Unreachable extends Error {
  constructor(cause: unknown) {
    super("the panel could not reach its API — check that the deployment is running");
    this.name = "Unreachable";
    this.cause = cause;
  }
}

type AuthListener = (event: { kind: "needs-token" } | { kind: "login"; url: string } | { kind: "forbidden" }) => void;
const authListeners = new Set<AuthListener>();
export const onAuth = (fn: AuthListener) => {
  authListeners.add(fn);
  return () => authListeners.delete(fn);
};

export function authHeaders(): Record<string, string> {
  const t = token();
  return t ? { authorization: `Bearer ${t}` } : {};
}

/** A path segment, encoded: project names and refs reach the server exactly as written. */
export const seg = (value: string | number) => encodeURIComponent(String(value));

export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      ...init,
      headers: { accept: "application/json", ...authHeaders(), ...(init.headers ?? {}) },
    });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new Unreachable(e);
  }
  const text = await res.text();
  let body: unknown = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (res.status === 401) {
    const login = (body as { login?: string } | null)?.login;
    for (const fn of authListeners) fn(login ? { kind: "login", url: login } : { kind: "needs-token" });
  }
  if (res.status === 403) for (const fn of authListeners) fn({ kind: "forbidden" });
  if (!res.ok) throw new Refusal(res.status, body);
  return body as T;
}

export const get = <T>(path: string, signal?: AbortSignal) => request<T>(path, { signal });

export const post = <T>(path: string, body?: unknown) =>
  request<T>(path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
