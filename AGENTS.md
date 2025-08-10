## Purpose
A compact, high-signal guide for any AI agent to understand, run, and extend this monorepo without human context switching.

## Project at a glance
- **Frontend**: Vite + React 19 + TypeScript, Tailwind + shadcn/ui.
- **Backend**: FastAPI, SQLAlchemy (async) on SQLite.
- **Search**: SQLite FTS5 tables with fuzzy/LIKE fallback.
- **Auth**: Discord OAuth via Authlib; token via itsdangerous `URLSafeTimedSerializer` (not JWT).
- **Infra**: Docker Compose + Nginx SPA hosting/proxy.

## Repo map (high-signal)
- `api/` FastAPI app, settings, models, routes.
  - `api/api.py` app factory, CORS, includes routers, `init_database()` on startup.
  - `api/settings.py` env-driven config (ENVIRONMENT dev/test/prod; OAuth; token; CORS).
  - `api/models/gamedata.py` items/buildings/cargo/recipes + FTS helpers and loaders.
  - `api/models/users.py` users, groups, memberships with roles.
  - `api/models/projects.py` projects, project items, permission helpers.
  - `api/routes/*` HTTP endpoints (auth, items/search, projects, groups, etc.).
  - `api/helpers.py` JSON data loaders require `BITCRAFT_GAMEDATA_DIR`.
- `web/` Vite React app.
  - `web/src/App.tsx` routes + shell; theming.
  - `web/src/lib/*` API base config, services, hooks.
  - `web/src/components/*` shadcn components; auth UI in `UserNav`.
- Root: `docker-compose.yml`, `nginx.conf`, `README.md`, `CLAUDE.md` (source for this file).

## Run locally
- **Backend**: `cd api && make api` (or `uv run uvicorn api:app --reload`).
- **Frontend**: `cd web && make web` (Vite on port 5173 by default).
- **Compose**: `docker-compose up -d` (web at 8003, api at 8002 via Nginx `/api`).

## Environment variables
- **Backend (`api/settings.py`)**:
  - `ENVIRONMENT` (dev/test/prod)
  - `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`
  - `JWT_SECRET_KEY`, `JWT_EXPIRATION_HOURS`
  - `LOGFIRE_TOKEN` (prod)
- **Data loaders (`api/helpers.py`)**:
  - `BITCRAFT_GAMEDATA_DIR` path to BitCraft JSON set (required for seeding/FTS)
- **Frontend**:
  - `VITE_API_BASE_URL` (dev defaults to `http://localhost:8000`; Docker build uses `/api`)

Env templates:
- Copy `api/.env.example` → `api/.env`
- Copy `web/.env.example` → `web/.env.local`

## Data seeding and FTS (mandatory for usable search)
Tables are created on startup, but game-data seeding and FTS creation are not automatic.
- Ensure `BITCRAFT_GAMEDATA_DIR` points to the BitCraft data set.
- Then run one of:
  - Within `api/` env:
    ```bash
    uv run python -c "import asyncio; from models.gamedata import build_everything; asyncio.run(build_everything())"
    ```
  - Or call `init_game_data()` and `create_fts_tables()` once after `init_database()`.
Without this, many endpoints return empty/404 and search relies on fallback logic only.

## API namespaces (implemented)
- **Auth**: `/auth/login`, `/auth/callback`, `/auth/me`, `/auth/logout`.
- **Items/Search**:
  - `/items/search`, `/items/search/all`, `/items/search/best`
  - `/items/search/buildings`, `/items/search/cargo`
  - `/items/random`, `/items/{item_id}`
  - `/items/{item_id}/recipe`, `/items/{item_id}/recipe-tree`, `/items/recipe/{recipe_id}/recipe-tree`
- **Buildings**: `/buildings/{building_id}`, `/buildings/type/{building_type_id}`
- **Cargo**: `/cargo/{cargo_id}`
- **Groups**: list/get/create/delete; membership by Discord ID; co-owner promote/demote
- **Projects**: list/CRUD; add/remove item; update item count

Note: The README mentions `/search/*`, but actual code uses `/items/search/*` (frontend already aligned).

## Frontend integration notes
- Auth flow wired: `auth-service` hits `/auth/*`, token stored in localStorage; `use-auth` context provides user state.
- Search UI calls `/items/search/all` with debounce; advanced search page supports filters/sorting and add-to-project.
- Projects/Groups pages poll via services that inject the Bearer token.
- Base Materials Calculator calls `/items/{id}/recipe-tree` and supports bulk-add to a project.
- Endpoint constants in `web/src/lib/config.ts` are aligned to `/items/search/*`.

## Common agent workflows
- **Add a new backend endpoint**:
  - Create route under `api/routes/` and include in `api/api.py`.
  - Add models/schemas as needed in `api/models/*`.
  - Update/align environment/config if necessary in `api/settings.py`.
- **Expose it on the frontend**:
  - Add method to the relevant service in `web/src/lib/*-service.ts` (respect `VITE_API_BASE_URL`).
  - Create or update hooks in `web/src/lib` and UI in `web/src/*`.
- **Seed/refresh search data**:
  - Ensure `BITCRAFT_GAMEDATA_DIR` and run the seeding command above; rebuild FTS if schemas change.
- **Permissions**:
  - Use helpers in `api/models/projects.py` and `api/models/users.py` to enforce owner/co-owner rules.

## Common tasks (playbooks)
- **Bootstrap dev environment (clean)**:
  - Backend: `cd api && uv sync && make api`
  - Frontend: `cd web && pnpm install && make web`
  - Seed data: run the seeding command in `api/` after ensuring `BITCRAFT_GAMEDATA_DIR`.
