# HTTP-клиент на TypeScript

 библиотека поверх **`fetch`** для удобных запросов (лаб работа 3-4).


Библиотека поддерживает:

- точку входа **`createHttpClient(options?)`** и объект с методами **`.get`**, **`.post`**, **`.put`**, **`.patch`**;
- **`retries`** — число **дополнительных** попыток, если **`fetch`** падает (сеть); ответы **4xx/5xx** повторно не запрашиваются;
- **`HttpError`** при любом ответе с **`!response.ok`** (в том числе «400-е» и «500-е» диапазоны);
- **`baseUrl`**, **`defaultHeaders`**, опция **`log`** — вывод запросов/ответов/ошибок в консоль браузера;
- опции запроса как у **`fetch`** (без поля **`method`**, его задаёт клиент);
- публичные **типы** в **`src/types`**, **примеры** в **`src/usage.ts`**, **тесты** на Vitest;
- страницу ручной проверки: **`index.html`** + **`src/main.ts`** (поле **«Сколько раз отправить»** — несколько одинаковых GET/POST/PUT/PATCH подряд, в ответе массив результатов).

## Сверка с заданием

| Требование | Как сделано |
| ---------- | ----------- |
| Повторные запросы | **`retries`** в **`createHttpClient({ retries })`** и при необходимости в **`HttpRequestInit.retries`**. Повтор только если **`fetch`** бросил исключение. **4xx/5xx** не ретраятся. |
| «400-е и 500-е» как ошибки | Любой **4xx** и **5xx** (`!response.ok`) → **`HttpError`**. |
| **`.get` / `.post` / `.put` / `.patch`** | Методы на возвращаемом **`HttpClient`**. |
| Типы | **`src/types/http.ts`**, **`src/types/httpError.ts`**, реэкспорт из **`src/lib/index.ts`**. |
| Документация | README, **JSDoc** у **`createHttpClient`** в **`src/lib/client.ts`**. |
| Примеры | **`src/usage.ts`**. |
| Тесты | **`src/tests/http.test.js`**, **`src/tests/sum.test.js`**. |
| Ручная проверка | **`npm run dev`**, кнопки на странице. |

## Запуск проекта

```bash
npm install
npm run build
npx vitest run
npm run lint
npm run dev
```

- **`npm run dev`** — страница с полями и кнопками; ответ и ошибки — в блок справа. Число **1–50** в поле повторов задаёт, сколько раз подряд выполнить выбранный GET/POST/PUT/PATCH (кнопки 404/400/500 не дублируются).
- **`npm run build`** — проверка TypeScript и сборка Vite.

## Пример использования

```ts
import { createHttpClient, HttpError } from "./lib/index.ts";

const api = createHttpClient({
  baseUrl: "https://jsonplaceholder.typicode.com",
  retries: 1,
  log: true,
  defaultHeaders: { Accept: "application/json" },
});

const user = await api.get<{ id: number; title: string }>("/posts/1");

await api.post("/posts", {
  title: "Заголовок",
  body: "Текст",
  userId: 1,
});

try {
  await api.get("/posts/999999999");
} catch (e) {
  if (e instanceof HttpError) {
    console.log(e.status, e.statusText, e.url, e.body);
  } else {
    throw e;
  }
}
```

Готовые функции с тем же API — в **`src/usage.ts`** (`exampleGet`, `examplePost`, `exampleCatch404`).

## Как устроена проверка

1. **`createHttpClient`** запоминает **`baseUrl`**, **`retries`**, **`defaultHeaders`**.
2. Для запроса собирается URL: **`baseUrl`** + путь (слэши учитываются).
3. Тело: объекты сериализуются в JSON и получают **`Content-Type: application/json`**, если заголовок не задан; строка / **`FormData`** / **`Blob`** уходят как есть.
4. Вызывается **`fetch`**. Если **`!res.ok`** — читается текст тела, выбрасывается **`HttpError`**.
5. Успех: **204** → **`undefined`**; **`application/json`** → **`res.json()`**; иначе текст ответа.
6. Исключение не **`HttpError`**: при наличии **`retries`** делается ещё попытка; иначе или после последней попытки — проброс ошибки.

