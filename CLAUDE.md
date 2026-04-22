# Project Notes

## Stack
- Backend: Django + Django REST Framework. Single app at [api/app/](api/app/) containing all entities (`Item`, `Employee`, …). Router-registered ViewSets (full CRUD incl. PATCH) in [api/app/urls.py](api/app/urls.py). New entities go in this app — don't create per-entity Django apps.
- Frontend: React + TypeScript + Vite in [web/](web/). Entry [web/src/main.tsx](web/src/main.tsx), app [web/src/App.tsx](web/src/App.tsx), API client [web/src/api.ts](web/src/api.ts).
- API proxy: frontend calls `/api/items/`.

## UI Conventions
- Layout uses CSS flexbox (no CSS framework). Top nav bar + left side menu + scrollable main area, all inline styles in [web/src/App.tsx](web/src/App.tsx).
- Icons via Font Awesome 6 CDN (loaded in [web/index.html](web/index.html)), used as `<i className="fa-solid fa-..." />`.
- Shared button style objects at the bottom of [web/src/App.tsx](web/src/App.tsx): `primaryBtnStyle` (blue), `secondaryBtnStyle` (gray), `dangerBtnStyle` (red), plus `menuItemStyle`, `sideLinkStyle`, `iconStyle`.
- Auth is simulated in local state (`user` string, Sign In / Logout in header dropdown) — no real auth wired up yet.

## API Client Pattern
- `listItems`, `createItem`, `updateItem` (PATCH), `deleteItem` in [web/src/api.ts](web/src/api.ts). Keep new endpoints in this file and throw on non-ok responses.
