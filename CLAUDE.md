### Quick status
- Read `CLAUDE.md`, the backend (FastAPI, settings, DB, models, routes), frontend (Vite/React, services/hooks/pages), Docker, and docs.
- Cross-checked endpoints, env vars, data loading/FTS, and deployment flow. Noted discrepancies and gotchas useful for future automation.

### Review of CLAUDE.md
- Accurate high-level overview of stack, structure, and features; helpful as a project map.
- Minor discrepancies to flag:
  - Mentions Alembic migrations; no Alembic present in repo.
  - Says “API tests” broadly; only test scaffolding exists, and it’s currently inconsistent (see below).
  - OAuth setup docs in `api/DISCORD_OAUTH_SETUP.md` use `http://localhost:3000`; frontend defaults to Vite `5173` and `settings.py` defaults to `5173`.
  - API README lists `/search/*` endpoints; actual code namespaces search under `/items/search/*` (frontend uses correct ones via `apiService`).

### Monorepo summary (what’s here and how it fits)

- Backend (FastAPI, SQLite, SQLAlchemy-async)
  - App, CORS, and error handling: see `api/api.py`. CORS locked down for PROD, permissive for DEV.
  - Settings via dotenv with environment switch: `ENVIRONMENT` (dev/test/prod) and OAuth/JWT/logfire/envs in `api/settings.py`.
  - Database/ORM configured per env; SQLite file at repo root in DEV, `/api/data/bitcraft.db` with Docker volume in PROD; init creates tables on startup:
    ```1:26:api/api.py
    await init_database()
    ```
  - Models:
    - Game data tables and search service (FTS5 + fuzzy fallback) in `api/models/gamedata.py` (items, buildings, cargo, recipes).
    - Users, groups, memberships with roles (member/co_owner/owner) in `api/models/users.py`.
    - Projects and project items with permission helpers in `api/models/projects.py`.
  - Data loading and FTS:
    - JSON loaders in `api/helpers.py` expect `BITCRAFT_GAMEDATA_DIR` (set in Docker and compose).
    - DB seeding and FTS creation functions exist but are NOT invoked automatically:
      - `init_game_data()`, `create_fts_tables()`, `build_everything()` in `api/models/gamedata.py`.
    - Practical note: without running these, DB will be empty and search relies solely on fallback LIKE/fuzzy logic; many endpoints will return 404/empty until seeded.
  - Auth (Discord OAuth + token):
    - OAuth via Authlib; token handled by itsdangerous `URLSafeTimedSerializer` (not a JWT library); expiration enforced in payload. See `routes/auth.py`.
    - Bearer-protected dependencies load user with eager group memberships.
  - API routes (main ones actually implemented)
    - Auth: `/auth/login`, `/auth/callback`, `/auth/me`, `/auth/logout`.
    - Items and search:
      - `/items/search`, `/items/search/buildings`, `/items/search/cargo`, `/items/search/all`, `/items/search/best`.
      - `/items/random`, `/items/{item_id}`, `/items/{item_id}/recipe`, `/items/{item_id}/recipe-tree`, `/items/recipe/{recipe_id}/recipe-tree`.
    - Buildings: `/buildings/{building_id}`, `/buildings/type/{building_type_id}`.
    - Cargo: `/cargo/{cargo_id}`.
    - Groups: list/get/create/delete; add/remove member by Discord ID; promote/demote co-owner; permission checks wired.
    - Projects: list/CRUD; add/remove item; update item count; permission checks for owner vs group co-owners.
    - Placeholders returning “Hello, World!” exist for some group-project user endpoints – not implemented yet.
- Frontend (Vite/React 19/TS, Tailwind/shadcn/ui)
  - App shell, routes, and themed UI in `web/src/App.tsx`.
  - Auth flow is integrated:
    - `use-auth` context, `auth-service` handles `/auth/*` endpoints and token storage in localStorage.
    - `UserNav` shows Discord avatar or initials, with login/logout and loading states.
  - Search:
    - Navbar search dropdown with debounced multi-index search using `/items/search/all`.
    - Pages: basic search (`/search`) with random “featured” items when empty; advanced search (`/search/advanced`) with filters/sorting and “add to project”.
  - Projects & Groups:
    - Polling hooks for lists and details; CRUD via `projects-service` and `groups-service` that auto-inject Bearer token.
    - Project detail page supports per-item count management and removal with permissions.
    - “Add to Project” dialog to add search hits to a chosen project.
    - “Base Materials Calculator” (`recipe-tree-flow`) hits `/items/{id}/recipe-tree` and can bulk-add base materials to a project.
  - API base URL:
    - Local dev expects `VITE_API_BASE_URL` (defaults to `http://localhost:8000` if unset).
    - Docker: frontend built with `VITE_API_BASE_URL=/api` and Nginx proxies `/api` → API service.

