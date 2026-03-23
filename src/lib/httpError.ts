import type { HttpErrorInfo } from "../types/httpError.ts";

export class HttpError extends Error {
  status: number;
  statusText: string;
  url: string;
  body?: string;

  constructor(message: string, info: HttpErrorInfo) {
    super(message);
    this.name = "HttpError";
    this.status = info.status;
    this.statusText = info.statusText;
    this.url = info.url;
    this.body = info.body;
  }
}
