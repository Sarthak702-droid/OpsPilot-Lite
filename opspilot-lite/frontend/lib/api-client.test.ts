import { afterEach, expect, test, vi } from "vitest";
import { api, ApiError } from "./api-client";
afterEach(() => vi.unstubAllGlobals());
test("sends the session token to the Go API", async () => { const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) }); vi.stubGlobal("fetch", fetchMock); await api("/api/signals", "clerk-session"); expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/signals"), expect.objectContaining({ headers: expect.objectContaining({ Authorization: "Bearer clerk-session" }), cache: "no-store" })); });
test("surfaces backend error status and message", async () => { vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 409, statusText: "Conflict", json: async () => ({ error: { code: "STALE_ACTION", message: "Inventory changed" } }) })); await expect(api("/api/actions", "token")).rejects.toMatchObject({ status: 409, message: "Inventory changed" }); });
