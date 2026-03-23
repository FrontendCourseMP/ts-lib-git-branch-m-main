import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHttpClient, HttpError } from "./httpClient";

describe("createHttpClient", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("get: склеивает baseUrl, при 200 возвращает Response", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));
    const http = createHttpClient({ baseUrl: "https://a.com" });
    const res = await http.get("/x");
    expect(res.ok).toBe(true);
    expect(fetch).toHaveBeenCalledWith("https://a.com/x", expect.objectContaining({ method: "GET" }));
  });

  it("при !response.ok выбрасывается HttpError (4xx и 5xx)", async () => {
    const http = createHttpClient();

    vi.mocked(fetch).mockResolvedValue(new Response("a", { status: 404 }));
    await expect(http.get("https://b.com")).rejects.toMatchObject({ name: "HttpError", status: 404 });

    vi.mocked(fetch).mockResolvedValue(new Response("b", { status: 500 }));
    await expect(http.get("https://b.com")).rejects.toMatchObject({ name: "HttpError", status: 500 });
  });

  it("retries только при падении fetch; при HttpError без повторов", async () => {
    let calls = 0;
    vi.mocked(fetch).mockImplementation(() => {
      calls += 1;
      if (calls < 2) {
        return Promise.reject(new Error("net"));
      }
      return Promise.resolve(new Response("ok", { status: 200 }));
    });
    await createHttpClient({ retries: 1 }).get("https://c.com/");
    expect(calls).toBe(2);

    vi.mocked(fetch).mockReset();
    vi.mocked(fetch).mockResolvedValue(new Response("x", { status: 502 }));
    await expect(createHttpClient({ retries: 3 }).get("https://c.com/")).rejects.toBeInstanceOf(HttpError);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("post, put, patch задают метод и JSON-тело", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));
    const http = createHttpClient({ baseUrl: "https://a.com" });

    await http.post("/p", { x: 1 });
    expect(vi.mocked(fetch).mock.calls[0][1]).toMatchObject({ method: "POST", body: '{"x":1}' });

    await http.put("/p", { x: 2 });
    expect(vi.mocked(fetch).mock.calls[1][1]).toMatchObject({ method: "PUT", body: '{"x":2}' });

    await http.patch("/p", { x: 3 });
    expect(vi.mocked(fetch).mock.calls[2][1]).toMatchObject({ method: "PATCH", body: '{"x":3}' });
  });

  it("log: true пишет в console.log", async () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    vi.mocked(fetch).mockResolvedValue(new Response("{}", { status: 200 }));

    await createHttpClient({ log: true }).get("https://z.com/");

    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("defaultHeaders попадают в fetch", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("", { status: 200 }));
    await createHttpClient({ defaultHeaders: { "X-Test": "1" } }).get("https://z.com/");
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    expect(new Headers(init.headers).get("X-Test")).toBe("1");
  });
});