- Docker/deploy
  - `docker-compose.yml`:
    - `bitcraft-api` builds from `api/`, clones BitCraft game data to `/app/bitcraft-gamedata`, sets `BITCRAFT_GAMEDATA_DIR=/app/bitcraft-gamedata/server/region`, persists DB under a volume.
    - `bitcraft-web` builds and serves static via Nginx, proxies `/api/*` to the API service.
  - Entrypoints:
    - API’s `entrypoint.sh` starts FastAPI; migrations commented out; no data seeding invoked.
    - Web’s `nginx.conf` SPA routing and `/api/` proxy + permissive CORS headers.

### Notable gaps, mismatches, and gotchas (useful to future agents)

- Seeding data/FTS is manual. Without it, most game-data reads and search will be sparse. Consider running:
  - In `api/` virtualenv: `uv run python -c "import asyncio; from models.gamedata import build_everything; asyncio.run(build_everything())"`.
  - Or call `init_game_data()` and `create_fts_tables()` after `init_database()` once.
- Tests are scaffolding-only and inconsistent:
  - `api/tests/conftest.py` instantiates `models.users.User` (Pydantic) and tries `session.add(user)`; should be `UserOrm`.
  - No actual test modules beyond fixtures.
- Endpoint naming inconsistencies:
  - API README lists `/search/*`; actual code uses `/items/search/*`. Frontend `apiService` uses the correct `/items/search/*`.
- OAuth docs vs code defaults:
  - Docs show callback on port 3000; `settings.py` defaults to `5173`. Align `DISCORD_REDIRECT_URI` and frontend origin.
- Python versions mismatch:
  - `pyproject.toml` requires `>=3.13` but Dockerfile uses `python:3.12`; ruff target-version is `py311`. Pick one target and align.
- Security/CORS:
  - PROD CORS is domain-restricted in API, but Nginx adds permissive CORS on `/api/*`. Ensure headers align to avoid surprises with credentials.
  - `JWT_SECRET_KEY` has a dev default; override in production.
- Projects/groups: some group-project endpoints are placeholders. Group permissions are implemented, but UI “Leave Group” is stubbed.

### Key environment variables (back and front)
- Backend (`api/settings.py`):
  - `ENVIRONMENT`, `LOGFIRE_TOKEN` (prod), `DISCORD_CLIENT_ID/SECRET`, `DISCORD_REDIRECT_URI`, `JWT_SECRET_KEY`, `JWT_EXPIRATION_HOURS`.
- Data loaders (`api/helpers.py`):
  - `BITCRAFT_GAMEDATA_DIR` (must point to BitCraft JSON set).
- Frontend:
  - `VITE_API_BASE_URL` (dev: set to `http://localhost:8000`; Docker build sets `/api`).

### How to run locally
- API: `cd api && make api` (or `uv run uvicorn api:app --reload`).
- Web: `cd web && make web` (Vite on `5173`).
- Compose: `docker-compose up -d` (web at 8003, api at 8002 via Nginx proxy `/api`).

### Endpoints map (high-signal)
- Auth: `/auth/login`, `/auth/callback`, `/auth/me`, `/auth/logout`.
- Items/search:
  - `/items/search`, `/items/search/buildings`, `/items/search/cargo`, `/items/search/all`, `/items/search/best`, `/items/random`.
  - `/items/{item_id}`, `/items/{item_id}/recipe`, `/items/{item_id}/recipe-tree`, `/items/recipe/{recipe_id}/recipe-tree`.
- Buildings: `/buildings/{building_id}`, `/buildings/type/{building_type_id}`.
- Cargo: `/cargo/{cargo_id}`.
- Groups: `/groups/`, `/groups/{group_id}`, `/groups?group_name=...` (POST), membership mgmt via Discord IDs, co-owner promote/demote.
- Projects: `/projects/`, `/projects/{id}` (GET/PUT/DELETE), `/projects/{id}/items` (POST), `/projects/{id}/items/{item_id}` (DELETE), `/projects/{id}/items/{item_id}/count` (PUT).

### Tips for future AI automation
- To bootstrap a usable environment:
  - Ensure `BITCRAFT_GAMEDATA_DIR` is set and accessible.
  - Run data seeding + FTS once after tables are created to populate search.
- If adding endpoints:
  - Add new router under `api/routes/`, import and `app.include_router(...)` in `api/api.py`.
  - Reflect in `web/src/lib/config.ts` and in respective services.
- If fixing tests:
  - Replace `User` with `UserOrm` in fixtures and add actual test modules. Consider an in-memory DB by setting `ENVIRONMENT=test`.
- If aligning versions:
  - Update `pyproject.toml` requires-python to match Docker (or bump Docker to Python 3.13).