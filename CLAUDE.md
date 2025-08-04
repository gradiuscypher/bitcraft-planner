# Bitcraft Planner - Project Overview

A web application for managing crafting plans and projects in Bitcraft Online, featuring a FastAPI backend and React frontend with Discord OAuth authentication.

## Project Structure

```
bitcraft-planner/
├── api/                        # FastAPI backend
│   ├── Makefile               # API dev commands
│   ├── api.py                 # Main FastAPI app with CORS & error handling
│   ├── database.py            # SQLAlchemy async setup with SQLite
│   ├── helpers.py             # Utility functions
│   ├── settings.py            # Environment configuration
│   ├── pyproject.toml         # Python dependencies (uv package manager)
│   ├── models/                # SQLAlchemy ORM models
│   │   ├── gamedata.py        # Game data models
│   │   ├── items.py           # Item models
│   │   ├── projects.py        # Project models  
│   │   └── users.py           # User models
│   ├── routes/                # FastAPI route handlers
│   │   ├── auth.py            # Discord OAuth authentication
│   │   ├── buildings.py       # Building endpoints
│   │   ├── cargo.py           # Cargo endpoints
│   │   ├── groups.py          # Group management
│   │   ├── items.py           # Item endpoints
│   │   └── projects.py        # Project management
│   └── tests/                 # API tests
├── web/                       # React frontend
│   ├── Makefile              # Web dev commands
│   ├── package.json          # Node.js dependencies (pnpm)
│   ├── vite.config.ts        # Vite build configuration
│   ├── src/
│   │   ├── App.tsx           # Main app with routing & landing page
│   │   ├── components/       # Reusable UI components (shadcn/ui)
│   │   ├── hooks/            # React hooks (auth)
│   │   ├── lib/              # Services & utilities
│   │   ├── pages/            # Route components
│   │   └── types/            # TypeScript type definitions
├── docker-compose.yml        # Multi-service deployment
└── bitcraft.db              # SQLite database
```

## Technology Stack

### Backend (API)
- **FastAPI**: Modern Python web framework with automatic OpenAPI docs
- **SQLAlchemy**: Async ORM with SQLite database
- **OAuth**: Discord authentication via Authlib
- **Testing**: pytest with asyncio support
- **Linting**: ruff (configured with strict rules)
- **Monitoring**: Logfire integration for production
- **Package Management**: uv (fast Python package manager)

### Frontend (Web)
- **React 19**: Modern React with hooks
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and dev server
- **React Router**: Client-side routing
- **shadcn/ui**: Modern component library with Radix UI primitives
- **Tailwind CSS**: Utility-first styling
- **Lucide React**: Icon library
- **Package Management**: pnpm

## Development Commands

### API Service (from /api directory)
```bash
# Start development server
make api
# Equivalent to: uv run uvicorn api:app --host 0.0.0.0 --port 8000 --reload

# Run tests
make test  
# Equivalent to: uv run pytest tests/ -vv

# Manual commands
uv run ruff check .           # Lint code
uv run ruff format .          # Format code
uv run python -m pytest      # Run tests
```

### Web Service (from /web directory)
```bash
# Start development server  
make web
# Equivalent to: pnpm run dev --host 0.0.0.0

# Other commands
pnpm run build               # Build for production
pnpm run lint                # ESLint checking
pnpm run preview             # Preview production build
```

### Docker Deployment
```bash
# Start both services in production mode
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## API Architecture

### Core Features
- **Authentication**: Discord OAuth with JWT tokens
- **Error Handling**: Comprehensive exception handling with detailed logging
- **CORS**: Environment-based CORS configuration (permissive for dev, restricted for prod)
- **Database**: Async SQLite with SQLAlchemy ORM
- **Monitoring**: Logfire integration for production observability

### Endpoints Structure
- `/auth/*` - Discord OAuth authentication flow
- `/buildings/*` - Building data and search
- `/cargo/*` - Cargo/transport data  
- `/items/*` - Game item data and recipes
- `/groups/*` - User group management
- `/projects/*` - Crafting project management

### Database Models
- **Users**: Discord OAuth user profiles
- **Projects**: User crafting plans and project management
- **GameData**: Items, buildings, cargo, and recipe data
- **Groups**: Collaborative user groups

## Frontend Architecture

### Key Features
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Dark/Light Theme**: Built-in theme switcher
- **Authentication**: Discord OAuth integration with protected routes
- **Search**: Advanced search functionality for game data
- **Project Management**: Create and manage crafting projects
- **Group Collaboration**: Multi-user group features

### Page Structure
- **Landing Page**: Hero section with feature highlights
- **Recipe Explorer**: Browse and search game data
- **Advanced Search**: Filtering and sorting capabilities
- **Project Management**: Create and track crafting plans
- **Group Management**: Collaborative features
- **Item/Building/Cargo Details**: Detailed game data views

## Environment Configuration

### Development
- API runs on `http://localhost:8000`
- Web runs on `http://localhost:5173` (Vite default)
- CORS is permissive for local development
- SQLite database in project root
- No authentication secrets required for basic functionality

### Production
- Uses Docker Compose with nginx reverse proxy
- API exposed on port 8002, Web on port 8003
- Restricted CORS to production domains
- Database persistence via Docker volumes
- Requires OAuth secrets and JWT keys
- Logfire monitoring enabled

## Testing & Quality

### API Testing
- pytest with asyncio support
- Test database uses in-memory SQLite
- Coverage for models, routes, and authentication

### Code Quality
- **API**: ruff with comprehensive rule set (ALL rules enabled, excluding docs/print/line-length)
- **Web**: ESLint with TypeScript and React rules
- **TypeScript**: Strict mode enabled with full type checking

## OAuth Setup

The application supports Discord OAuth authentication. Setup files are provided:
- `api/DISCORD_OAUTH_SETUP.md` - Backend OAuth configuration
- `web/FRONTEND_OAUTH_SETUP.md` - Frontend OAuth integration

## Current Development Status

Based on the README.md, active development includes:
- Alerting system for crafting completion
- Group/project model improvements  
- Building models enhancement
- Item usage relationships ("Used In" functionality)
- UI improvements and testing
- Performance optimizations

## Key Files to Know

- `api/api.py:32` - Main FastAPI application setup
- `api/database.py:10` - Database configuration by environment
- `web/src/App.tsx:147` - Main React application with routing
- `api/routes/` - All API endpoint implementations
- `web/src/pages/` - All page components
- `docker-compose.yml:1` - Production deployment configuration