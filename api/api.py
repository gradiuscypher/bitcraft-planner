import logging

import logfire
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.items import items
from settings import ENVIRONMENT, LOGFIRE_TOKEN

logger = logging.getLogger(__name__)
logfire.configure(token=LOGFIRE_TOKEN, environment=ENVIRONMENT.value)

app = FastAPI()
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

# Include the items router
app.include_router(items)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, port=8000)
