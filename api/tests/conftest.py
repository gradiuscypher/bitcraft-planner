"""
Pytest configuration for BitCraft API tests.
"""

import pytest  # type: ignore[import-untyped]
from fastapi.testclient import TestClient
import asyncio

from api import app
from database import SessionLocal, init_database
from models.users import User
from routes.auth import get_current_user


@pytest.fixture(scope="session")
def test_client():
    """Create a test client for the entire test session."""
    return TestClient(app)


@pytest.fixture(scope="session")
def api_base_url():
    """Base URL for API endpoints."""
    return "http://testserver"


@pytest.fixture(scope="session")
def event_loop():
    """Create an event loop for the test session."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# Test data for users
TEST_USER_1_DATA = {
    "discord_id": "123456789012345678",
    "username": "testuser",
    "discriminator": "1234",
    "global_name": "Test User",
    "avatar": "avatar_hash",
    "email": "test@example.com"
}

TEST_USER_2_DATA = {
    "discord_id": "987654321098765432",
    "username": "testuser2",
    "discriminator": "5678",
    "global_name": "Test User 2",
    "avatar": "avatar_hash_2",
    "email": "test2@example.com"
}


class MockUser:
    """Mock user object that mimics the User model for testing."""
    def __init__(self, user_data: dict):
        self.id = user_data.get("id", 1)  # Default ID for mock
        self.discord_id = user_data["discord_id"]
        self.username = user_data["username"]
        self.discriminator = user_data.get("discriminator")
        self.global_name = user_data.get("global_name")
        self.avatar = user_data.get("avatar")
        self.email = user_data.get("email")


async def ensure_test_users_exist():
    """Ensure test users exist in the database."""
    await init_database()
    
    async with SessionLocal() as session:
        # Check if user 1 exists
        user1 = User(**TEST_USER_1_DATA)
        session.add(user1)
        
        user2 = User(**TEST_USER_2_DATA)
        session.add(user2)
        
        try:
            await session.commit()
        except Exception:
            # Users might already exist, that's okay
            await session.rollback()


@pytest.fixture(scope="session", autouse=True)
def setup_test_users():
    """Set up test users in the database."""
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(ensure_test_users_exist())
    finally:
        loop.close()


@pytest.fixture
def mock_user():
    """Create a mock user for testing authenticated endpoints."""
    return MockUser({**TEST_USER_1_DATA, "id": 1})


@pytest.fixture
def mock_user_2():
    """Create a second mock user for testing multi-user scenarios."""
    return MockUser({**TEST_USER_2_DATA, "id": 2})


@pytest.fixture
def authenticated_client(mock_user):
    """Create a test client with mocked authentication."""
    def mock_get_current_user():
        return mock_user
    
    app.dependency_overrides[get_current_user] = mock_get_current_user
    client = TestClient(app)
    yield client
    # Clean up the override after test
    app.dependency_overrides.clear()


@pytest.fixture
def authenticated_client_2(mock_user_2):
    """Create a test client with mocked authentication for second user."""
    def mock_get_current_user():
        return mock_user_2
    
    app.dependency_overrides[get_current_user] = mock_get_current_user
    client = TestClient(app)
    yield client
    # Clean up the override after test
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers():
    """Create mock authorization headers for manual header testing."""
    return {"Authorization": "Bearer mock_jwt_token"}


# Configure pytest markers
def pytest_configure(config):
    """Configure pytest markers."""
    config.addinivalue_line(
        "markers", "slow: marks tests as slow (deselect with '-m \"not slow\"')",
    )
    config.addinivalue_line(
        "markers", "integration: marks tests as integration tests",
    )
    config.addinivalue_line(
        "markers", "unit: marks tests as unit tests",
    )
    config.addinivalue_line(
        "markers", "auth: marks tests that require authentication",
    )
