import "./style.css";
import { createHttpClient, HttpError } from "./httpClient";

const form = document.querySelector("#check-form");
const countInput = document.querySelector("#repeat-count");
const methodSelect = document.querySelector("#http-method");
const logCheckbox = document.querySelector("#log-enabled");
const alertBox = document.querySelector("#form-alert");
const resultsOut = document.querySelector("#results-out");

if (
  !form ||
  !(form instanceof HTMLFormElement) ||
  !countInput ||
  !(countInput instanceof HTMLInputElement) ||
  !methodSelect ||
  !(methodSelect instanceof HTMLSelectElement) ||
  !logCheckbox ||
  !(logCheckbox instanceof HTMLInputElement) ||
  !alertBox ||
  !resultsOut
) {
  throw new Error("Нет нужных элементов в разметке");
}

const alertEl = alertBox;
const outEl = resultsOut;

type ResultRow =
  | { ok: true; index: number; status: number; preview: string }
  | { ok: false; index: number; error: string; httpStatus?: number; body?: string };

function setAlert(text: string, isError: boolean): void {
  alertEl.textContent = text;
  alertEl.classList.toggle("form__message--error", isError);
  alertEl.classList.toggle("form__message--ok", !isError && text.length > 0);
}

form.addEventListener("submit", async (ev) => {
  ev.preventDefault();
  setAlert("", false);
  outEl.textContent = "";

  if (!countInput.checkValidity()) {
    setAlert("Укажите число от 1 до 30.", true);
    return;
  }

  const n = Number.parseInt(countInput.value, 10);
  if (Number.isNaN(n) || n < 1 || n > 30) {
    setAlert("Укажите число от 1 до 30.", true);
    return;
  }

  const method = methodSelect.value;
  const http = createHttpClient({
    baseUrl: "https://jsonplaceholder.typicode.com",
    retries: 1,
    log: logCheckbox.checked,
    defaultHeaders: { Accept: "application/json" },
  });

  const results: ResultRow[] = [];

  for (let i = 0; i < n; i++) {
    try {
      let res: Response;
      if (method === "GET") {
        res = await http.get("/posts/1");
      } else if (method === "POST") {
        res = await http.post("/posts", { title: "demo", body: "demo", userId: 1 });
      } else if (method === "PUT") {
        res = await http.put("/posts/1", { id: 1, userId: 1, title: "demo", body: "demo" });
      } else if (method === "PATCH") {
        res = await http.patch("/posts/1", { title: "demo-patch" });
      } else {
        throw new Error(`Неизвестный метод: ${method}`);
      }

      const preview = (await res.clone().text()).slice(0, 400);
      results.push({ ok: true, index: i + 1, status: res.status, preview });
    } catch (e) {
      if (e instanceof HttpError) {
        results.push({
          ok: false,
          index: i + 1,
          error: "HttpError",
          httpStatus: e.status,
          body: e.body.slice(0, 300),
        });
      } else {
        results.push({ ok: false, index: i + 1, error: String(e) });
      }
    }
  }

  outEl.textContent = JSON.stringify(results, null, 2);
  setAlert(`Готово: ${n} вызовов ${method}.`, false);
});
