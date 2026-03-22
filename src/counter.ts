import type { HttpClientOptions, HttpMethod, sum as SumFn } from "./types/types";

export const sum: SumFn = (a, b) => a + b;

/** Ошибка, когда сервер ответил кодом 4xx или 5xx */
export class HttpError extends Error {
  status: number;
  statusText: string;
  url: string;
  body?: string;

  constructor(
    message: string,
    info: { status: number; statusText: string; url: string; body?: string },
  ) {
    super(message);
    this.name = "HttpError";
    this.status = info.status;
    this.statusText = info.statusText;
    this.url = info.url;
    this.body = info.body;
  }
}

type ExtraRequestOptions = RequestInit & { retries?: number };

function joinUrl(base: string | undefined, path: string): string {
  if (base === undefined || base === "") {
    return path;
  }
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

/** Создаёт объект с методами .get / .post / .put / .patch */
export function createHttpClient(options: HttpClientOptions = {}) {
  const baseUrl = options.baseUrl;
  const defaultRetries = options.retries ?? 0;
  const defaultHeaders = options.defaultHeaders;

  async function doRequest<T>(
    method: HttpMethod,
    path: string,
    bodyArg: unknown,
    init: ExtraRequestOptions = {},
  ): Promise<T> {
    const { retries, body: initBody, headers: initHeaders, ...restInit } = init;
    const retriesForThisCall = retries ?? defaultRetries;
    const maxTries = 1 + Math.max(0, retriesForThisCall);

    let bodyToSend: BodyInit | undefined;
    let needJsonHeader = false;

    if (bodyArg !== undefined) {
      if (
        typeof bodyArg === "string" ||
        bodyArg instanceof Blob ||
        bodyArg instanceof FormData
      ) {
        bodyToSend = bodyArg;
      } else {
        bodyToSend = JSON.stringify(bodyArg);
        needJsonHeader = true;
      }
    } else if (initBody !== undefined && initBody !== null) {
      bodyToSend = initBody;
    }

    const headers = new Headers(defaultHeaders);
    if (initHeaders) {
      new Headers(initHeaders).forEach((v, k) => {
        headers.set(k, v);
      });
    }
    if (needJsonHeader && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    const url = joinUrl(baseUrl, path);

    for (let i = 0; i < maxTries; i++) {
      try {
        const res = await fetch(url, {
          ...restInit,
          method,
          headers,
          body: bodyToSend,
        });

        if (!res.ok) {
          const txt = await res.text();
          throw new HttpError(`Ошибка ${res.status}`, {
            status: res.status,
            statusText: res.statusText,
            url: res.url,
            body: txt === "" ? undefined : txt,
          });
        }

        if (res.status === 204) {
          return undefined as T;
        }

        const ct = res.headers.get("content-type");
        if (ct && ct.includes("application/json")) {
          return (await res.json()) as T;
        }

        const text = await res.text();
        return (text === "" ? undefined : text) as T;
      } catch (e) {
        if (e instanceof HttpError) {
          throw e;
        }
        if (i === maxTries - 1) {
          throw e;
        }
      }
    }

    throw new Error("не должно сюда попасть");
  }

  return {
    get: <T>(path: string, init?: ExtraRequestOptions) =>
      doRequest<T>("GET", path, undefined, init),

    post: <T>(path: string, body?: unknown, init?: ExtraRequestOptions) =>
      doRequest<T>("POST", path, body, init),

    put: <T>(path: string, body?: unknown, init?: ExtraRequestOptions) =>
      doRequest<T>("PUT", path, body, init),

    patch: <T>(path: string, body?: unknown, init?: ExtraRequestOptions) =>
      doRequest<T>("PATCH", path, body, init),
  };
}
