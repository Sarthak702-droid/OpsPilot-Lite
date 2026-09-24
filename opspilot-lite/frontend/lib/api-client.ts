import { env } from "./env";
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }
export async function api<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${env.apiUrl}${path}`, { ...init, headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...init.headers }, cache: "no-store" });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    let message = response.statusText;
    if (typeof body === "object" && body !== null && "error" in body) {
      const error = body.error;
      if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") message = error.message;
    }
    throw new ApiError(response.status, message);
  }
  return response.json() as Promise<T>;
}
