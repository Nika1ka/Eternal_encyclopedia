# Game Encyclopedia

Интерактивная энциклопедия и конструктор сборок героя: «Герои», «Экипировка», «Таро» и «Противники». React + TypeScript + Vite; игровые данные и изображения локальные, сборки сохраняются в localStorage браузера.

## Запуск

Проверенная среда — Node.js 24.22.1. В PowerShell:

```powershell
npm.cmd ci
npm.cmd run dev
```

Откройте адрес из вывода Vite. Маршруты: `#/heroes`, `#/equipment`, `#/upgrades`, `#/enemies`. В других оболочках вместо `npm.cmd` используйте `npm`.

## Проверки

```powershell
npm.cmd run lint
npm.cmd test
npm.cmd run test:render
npm.cmd run build
npm.cmd run preview
```

`test` проверяет игровую логику и ссылки на ресурсы; `test:render` — серверный рендер компонентов. Это не замена проверке интерфейса в браузере. Сборка лежит в `dist/`.

## Документация

- [Архитектура, данные, функции, механики и CSS](PROJECT_DOCUMENTATION.md)
- [Результаты аудита, изменения и известные ограничения](CODE_REVIEW_REPORT.md)
- [Правила работы Codex и дальнейшей разработки](AGENTS.md)
- Дополнительные заметки: [герои](HEROES_IMPLEMENTATION.md), [экипировка](EQUIPMENT_IMPLEMENTATION.md), [Таро](ARCANA_IMPLEMENTATION.md), [противники](ENEMIES_IMPLEMENTATION.md).

Уникальные Арканы пока представлены описательными эффектами; их условные механики не симулируются. `Achievements.json` — неподключённая пустая заготовка. Игровые данные, формулы и графические ресурсы нельзя менять под видом рефакторинга.
