# AGENTS.md

Правила и контекст для AI-ассистентов при работе с этим проектом.

## Стек технологий

- **Фреймворк**: Next.js 16 (App Router), React 19
- **Язык**: TypeScript (строгий режим)
- **Валидация данных**: Zod (схемы в `lib/validate.ts`)
- **Форматирование и линтинг**: Biome (вместо ESLint и Prettier)
- **Оптимизация**: React Compiler (автоматическое мемоизирование)
- **Стили**: Tailwind CSS 4 (`cn()` на базе `clsx` + `tailwind-merge`)
- **Рантайм/тесты**: Bun
- **Структура**: без директории `src/`; файлы на верхнем уровне

## Команды

```bash
bun dev                 # dev-сервер http://localhost:3000
bun run build           # production-сборка
bun run lint            # biome check
bun run format          # biome format --write
bun test                # unit + component (игнорирует e2e/**)
bun run test:watch      # тесты в watch-режиме
bun run test:e2e        # Playwright e2e
bun run typecheck:test  # tsc -p tsconfig.test.json --noEmit
```

## Структура проекта

```
app/                    # App Router: страницы, layout, error/not-found
  schedules/            # /schedules, /schedules/new, /schedules/[id]
  employees/            # /employees, /employees/[id]
components/
  ui/                   # примитивы UI
  forms/                # формы создания/редактирования
  schedule/             # редактор графика
  providers/            # Schedules, EmployeeLists, Toast
  layout/               # AppHeader, PageHeader
lib/
  types.ts              # доменные типы
  storage.ts            # localStorage CRUD
  validate.ts           # Zod-схемы + type guards
  generator.ts          # автогенерация ячеек
  balance*.ts           # балансировка часов
  coverage*.ts          # покрытие смен
  duty.ts               # дежурства 24ч
  schedule-update.ts    # операции над графиком
  schedule-quality.ts   # анализ качества
  schedule-dnd.ts       # правила DnD
  schedule-shift-drag.ts
  export/               # excel, pdf, print, backup
  hooks/                # публичные хуки
  holidays/ru.ts        # производственный календарь РФ
  seed/                 # встроенные списки сотрудников
test/                   # setup.ts (happy-dom), render.tsx
e2e/                    # Playwright-спеки
```

API-маршрутов (`app/api/`) нет — приложение полностью клиентское.

## Доменная модель

Типы в `lib/types.ts`:

- **Schedule** — месячный график: метаданные, `employees[]`, `coverage`, `cells`, `sickDays?`, `sourceListId?`
- **ScheduleEmployee** — сотрудник в графике: `shiftType`, `vacations`, `dutyPreferences?`, `monthPlan?`
- **EmployeeList** / **EmployeeListMember** — переиспользуемый шаблон состава
- **ShiftType** — `"day" | "night" | "aux"`
- **Cell** — `cells[employeeId][day]` = часы (`SHIFT_HOURS`: 7.8 / 6.8 / 16.2 / 17.2 / 24) или `null`; locked через `monthPlan`

## Данные и состояние

- Ключи localStorage: `grafik_schedules`, `grafik_employee_lists` (`lib/storage.ts`)
- Валидация на границе (чтение storage / JSON-импорт) — Zod-схемы и булевы guards в `lib/validate.ts`
- Провайдеры: `components/providers/ClientProviders.tsx`
- Cross-tab sync: `use-storage-sync`
- Seed-списки: `ensureDefaultEmployeeLists()` (`lib/seed/`)

## Хуки (публичный API)

| Хук | Назначение |
|-----|------------|
| `useSchedules()` | все графики |
| `useSchedule(id)` | один график |
| `useScheduleEditor(id)` | редактор + regenerate |
| `useScheduleEmployeesEditor()` | модалка состава/покрытия |
| `useScheduleShiftDrag()` | drag-and-drop смен |
| `useEmployeeLists()` | списки сотрудников |
| `useToast()` | toast-уведомления (`ToastProvider`) |

## Доменная логика (`lib/`) — где искать

- Генерация: `generator.ts`
- Баланс: `balance.ts`, `balance-pools.ts`, `balance-spacing.ts`, `balance-transfer.ts`
- Покрытие: `coverage.ts`, `coverage-aux.ts`, `coverage-guard.ts`, `coverage-trim.ts`
- Дежурства: `duty.ts`
- DnD: `schedule-dnd.ts`, `schedule-shift-drag.ts`
- Операции: `schedule-update.ts`
- Качество: `schedule-quality.ts`

## Экспорт

`lib/export/`:

- Excel — `exceljs` (`exportScheduleToExcel`)
- PDF — `html2canvas-pro` + `jspdf`
- Print — `window.print()`
- JSON backup — `downloadBackup` / `importAllData`

Вызовы: `components/schedule/ScheduleToolbar.tsx` (Excel/PDF/Print), `app/schedules/page.tsx` (backup).

## Календарь РФ

`lib/holidays/ru.ts` — праздники 2025–2028. Вне диапазона учитываются только суббота/воскресенье. Предпраздничный день сокращает дневную смену на 1 час (7.8 → 6.8). Обновлять ежегодно.

## Конвенции кода

### Next.js и App Router
- По умолчанию — Server Components.
- `'use client'` только при хуках, DOM-событиях или браузерных API.
- Используй `layout.tsx`, `loading.tsx`, `error.tsx`, `not-found.tsx`.

### React Compiler
- Чистый идиоматичный React.
- Не добавляй вручную `useMemo` / `useCallback` / `React.memo`, кроме интеграции со сторонними библиотеками.

### TypeScript
- Строгая типизация, без `any`.
- `interface` для пропсов; `type` для объединений/утилит.

### Tailwind CSS
- Утилитарные классы в `className`.
- Условные классы — через `cn()` из `lib/utils.ts`.
- Отдельного `tailwind.config` нет — Tailwind 4 через `app/globals.css` + PostCSS.

### Biome
- Код валиден для `biome check --write`.
- Не предлагай ESLint/Prettier.

### Тесты
- Co-located: `*.test.ts` / `*.test.tsx` рядом с исходником.
- E2E: `e2e/*.spec.ts` (Playwright).
- Preload: `test/setup.ts` (happy-dom, mock localStorage).
- Component render: `test/render.tsx` (`TestProviders`).

## Поведение AI-ассистента

1. **Язык**: отвечай и пиши комментарии на русском.
2. **Стиль**: будь краток, без лишних объяснений.
3. **Изменения**: минимально возможные диффы.
4. **Контекст**: нет папки `src/` — импорты вида `@/components/Button`, не `@/src/...`.
