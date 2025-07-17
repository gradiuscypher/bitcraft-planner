import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

import logfire
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_database
from routes.crafting import crafting
from routes.items import items
from settings import ENVIRONMENT, LOGFIRE_TOKEN

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

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative React dev server
        "http://127.0.0.1:5173",  # Alternative localhost format
        "https://bitcraft.derp.tools",  # Production domain
        "http://bitcraft.derp.tools",   # Production domain (HTTP)
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

# Include the routers
app.include_router(items)
app.include_router(crafting)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, port=8000)
