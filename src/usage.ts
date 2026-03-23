import { createHttpClient, HttpError } from "./lib/index.ts";

const demo = "https://jsonplaceholder.typicode.com";

export async function exampleGet() {
  const api = createHttpClient({ baseUrl: demo });
  return api.get<{ id: number }>("/posts/1");
}

export async function examplePost() {
  const api = createHttpClient({ baseUrl: demo });
  return api.post<{ id: number }>("/posts", {
    title: "t",
    body: "b",
    userId: 1,
  });
}

export async function exampleCatch404() {
  const api = createHttpClient({ baseUrl: demo });
  try {
    await api.get("/posts/999999999");
  } catch (e) {
    if (e instanceof HttpError) {
      return e.status;
    }
    throw e;
  }
}