- **Align frontend search endpoints**:
  - If search calls fail, check `web/src/lib/config.ts` and ensure endpoints use `/items/search/*` to match backend (`/items/search`, `/items/search/all`, `/items/search/best`, `/items/search/buildings`, `/items/search/cargo`).
- **Add a protected route**:
  - Backend: add route using existing auth dependency from `routes/auth.py` to load current user.
  - Frontend: call via a service that injects Bearer token; use `use-auth` context for login state.
- **Introduce a new search facet (e.g., "npcs")**:
  - Backend: extend schemas in `api/models/gamedata.py`, add FTS for the new table, add `/items/search/npcs` in `api/routes/items.py`.
  - Seeding: extend loaders in `api/helpers.py`; rerun seeding + FTS build.
  - Frontend: add service method and UI surface (dropdown/advanced filters) reusing existing search components.
- **Fix tests scaffolding**:
  - Replace Pydantic `User` usage with ORM `UserOrm` in `api/tests/conftest.py`; consider `ENVIRONMENT=test` and in-memory DB; add real test modules.
- **Dockerized run with seeded data**:
  - `docker-compose up -d` then exec into API container and run the seeding command; Nginx serves web and proxies `/api`.
- **Prepare env files**:
  - Copy `api/.env.example` to `api/.env` and set secrets/paths.
  - Copy `web/.env.example` to `web/.env.local` and set `VITE_API_BASE_URL`.

## Quick commands
- **API**:
  - Run: `cd api && make api`
  - Seed: `cd api && make seed`
  - Tests: `cd api && uv run pytest -vv`
  - Lint: `cd api && make lint`
  - Format: `cd api && make fmt`
- **Web**:
  - Dev: `cd web && make web`
  - Build: `cd web && make build`
  - Lint: `cd web && make lint`
  - Typecheck: `cd web && make typecheck`
- **Compose**: `docker-compose up -d` (web: 8003, api: 8002 via `/api`)

## Smoke tests
- Public API up: `curl -sS "http://localhost:8000/items/random" | jq .`
- Search (requires seeded data):
  - Items: `curl -sS "http://localhost:8000/items/search?query=wood&limit=3" | jq .`
  - All: `curl -sS "http://localhost:8000/items/search/all?query=iron" | jq .`
  - Best: `curl -sS "http://localhost:8000/items/search/best?query=pickaxe" | jq .`
- Recipe tree: `curl -sS "http://localhost:8000/items/123/recipe-tree?amount=1" | jq .`

## AI agent etiquette (to make automation smooth)
- Keep edits minimal and focused; reflect backend changes in `web/src/lib/config.ts` and services.
- Run linters/tests before concluding changes; prefer explicit names and early returns.
- For commits, use concise messages that explain the “why” and group related edits; include generated changes from hooks if present.
- Avoid committing secrets; prefer env vars. In non-dev, set `JWT_SECRET_KEY`.

## Gotchas and inconsistencies
- **Migrations**: Alembic is mentioned but not present; tables are created programmatically.
- **Tests**: Scaffolding exists but is inconsistent (e.g., `api/tests/conftest.py` uses `User` not `UserOrm`). No full test suite.
- **OAuth callback**: Docs say port 3000; defaults use Vite 5173. Align `DISCORD_REDIRECT_URI` with frontend origin.
- **Versions**: `pyproject.toml` requires Python >= 3.13, Dockerfile uses 3.12, ruff targets 3.11. Pick one and align.
- **CORS**: API is strict in prod; Nginx adds permissive CORS on `/api/*`. Ensure headers won’t conflict with credentials.
- **Placeholders**: Some group-project user endpoints are stubbed (“Hello, World!”).

## Docker/deploy
- `docker-compose.yml` provisions:
  - `bitcraft-api`: builds from `api/`, clones BitCraft data to `/app/bitcraft-gamedata`, sets `BITCRAFT_GAMEDATA_DIR=/app/bitcraft-gamedata/server/region`, DB persisted via volume.
  - `bitcraft-web`: builds static, served by Nginx; proxies `/api/*` to API.
- `nginx.conf` handles SPA routing, `/api/` proxy, and permissive CORS headers for proxied paths.

## Quality and conventions (for agents)
- Prefer clear, explicit code with strong names and early returns. Type annotate public APIs.
- Keep UI consistent across light/dark themes; use shadcn/ui components.
- Reflect backend changes in `web/src/lib/config.ts` and services.
- Avoid committing secrets. Use env vars for tokens and set `JWT_SECRET_KEY` in non-dev envs.

## Troubleshooting quick checks
- Empty search results? Seed data and build FTS; confirm `BITCRAFT_GAMEDATA_DIR`.
- OAuth callback errors? Verify `DISCORD_REDIRECT_URI` matches frontend origin (5173 in dev).
- CORS/auth issues in prod? Check API vs Nginx CORS headers and credential forwarding.
- Endpoint not found? Use `/items/search/*` namespace, not `/search/*`.

## Minimal checklists
- Backend change:
  - [ ] Route added under `api/routes/*` and included
  - [ ] Models/queries updated; seed/FTS rebuilt if needed
  - [ ] Env/config documented
- Frontend change:
  - [ ] Service updated; hook/UI wired
  - [ ] Theming consistent; error/loading states covered
- Ops:
  - [ ] `BITCRAFT_GAMEDATA_DIR` set
  - [ ] Data seeded; FTS built
  - [ ] `VITE_API_BASE_URL` and OAuth redirect aligned