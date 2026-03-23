/* eslint-disable no-console -- вывод только при HttpClientOptions.log / HttpRequestInit.log */
import { HttpError } from "./httpError.ts";
import type {
  HttpClient,
  HttpClientOptions,
  HttpMethod,
  HttpRequestInit,
} from "../types/http.ts";

function joinUrl(base: string | undefined, path: string): string {
  if (base === undefined || base === "") {
    return path;
  }
  const b = base.endsWith("/") ? base.slice(0, -1) : base;
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${b}${p}`;
}

/** Обёртка над `fetch`: `.get` / `.post` / `.put` / `.patch`, `retries` при сбое сети, 4xx/5xx → `HttpError`. */
export function createHttpClient(options: HttpClientOptions = {}): HttpClient {
  const baseUrl = options.baseUrl;
  const defaultRetries = options.retries ?? 0;
  const defaultHeaders = options.defaultHeaders;
  const defaultLog = options.log ?? false;

  async function doRequest<T>(
    method: HttpMethod,
    path: string,
    bodyArg: unknown,
    init: HttpRequestInit = {},
  ): Promise<T> {
    const {
      retries,
      log: logOverride,
      body: initBody,
      headers: initHeaders,
      ...restInit
    } = init;
    const retriesForThisCall = retries ?? defaultRetries;
    const maxTries = 1 + Math.max(0, retriesForThisCall);
    const shouldLog = logOverride !== undefined ? logOverride : defaultLog;

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
        if (shouldLog) {
          console.log("[http]", `${method} ${url}`, {
            attempt: `${i + 1}/${maxTries}`,
          });
        }

        const res = await fetch(url, {
          ...restInit,
          method,
          headers,
          body: bodyToSend,
        });

        if (!res.ok) {
          const txt = await res.text();
          if (shouldLog) {
            console.error("[http]", `HTTP ${res.status} ${res.statusText}`, {
              url: res.url,
              bodyPreview: txt === "" ? "(empty)" : txt.slice(0, 400),
            });
          }
          throw new HttpError(`HTTP ${res.status}`, {
            status: res.status,
            statusText: res.statusText,
            url: res.url,
            body: txt === "" ? undefined : txt,
          });
        }

        if (shouldLog) {
          console.log("[http]", "ok", {
            method,
            status: res.status,
            url: res.url,
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
        if (shouldLog) {
          console.error("[http]", "сеть / fetch", {
            method,
            url,
            attempt: `${i + 1}/${maxTries}`,
            error: e instanceof Error ? e.message : e,
          });
        }
        if (i === maxTries - 1) {
          throw e;
        }
        if (shouldLog) {
          console.log("[http]", "повтор…", { next: i + 2 });
        }
      }
    }

    throw new Error("unreachable");
  }

  return {
    get: <T,>(path: string, init?: HttpRequestInit) =>
      doRequest<T>("GET", path, undefined, init),
    post: <T,>(path: string, body?: unknown, init?: HttpRequestInit) =>
      doRequest<T>("POST", path, body, init),
    put: <T,>(path: string, body?: unknown, init?: HttpRequestInit) =>
      doRequest<T>("PUT", path, body, init),
    patch: <T,>(path: string, body?: unknown, init?: HttpRequestInit) =>
      doRequest<T>("PATCH", path, body, init),
  };
}
