import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import logfire
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_database
from routes.auth import auth
from routes.crafting import crafting
from routes.groups import groups
from routes.items import items
from routes.test import test
from settings import ENVIRONMENT, LOGFIRE_TOKEN, EnvironmentEnum

logger = logging.getLogger(__name__)
logfire.configure(token=LOGFIRE_TOKEN, environment=ENVIRONMENT.value)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    # Startup: Initialize database tables
    await init_database()
    logger.info("Database initialized successfully")
    yield
    # Shutdown: Add any cleanup code here if needed


app = FastAPI(lifespan=lifespan)
logfire.instrument_fastapi(app)

# Configure CORS based on environment
if ENVIRONMENT == EnvironmentEnum.PROD:
    # In production, use restricted CORS settings
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "https://bitcraft.derp.tools",  # Production domain
            "http://bitcraft.derp.tools",   # Production domain (HTTP)
        ],
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE"],
        allow_headers=["*"],
    )
    logger.info("CORS restrictions enabled for production environment")
else:
    # In development/test, allow all origins (effectively disables CORS)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins in dev/test
        allow_credentials=False,  # Must be False when allow_origins=["*"]
        allow_methods=["*"],  # Allow all methods
        allow_headers=["*"],  # Allow all headers
    )
    logger.info("CORS restrictions disabled for development/test environment")

# Include the routers
app.include_router(auth)
app.include_router(items)
app.include_router(crafting)
app.include_router(groups)
app.include_router(test)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, port=8000)
