# Local RAG Project

## Overview
Angular 21 приложение с локальным RAG (Retrieval-Augmented Generation) на базе @huggingface/transformers.

## Tech Stack
- Angular 21 (standalone components, signals)
- @huggingface/transformers для ML
- Vitest для тестирования
- TypeScript 5.9

## Commands
```bash
npm start      # Запуск dev-сервера на http://localhost:4200
npm run build  # Сборка в dist/
npm test       # Запуск тестов (Vitest)
ng generate component <name>  # Создание компонента
```

## Project Structure
```
src/
├── app/
│   ├── app.ts          # Root component
│   ├── app.config.ts   # App configuration
│   ├── app.routes.ts   # Routing
│   └── app.html/css    # Template and styles
├── main.ts             # Bootstrap
└── index.html          # Entry HTML
```

## Code Style
- Используй standalone components (без NgModules)
- Используй signals вместо BehaviorSubject для состояния
- Используй новый control flow (@if, @for) вместо *ngIf, *ngFor
- Одинарные кавычки для строк
- Максимальная ширина строки: 100 символов

## Conventions
- Компоненты: `kebab-case.ts` (например: `user-profile.ts`)
- Сервисы: `*.service.ts`
- Тесты рядом с файлами: `*.spec.ts`
