import os
from enum import Enum

from dotenv import load_dotenv

load_dotenv()

class EnvironmentEnum(Enum):
    TEST = "test"
    DEV = "dev"
    PROD = "prod"


LOGFIRE_TOKEN = os.getenv("LOGFIRE_TOKEN")
ENVIRONMENT = EnvironmentEnum(os.getenv("ENVIRONMENT", "dev"))

# Discord OAuth settings
DISCORD_CLIENT_ID = os.getenv("DISCORD_CLIENT_ID")
DISCORD_CLIENT_SECRET = os.getenv("DISCORD_CLIENT_SECRET")
DISCORD_REDIRECT_URI = os.getenv("DISCORD_REDIRECT_URI", "http://localhost:5173/auth/callback")

# JWT settings for session management
JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "your-secret-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24
