/**
 * fetchWithAuth.ts
 *
 * A secure native-fetch wrapper that:
 *  1. Reads the JWT from localStorage ("access_token")
 *  2. Injects it as an Authorization: Bearer <token> header
 *  3. On 401 Unauthorized — clears the token and redirects to /auth
 */

const TOKEN_KEY = "access_token";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type FetchOptions = RequestInit & {
  /** Skip the automatic base-URL prefix (e.g. for absolute URLs) */
  absoluteUrl?: boolean;
};

export async function fetchWithAuth(
  endpoint: string,
  options: FetchOptions = {}
): Promise<Response> {
  const { absoluteUrl = false, ...fetchOptions } = options;

  // Build URL
  const url = absoluteUrl ? endpoint : `${API_BASE}${endpoint}`;

  // Attach token if present
  const token =
    typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  const headers = new Headers(fetchOptions.headers ?? {});
  if (!headers.has("Content-Type") && !(fetchOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(url, { ...fetchOptions, headers });

  // Handle 401 — token expired or invalid
  if (response.status === 401 && typeof window !== "undefined") {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem("access_token_user");
    window.location.href = "/auth";
    // Return the response so callers can inspect it if needed before redirect
    return response;
  }

  return response;
}

// ---------------------------------------------------------------------------
// Convenience helpers (mirrors the axios api.ts pattern)
// ---------------------------------------------------------------------------

export const authGet = (endpoint: string, options?: FetchOptions) =>
  fetchWithAuth(endpoint, { method: "GET", ...options });

export const authPost = <T>(endpoint: string, body: T, options?: FetchOptions) =>
  fetchWithAuth(endpoint, {
    method: "POST",
    body: JSON.stringify(body),
    ...options,
  });

export const authPatch = <T>(endpoint: string, body: T, options?: FetchOptions) =>
  fetchWithAuth(endpoint, {
    method: "PATCH",
    body: JSON.stringify(body),
    ...options,
  });

export const authDelete = (endpoint: string, options?: FetchOptions) =>
  fetchWithAuth(endpoint, { method: "DELETE", ...options });
