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
