"""
Pytest configuration for BitCraft API tests.
"""

import pytest  # type: ignore[import-untyped]
from fastapi.testclient import TestClient

from api import app


@pytest.fixture(scope="session")
def test_client():
    """Create a test client for the entire test session."""
    return TestClient(app)


@pytest.fixture(scope="session")
def api_base_url():
    """Base URL for API endpoints."""
    return "http://testserver"


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
