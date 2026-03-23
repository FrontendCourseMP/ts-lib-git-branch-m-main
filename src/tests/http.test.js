import { afterEach, expect, test, vi } from "vitest";
import { createHttpClient, HttpError } from "../lib/index.ts";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("GET: JSON при 200", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      new Response(JSON.stringify({ x: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  );
  const data = await createHttpClient().get("/api");
  expect(data).toEqual({ x: 1 });
});

test("404 → HttpError", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response("x", { status: 404, statusText: "Not Found" })),
  );
  await expect(createHttpClient().get("/a")).rejects.toMatchObject({
    name: "HttpError",
    status: 404,
  });
});

test("400 → HttpError", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response('{"e":1}', { status: 400, statusText: "Bad Request" })),
  );
  try {
    await createHttpClient().get("/b");
    expect.fail();
  } catch (e) {
    expect(e).toBeInstanceOf(HttpError);
    expect(e.status).toBe(400);
  }
});

test("500 без retry", async () => {
  const mockFetch = vi.fn(async () => new Response("", { status: 500 }));
  vi.stubGlobal("fetch", mockFetch);
  await expect(createHttpClient({ retries: 3 }).get("/c")).rejects.toThrow(HttpError);
  expect(mockFetch).toHaveBeenCalledTimes(1);
});

test("retry при падении fetch", async () => {
  const mockFetch = vi
    .fn()
    .mockRejectedValueOnce(new Error("net"))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  vi.stubGlobal("fetch", mockFetch);
  const data = await createHttpClient({ retries: 1 }).get("/d");
  expect(data).toEqual({ ok: true });
  expect(mockFetch).toHaveBeenCalledTimes(2);
});

test("POST шлёт JSON", async () => {
  const mockFetch = vi.fn(async () =>
    new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", mockFetch);
  await createHttpClient().post("/p", { a: 1 });
  expect(mockFetch.mock.calls[0][1].method).toBe("POST");
  expect(mockFetch.mock.calls[0][1].body).toBe(JSON.stringify({ a: 1 }));
});

test("PUT / PATCH метод", async () => {
  const mockFetch = vi.fn(async () =>
    new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }),
  );
  vi.stubGlobal("fetch", mockFetch);
  await createHttpClient().put("/u", {});
  expect(mockFetch.mock.calls[0][1].method).toBe("PUT");
  mockFetch.mockClear();
  await createHttpClient().patch("/u", {});
  expect(mockFetch.mock.calls[0][1].method).toBe("PATCH");
});

test("baseUrl + путь", async () => {
  const mockFetch = vi.fn(async () =>
    new Response("{}", { status: 200, headers: { "Content-Type": "application/json" } }),
  );
  vi.stubGlobal("fetch", mockFetch);
  await createHttpClient({ baseUrl: "https://api.test" }).get("/v1/x");
  expect(mockFetch.mock.calls[0][0]).toBe("https://api.test/v1/x");
});

test("204 → undefined", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status: 204 })));
  const x = await createHttpClient().get("/z");
  expect(x).toBeUndefined();
});

test("несколько GET подряд (как счётчик на странице)", async () => {
  let n = 0;
  const mockFetch = vi.fn(async () => {
    n += 1;
    return new Response(JSON.stringify({ call: n }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", mockFetch);
  const api = createHttpClient();
  const times = 3;
  const results = [];
  for (let i = 0; i < times; i++) {
    results.push(await api.get("/same"));
  }
  expect(mockFetch).toHaveBeenCalledTimes(3);
  expect(results).toEqual([{ call: 1 }, { call: 2 }, { call: 3 }]);
});

test("несколько POST подряд", async () => {
  const mockFetch = vi.fn(async () =>
    new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", mockFetch);
  const api = createHttpClient();
  const results = [];
  for (let i = 0; i < 2; i++) {
    results.push(await api.post("/items", { n: i }));
  }
  expect(mockFetch).toHaveBeenCalledTimes(2);
  expect(results).toEqual([{ ok: true }, { ok: true }]);
});

test("retries в опциях запроса перекрывает клиент", async () => {
  const mockFetch = vi
    .fn()
    .mockRejectedValueOnce(new Error("a"))
    .mockRejectedValueOnce(new Error("b"))
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
  vi.stubGlobal("fetch", mockFetch);
  const api = createHttpClient({ retries: 0 });
  const data = await api.get("/x", { retries: 2 });
  expect(data).toEqual({ ok: true });
  expect(mockFetch).toHaveBeenCalledTimes(3);
});

test("defaultHeaders попадают в fetch", async () => {
  const mockFetch = vi.fn(async () =>
    new Response("{}", {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", mockFetch);
  await createHttpClient({
    defaultHeaders: { "X-App": "demo", Accept: "application/json" },
  }).get("/q");
  const headers = new Headers(mockFetch.mock.calls[0][1].headers);
  expect(headers.get("X-App")).toBe("demo");
  expect(headers.get("Accept")).toBe("application/json");
});
