export type sum = (a: number, b: number) => number;

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH";

export type HttpClientOptions = {
  baseUrl?: string;
  retries?: number;
  defaultHeaders?: HeadersInit;
};