## Что используется из браузера

| API | Зачем |
| --- | ----- |
| **`fetch`**, **`Response`**, **`Headers`**, **`RequestInit`** | Запросы и заголовки |
| **`URL`** (косвенно) | Склейка **`baseUrl`** и пути в строке |

## Публичные типы (экспорт из `src/lib/index.ts`)

| Тип | Файл | Назначение |
| --- | ---- | ---------- |
| **`HttpMethod`** | `src/types/http.ts` | `"GET" \| "POST" \| "PUT" \| "PATCH"` |
| **`HttpClientOptions`** | `src/types/http.ts` | `baseUrl?`, `retries?`, `defaultHeaders?`, **`log?`** (консоль) |
| **`HttpRequestInit`** | `src/types/http.ts` | Опции как у `fetch` без `method`, плюс **`retries?`**, **`log?`** |
| **`HttpClient`** | `src/types/http.ts` | Объект с **`.get`**, **`.post`**, **`.put`**, **`.patch`** |
| **`HttpErrorInfo`** | `src/types/httpError.ts` | Данные для **`HttpError`** |
| **`sum`** | `src/types/types.ts` | Тип для шаблонной функции **`sum`** в **`src/counter.ts`** |

Класс **`HttpError`**: **`status`**, **`statusText`**, **`url`**, **`body?`**; проверка **`e instanceof HttpError`**.

## Импорт

```ts
import { createHttpClient, HttpError } from "./lib/index.ts";
import type {
  HttpClient,
  HttpClientOptions,
  HttpRequestInit,
  HttpMethod,
  HttpErrorInfo,
} from "./lib/index.ts";
```

## Тесты

Запуск: **`npx vitest run`** или **`npm test`**.

### `src/tests/http.test.js`

| Тест | Проверка |
| ---- | -------- |
| GET: JSON при 200 | Успешный JSON при 200 |
| 404 → HttpError | **`HttpError`**, **`status: 404`** |
| 400 → HttpError | **`e.status === 400`** |
| 500 без retry | Один вызов **`fetch`** при **`retries: 3`** |
| retry при падении fetch | Повтор после ошибки сети |
| POST шлёт JSON | Метод POST, тело JSON |
| PUT / PATCH метод | Методы PUT и PATCH |
| baseUrl + путь | Склейка URL |
| 204 → undefined | Нет тела ответа |
| несколько GET подряд | Три вызова **`.get`** с тем же путём, три ответа в массиве (как счётчик на демо-странице) |
| несколько POST подряд | Два **`.post`**, **`fetch`** вызывается дважды |
| retries в опциях запроса | **`get(..., { retries: 2 })`** перекрывает **`retries: 0`** у клиента при сетевых сбоях |
| defaultHeaders | Заголовки из **`createHttpClient({ defaultHeaders })`** уходят в **`fetch`** |

### `src/tests/sum.test.js`

Проверка **`sum`** из **`src/counter.ts`** (шаблон курса).

## Структура проекта

| Путь | Содержание |
| ---- | ---------- |
| `src/lib/client.ts` | **`createHttpClient`** |
| `src/lib/httpError.ts` | **`HttpError`** |
| `src/lib/index.ts` | Публичный вход |
| `src/types/*.ts` | Типы |
| `src/counter.ts` | **`sum`** |
| `src/usage.ts` | Примеры |
| `src/main.ts`, `index.html` | Ручная проверка |
| `src/style.css` | Стили страницы |

## Заметки

- Кнопки **400** и **500** на странице ходят на **https://httpbin.org** (нужен интернет). Остальное можно проверять через **jsonplaceholder.typicode.com**.
- Сетевая ошибка после всех попыток — не **`HttpError`**, а исходное исключение (например **`Error`**).
