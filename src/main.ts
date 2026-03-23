import "./style.css";
import { createHttpClient, HttpError } from "./lib/index.ts";

function showOut(text: string) {
  const el = document.getElementById("out");
  if (el !== null) {
    el.textContent = text;
  }
}

function jsonPretty(data: unknown): string {
  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

function parseJson(raw: string): unknown | null {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function getRepeatCount(): number {
  const el = document.getElementById("requestCount");
  if (!(el instanceof HTMLInputElement)) {
    return 1;
  }
  const n = parseInt(el.value, 10);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return Math.min(n, 50);
}

function initLab() {
  const root = document.getElementById("http-lab");
  if (root === null) {
    return;
  }

  const onClick = async (e: Event) => {
    const t = e.target;
    if (!(t instanceof HTMLButtonElement)) {
      return;
    }
    const action = t.dataset.action;
    if (action === undefined) {
      return;
    }

    const baseEl = document.getElementById("baseUrl");
    if (!(baseEl instanceof HTMLInputElement)) {
      return;
    }
    const base = baseEl.value.trim();

    const run = async () => {
      if (action === "err400") {
        await createHttpClient({ baseUrl: "https://httpbin.org", log: true }).get(
          "/status/400",
        );
        return;
      }
      if (action === "err500") {
        await createHttpClient({ baseUrl: "https://httpbin.org", log: true }).get(
          "/status/500",
        );
        return;
      }

      if (base === "") {
        showOut("Укажи baseUrl.");
        return;
      }

      const api = createHttpClient({ baseUrl: base, log: true });
      const times = getRepeatCount();

      if (action === "err404") {
        await api.get("/posts/999999999");
        return;
      }

      if (action === "get") {
        const p = document.getElementById("getPath");
        if (!(p instanceof HTMLInputElement)) {
          return;
        }
        const path = p.value.trim() || "/";
        const results: unknown[] = [];
        for (let i = 0; i < times; i++) {
          results.push(await api.get<unknown>(path));
        }
        showOut(jsonPretty(times === 1 ? results[0] : results));
        return;
      }

      if (action === "post") {
        const p = document.getElementById("postPath");
        const ta = document.getElementById("postBody");
        if (!(p instanceof HTMLInputElement) || !(ta instanceof HTMLTextAreaElement)) {
          return;
        }
        const parsed = parseJson(ta.value);
        if (parsed === null) {
          showOut("Неверный JSON");
          return;
        }
        const pathPost = p.value.trim() || "/";
        const results: unknown[] = [];
        for (let i = 0; i < times; i++) {
          results.push(await api.post<unknown>(pathPost, parsed));
        }
        showOut(jsonPretty(times === 1 ? results[0] : results));
        return;
      }

      if (action === "put") {
        const p = document.getElementById("putPath");
        const ta = document.getElementById("putBody");
        if (!(p instanceof HTMLInputElement) || !(ta instanceof HTMLTextAreaElement)) {
          return;
        }
        const parsed = parseJson(ta.value);
        if (parsed === null) {
          showOut("Неверный JSON");
          return;
        }
        const pathPut = p.value.trim() || "/";
        const results: unknown[] = [];
        for (let i = 0; i < times; i++) {
          results.push(await api.put<unknown>(pathPut, parsed));
        }
        showOut(jsonPretty(times === 1 ? results[0] : results));
        return;
      }

      if (action === "patch") {
        const p = document.getElementById("patchPath");
        const ta = document.getElementById("patchBody");
        if (!(p instanceof HTMLInputElement) || !(ta instanceof HTMLTextAreaElement)) {
          return;
        }
        const parsed = parseJson(ta.value);
        if (parsed === null) {
          showOut("Неверный JSON");
          return;
        }
        const pathPatch = p.value.trim() || "/";
        const results: unknown[] = [];
        for (let i = 0; i < times; i++) {
          results.push(await api.patch<unknown>(pathPatch, parsed));
        }
        showOut(jsonPretty(times === 1 ? results[0] : results));
      }
    };

    try {
      await run();
    } catch (err) {
      if (err instanceof HttpError) {
        showOut(
          `HttpError ${err.status} ${err.statusText}\n${err.url}\n\n${err.body ?? ""}`,
        );
      } else if (err instanceof Error) {
        showOut(err.message);
      } else {
        showOut(String(err));
      }
    }
  };

  root.addEventListener("click", onClick);
  if (import.meta.hot) {
    import.meta.hot.dispose(() => {
      root.removeEventListener("click", onClick);
    });
  }
}

initLab();
