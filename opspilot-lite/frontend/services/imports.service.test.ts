import { afterEach, expect, test, vi } from "vitest";
import { commitPDF } from "./imports.service";

afterEach(() => vi.unstubAllGlobals());

test("quotation review omits the optional counterparty ID", async () => {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ id: "document-1", status: "REVIEWED" }) });
  vi.stubGlobal("fetch", fetchMock);
  const file = new File(["%PDF-test"], "quote.pdf", { type: "application/pdf" });
  await commitPDF("session-token", file, { document_type: "QUOTATION", document_number: "Q-1", document_date: "2026-09-01", due_date: "", counterparty_name: "Supplier", counterparty_id: "", total_amount: "900.00" });
  const body = fetchMock.mock.calls[0][1].body as FormData;
  const review = JSON.parse(body.get("review") as string) as Record<string, unknown>;
  expect(review.counterparty_id).toBeUndefined();
  expect(review.document_number).toBe("Q-1");
});
