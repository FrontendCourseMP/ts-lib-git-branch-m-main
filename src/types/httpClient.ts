/** Опции запроса как у fetch, без method — его выставляет клиент */
export type HttpRequestInit = Omit<RequestInit, "method">;

/** Настройки {@link createHttpClient} */
export type HttpClientOptions = {
  baseUrl?: string;
  /** Число дополнительных попыток при падении fetch (сеть). 4xx/5xx не повторяются */
  retries?: number;
  defaultHeaders?: Record<string, string>;
  /** Писать запросы, ответы и ошибки в консоль браузера */
  log?: boolean;
};

/** Объект, который возвращает createHttpClient */
export type HttpClientApi = {
  get(path: string, init?: HttpRequestInit): Promise<Response>;
  post(path: string, body?: Record<string, unknown>, init?: HttpRequestInit): Promise<Response>;
  put(path: string, body?: Record<string, unknown>, init?: HttpRequestInit): Promise<Response>;
  patch(path: string, body?: Record<string, unknown>, init?: HttpRequestInit): Promise<Response>;
};
