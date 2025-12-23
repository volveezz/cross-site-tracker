# User Tracker

Определяет, посещал ли пользователь заготовленный ленд перед переходом на игру.

## Методы

### 1. Iframe

Ленд загружает скрытый iframe и пишет в его localStorage через postMessage.

```ts
// Ленд
const iframe = document.createElement('iframe');
iframe.src = GAME_URL + '/ping';
iframe.style.display = 'none';
document.body.appendChild(iframe);

iframe.onload = () => {
  iframe.contentWindow.postMessage({ type: 'set_flag' }, '*');
};
```

```ts
// /ping с игры
window.addEventListener('message', (e) => {
  if (e.data.type === 'set_flag') {
    localStorage.setItem('test2_iframe', new Date().toISOString());
  }
});
```

### 2. window.name

Ленд записывает в window.name и редиректит на игру.

```ts
// Ленд
window.name = 'visited_landing_' + Date.now();
window.location.href = GAME_URL + '?via=windowname';
```

```ts
// Игра
if (window.name.startsWith('visited_landing')) {
  localStorage.setItem('test3_windowname', new Date().toISOString());
  window.name = '';
}
```

### 3. Popup

Ленд открывает попап игры и отправляет postMessage.

```ts
// Ленд
const popup = window.open(GAME_URL + '/receiver', 'game', 'width=600,height=400');
popup.postMessage({ type: 'set_flag' }, '*');
```

```ts
// /receiver игры
window.addEventListener('message', (e) => {
  if (e.data.type === 'set_flag') {
    localStorage.setItem('test4_popup', new Date().toISOString());
  }
});
```

### 4. Storage Access API

Игра в iframe запрашивает доступ к своему localStorage после клика пользователя.

```ts
// Игра (в iframe на ленде)
button.onclick = async () => {
  await document.requestStorageAccess();
  const flag = localStorage.getItem('test2_iframe');
};
```

## Запуск

```bash
bun install

# Ленд
bun run dev:a

# Игра
bun run dev:x
```

## Переменные окружения

```
SITE_A_URL=http://localhost:3000
SITE_X_URL=http://localhost:3001
```

## Storage ключи

| Метод | Ключ |
|-------|------|
| Iframe | `test2_iframe` |
| window.name | `test3_windowname` |
| Popup | `test4_popup` |
