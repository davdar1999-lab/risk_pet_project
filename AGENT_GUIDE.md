# Bloom Vibe — Agent Guide

## 1) Назначение проекта
Bloom Vibe — frontend-only прототип цветочного e-commerce сайта на **React + Vite**.

Цель: быстро демонстрировать UX-сценарии выбора букета, корзины, промокодов и mock-checkout.

## 2) Текущий стек
- **Runtime/UI:** React 18
- **Bundler/dev-server:** Vite
- **Язык:** JavaScript (JSX)
- **Стили:** один глобальный файл `src/styles.css`
- **Хранение состояния корзины:** `localStorage`

## 3) Структура проекта
```text
.
├─ index.html
├─ package.json
├─ public/
│  ├─ images/               # SVG-ассеты/фолбэки
│  └─ photos/               # локальные фото букетов для карточек
└─ src/
   ├─ main.jsx              # точка входа React
   ├─ App.jsx               # основная бизнес-логика + UI
   └─ styles.css            # все стили приложения
```

## 4) Архитектура приложения
Проект реализован как **single-page app** с одним корневым компонентом `App`.

### 4.1 Слои внутри `src/App.jsx`
1. **Domain constants**
   - `bouquets` — каталог букетов (цены, бейджи, изображения, fallback).
   - `addons` — доп. товары (ваза, шоколад и т.п.).
   - `sizeMultiplier` — коэффициенты цены по размерам.

2. **State management (React hooks)**
   - Фильтры: `city`, `date`, `occasion`, `maxPrice`.
   - Корзина: `cart` (инициализация из `localStorage`).
   - Промокоды: `promoCode`, `appliedPromo`.
   - Checkout UI: `isPaymentOpen`, `deliveryType`, `isPaid`.

3. **Computed model**
   - `filtered` — отфильтрованный каталог.
   - `enriched` — корзина с вычисленными `lineTotal` и изображениями.
   - `subtotal`, `deliveryCost`, `total`.

4. **UI handlers / commands**
   - `addToCart`, `updateItem`, `toggleAddon`, `applyPromo`, `openPayment`, `handlePay`.

5. **Side effects**
   - Сохранение корзины в `localStorage`.
   - Синхронизация фильтров в URL query params.
   - Аналитические события через `track(...)` (console-based stub).

### 4.2 Поток данных
`user action -> state update -> recompute derived values -> rerender UI`

## 5) Бизнес-правила
- Мастер-промокод: `PIRAT` делает заказ бесплатным (итог `0`).
- Размеры букета меняют цену по `sizeMultiplier`.
- Доставка влияет на стоимость (`delivery` vs `pickup`).
- Корзина переживает перезапуск вкладки (через `localStorage`).

## 6) Запуск и проверка
```bash
npm install
npm run dev
```

Production-preview:
```bash
npm run build
npm run preview
```

## 7) Рекомендации для агентов
1. **Не ломать единую модель данных**
   - При добавлении новых полей в `bouquets`/`cart` обновлять `enriched` и места рендера.

2. **Сохранять UX-инварианты**
   - Корзина должна оставаться рабочей без backend.
   - Промокод `PIRAT` не удалять без явной задачи.

3. **Изображения**
   - Предпочтительно хранить в `public/photos` и ссылаться локально.
   - Для удалённых источников всегда оставлять fallback.

4. **Стили**
   - Сейчас CSS монолитный; при росте проекта лучше разнести на секции/модули.

5. **Безопасные изменения**
   - После правок проверять базовые сценарии:
     - фильтрация каталога,
     - добавление в корзину,
     - применение промокода,
     - открытие/submit checkout modal.

## 8) Направления следующего рефакторинга
- Выделить `Catalog`, `Cart`, `CheckoutModal` в отдельные компоненты.
- Перейти на TypeScript для строгих моделей.
- Добавить unit-тесты вычислений (итоги, скидки, доставка).
- Добавить роутинг для разделов (главная, каталог, checkout, success).
