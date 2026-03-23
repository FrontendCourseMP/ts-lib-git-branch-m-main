# HTTP-клиент на TypeScript

Роганов, 241-3210.

Здесь два куска: библиотека поверх `fetch` и простая страница.

## Что сделано по заданию

Клиент создаётся через `createHttpClient({ ... })`, дальше вызываются `.get`, `.post`, `.put`, `.patch`. В опциях можно задать `baseUrl`, сколько раз повторять запрос при падении сети (`retries`), заголовки по умолчанию (`defaultHeaders`) и флаг `log` — тогда в консоли браузера видно, что ушло и что пришло (или где всё упало).

Если сервер ответил с ошибкой (`response.ok === false`, то есть обычно 4xx и 5xx), выдается `HttpError` с текстом тела ответа, если его удалось прочитать. Повторы при этом не делаются — только когда сам `fetch` вернул исключение.

Второй аргумент у `get` и третий у остальных методов (после тела для post/put/patch) — это обычные опции как у `fetch`, только без `method`, его выставляет клиент.

Типы лежат в `src/types` (отдельно от реализации). Тесты на Vitest — в `src/httpClient/httpClient.test.ts`.

## Как запустить
```bash
npm install
npm run dev
```
## Как пользоваться из кода

```ts
import { createHttpClient, HttpError } from "./httpClient";

const http = createHttpClient({
  baseUrl: "https://jsonplaceholder.typicode.com",
  retries: 1,
  defaultHeaders: { Accept: "application/json" },
  log: true,
});

const res = await http.get("/posts/1");
const data = await res.json();
```

Ошибка от сервера:

```ts
try {
  await http.get("/posts/101");
} catch (e) {
  if (e instanceof HttpError) {
    // e.status, e.body
  }
}
```

## Страница с формой

В `index.html` и `src/main.ts` — форма: сколько раз подряд отправить один и тот же запрос, какой метод (GET/POST/PUT/PATCH), включить ли лог. После нажатия «Выполнить» внизу в `<pre>` показывается массив результатов в JSON — по каждому вызову либо успех с куском ответа, либо что поймали в `catch`.

Стили в `src/style.css`.

## Тесты

Проверяется в основном: склейка URL, что при 404/500 идет `HttpError`, что при обрыве сети запрос повторяется, а при ответе с ошибкой — нет, что post/put/patch шлют JSON, что `log` вызывает `console.log`, что `defaultHeaders` доходят до `fetch`.

## Папки

- `src/httpClient/` — сам клиент и тесты
- `src/types/` — типы опций и методов
- `src/main.ts`, `src/style.css`, `index.html` — демо-страница

Импорт типов, если надо: `import type { ... } from "./types"`.
