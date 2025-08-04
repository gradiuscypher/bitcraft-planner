import logging
import traceback
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from database import init_database
from routes.auth import auth
from routes.buildings import buildings
from routes.cargo import cargo
from routes.groups import groups
from routes.items import items
from routes.projects import projects
from settings import ENVIRONMENT, LOGFIRE_TOKEN, EnvironmentEnum

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    # Startup: Initialize database tables
    await init_database()
    logger.info("Database initialized successfully")
    yield
    # Shutdown: Add any cleanup code here if needed


app = FastAPI(
    lifespan=lifespan,
    title="Bitcraft Planner API",
    description="API for managing Bitcraft game data and user projects",
    version="1.0.0",
)

# ref: https://github.com/tiangolo/fastapi/discussions/6678
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(
    request: Request, exc: RequestValidationError,
) -> JSONResponse:
    exc_str = f"{exc}".replace("\n", " ").replace("   ", " ")

    # Enhanced logging with more details
    logger.error("Validation Error - URL: %s", request.url)
    logger.error("Method: %s", request.method)
    logger.error("Path Parameters: %s", request.path_params)
    logger.error("Query Parameters: %s", dict(request.query_params))
    logger.error("Headers: %s", dict(request.headers))
    logger.error("Exception Details: %s", exc_str)
    logger.error("Raw Exception: %s", exc)

    # More detailed error response
    content = {
        "status_code": 10422,
        "message": exc_str,
        "url": str(request.url),
        "method": request.method,
        "errors": exc.errors(),
        "data": None,
    }
    return JSONResponse(
        content=content, status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle all other unhandled exceptions with detailed logging"""
    logger.error("Unhandled Exception - URL: %s", request.url)
    logger.error("Method: %s", request.method)
    logger.error("Path Parameters: %s", request.path_params)
    logger.error("Query Parameters: %s", dict(request.query_params))
    logger.error("Exception Type: %s", type(exc).__name__)
    logger.error("Exception Message: %s", str(exc))
    logger.error("Traceback:\n%s", traceback.format_exc())

    content = {
        "status_code": 500,
        "message": "Internal server error",
        "url": str(request.url),
        "method": request.method,
        "exception_type": type(exc).__name__,
        "data": None,
    }

    return JSONResponse(
        content=content,
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
    )


# Configure CORS based on environment
if ENVIRONMENT == EnvironmentEnum.PROD:
    import logfire
    logfire.configure(token=LOGFIRE_TOKEN, environment=ENVIRONMENT.value)
    logfire.instrument_fastapi(app)
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
app.include_router(buildings)
app.include_router(cargo)
app.include_router(items)
app.include_router(groups)
app.include_router(projects)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, port=8000)
