import type { HttpClientApi, HttpClientOptions, HttpRequestInit } from "../types/httpClient";

/** Ошибка при ответе с !response.ok */
export class HttpError extends Error {
  status: number;
  statusText: string;
  body: string;

  constructor(status: number, statusText: string, body: string) {
    super(`HTTP ${status} ${statusText}`);
    this.name = "HttpError";
    this.status = status;
    this.statusText = statusText;
    this.body = body;
  }
}

function writeLog(enabled: boolean, ...args: unknown[]): void {
  if (!enabled) {
    return;
  }
  // eslint-disable-next-line no-console -- опция log у createHttpClient
  console.log("[http]", ...args);
}

function buildUrl(baseUrl: string, pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const base = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${base}${path}`;
}

function mergeHeaders(defaults: Record<string, string>, init?: HttpRequestInit): Headers {
  const h = new Headers(defaults);
  if (init?.headers !== undefined) {
    new Headers(init.headers).forEach((value, key) => {
      h.set(key, value);
    });
  }
  return h;
}

/** Остальные поля RequestInit без headers (их задаём отдельно после merge) */
function initWithoutHeaders(init: HttpRequestInit = {}): Omit<HttpRequestInit, "headers"> {
  const copy = { ...init };
  delete copy.headers;
  return copy;
}

/**
 * Создаёт клиент с методами get / post / put / patch.
 */
export function createHttpClient(options: HttpClientOptions = {}): HttpClientApi {
  const baseUrl = options.baseUrl ?? "";
  const retries = options.retries ?? 0;
  const defaultHeaders = { ...(options.defaultHeaders ?? {}) };
  const log = options.log ?? false;

  async function exec(url: string, method: string, init: RequestInit): Promise<Response> {
    let lastErr: unknown;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        writeLog(log, "→", method, url, init.body !== undefined ? { body: init.body } : {});

        const response = await fetch(url, init);

        if (!response.ok) {
          let text = "";
          try {
            text = await response.text();
          } catch {
            /* ignore */
          }
          const httpErr = new HttpError(response.status, response.statusText, text);
          writeLog(log, "✗ HTTP", response.status, text.slice(0, 200));
          throw httpErr;
        }

        writeLog(log, "←", response.status, response.statusText);
        return response;
      } catch (err) {
        if (err instanceof HttpError) {
          throw err;
        }
        writeLog(log, "✗ fetch", err);
        lastErr = err;
        if (attempt === retries) {
          break;
        }
      }
    }

    if (lastErr instanceof Error) {
      throw lastErr;
    }
    throw new Error(String(lastErr));
  }

  function run(method: string, pathOrUrl: string, init: HttpRequestInit = {}): Promise<Response> {
    const url = buildUrl(baseUrl, pathOrUrl);
    const headers = mergeHeaders(defaultHeaders, init);
    return exec(url, method, { ...initWithoutHeaders(init), method, headers });
  }

  return {
    get(pathOrUrl: string, init?: HttpRequestInit): Promise<Response> {
      return run("GET", pathOrUrl, init);
    },

    post(pathOrUrl: string, body?: Record<string, unknown>, init?: HttpRequestInit): Promise<Response> {
      const headers = mergeHeaders(defaultHeaders, init);
      let requestBody: BodyInit | undefined;
      if (body !== undefined) {
        headers.set("Content-Type", "application/json");
        requestBody = JSON.stringify(body);
      }
      const url = buildUrl(baseUrl, pathOrUrl);
      return exec(url, "POST", {
        ...initWithoutHeaders(init ?? {}),
        method: "POST",
        headers,
        body: requestBody,
      });
    },

    put(pathOrUrl: string, body?: Record<string, unknown>, init?: HttpRequestInit): Promise<Response> {
      const headers = mergeHeaders(defaultHeaders, init);
      let requestBody: BodyInit | undefined;
      if (body !== undefined) {
        headers.set("Content-Type", "application/json");
        requestBody = JSON.stringify(body);
      }
      const url = buildUrl(baseUrl, pathOrUrl);
      return exec(url, "PUT", {
        ...initWithoutHeaders(init ?? {}),
        method: "PUT",
        headers,
        body: requestBody,
      });
    },

    patch(pathOrUrl: string, body?: Record<string, unknown>, init?: HttpRequestInit): Promise<Response> {
      const headers = mergeHeaders(defaultHeaders, init);
      let requestBody: BodyInit | undefined;
      if (body !== undefined) {
        headers.set("Content-Type", "application/json");
        requestBody = JSON.stringify(body);
      }
      const url = buildUrl(baseUrl, pathOrUrl);
      return exec(url, "PATCH", {
        ...initWithoutHeaders(init ?? {}),
        method: "PATCH",
        headers,
        body: requestBody,
      });
    },
  };
}
