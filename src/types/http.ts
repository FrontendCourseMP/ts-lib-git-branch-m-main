export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH";

export type HttpClientOptions = {
  baseUrl?: string;
  retries?: number;
  defaultHeaders?: HeadersInit;
  /** Логировать запросы, ответы и ошибки в консоль (F12). */
  log?: boolean;
};

export type HttpRequestInit = Omit<RequestInit, "method"> & {
  retries?: number;
  log?: boolean;
};

export type HttpClient = {
  get: <T>(path: string, init?: HttpRequestInit) => Promise<T>;
  post: <T>(path: string, body?: unknown, init?: HttpRequestInit) => Promise<T>;
  put: <T>(path: string, body?: unknown, init?: HttpRequestInit) => Promise<T>;
  patch: <T>(path: string, body?: unknown, init?: HttpRequestInit) => Promise<T>;
};
