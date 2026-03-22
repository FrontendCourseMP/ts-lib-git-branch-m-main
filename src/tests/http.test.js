import { afterEach, expect, test, vi } from "vitest";
import { createHttpClient, HttpError } from "../counter";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("GET отдаёт JSON при 200", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ x: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );

  const client = createHttpClient();
  const data = await client.get("/api");

  expect(data).toEqual({ x: 1 });
});

test("404 — это HttpError", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("нет", { status: 404, statusText: "Not Found" })),
  );

  const client = createHttpClient();

  await expect(client.get("/missing")).rejects.toThrow(HttpError);
});

test("если сеть упала — пробуем ещё раз", async () => {
  const mockFetch = vi
    .fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );

  vi.stubGlobal("fetch", mockFetch);

  const client = createHttpClient({ retries: 1 });
  const data = await client.get("/slow");

  expect(data).toEqual({ ok: true });
  expect(mockFetch).toHaveBeenCalledTimes(2);
});

test("500 не ретраим", async () => {
  const mockFetch = vi.fn(async () => new Response("", { status: 500, statusText: "oops" }));

  vi.stubGlobal("fetch", mockFetch);

  const client = createHttpClient({ retries: 3 });

  await expect(client.get("/bad")).rejects.toThrow(HttpError);
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
