"""
Test suite for BitCraft API crafting endpoints.
Tests all CRUD operations for crafting projects and project items with authentication.
"""

import httpx
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, AsyncMock
from uuid import UUID, uuid4

from api import app


@pytest.fixture
def client() -> TestClient:
    """Create FastAPI test client (unauthenticated)."""
    return TestClient(app)


class TestCraftingProjectCreation:
    """Test crafting project creation endpoint."""

    @pytest.mark.auth
    @patch('routes.crafting.CraftingProjectOrm.create_project')
    def test_create_project_success(self, mock_create, authenticated_client: TestClient) -> None:
        """Test successful project creation with authentication."""
        # Mock the create_project response
        mock_project = AsyncMock()
        mock_project.public_uuid = uuid4()
        mock_project.private_uuid = uuid4()
        mock_create.return_value = mock_project
        
        project_data = {"project_name": "Test Project"}
        
        response = authenticated_client.post("/crafting/projects", json=project_data)
        
        assert response.status_code == httpx.codes.OK
        data = response.json()
        
        # Validate response structure
        assert "public_uuid" in data
        assert "private_uuid" in data
        assert "project_name" in data
        assert data["project_name"] == "Test Project"
        
        # Validate UUID format (basic check)
        assert len(data["public_uuid"]) == 36
        assert len(data["private_uuid"]) == 36
        assert data["public_uuid"] != data["private_uuid"]
        
        # Verify the ORM method was called correctly
        mock_create.assert_called_once_with("Test Project", 1)

    def test_create_project_unauthenticated(self, client: TestClient) -> None:
        """Test project creation without authentication should fail."""
        project_data = {"project_name": "Test Project"}
        
        response = client.post("/crafting/projects", json=project_data)
        
        assert response.status_code == httpx.codes.UNAUTHORIZED

    @pytest.mark.auth
    @patch('routes.crafting.CraftingProjectOrm.create_project')
    def test_create_project_empty_name(self, mock_create, authenticated_client: TestClient) -> None:
        """Test project creation with empty name."""
        # Mock the create_project response
        mock_project = AsyncMock()
        mock_project.public_uuid = uuid4()
        mock_project.private_uuid = uuid4()
        mock_create.return_value = mock_project
        
        project_data = {"project_name": ""}
        
        response = authenticated_client.post("/crafting/projects", json=project_data)
        
        # Should still succeed - empty names might be allowed
        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert data["project_name"] == ""

    @pytest.mark.auth
    def test_create_project_missing_name(self, authenticated_client: TestClient) -> None:
        """Test project creation with missing project name."""
        response = authenticated_client.post("/crafting/projects", json={})
        
        assert response.status_code == httpx.codes.UNPROCESSABLE_ENTITY

    @pytest.mark.auth
    def test_create_project_invalid_json(self, authenticated_client: TestClient) -> None:
        """Test project creation with invalid JSON."""
        response = authenticated_client.post(
            "/crafting/projects", 
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == httpx.codes.UNPROCESSABLE_ENTITY


class TestCraftingProjectRetrieval:
    """Test crafting project retrieval endpoint."""

    @pytest.fixture
    def sample_project_data(self):
        """Sample project data for mocking."""
        mock_project = AsyncMock()
        mock_project.project_id = 1
        mock_project.public_uuid = uuid4()
        mock_project.private_uuid = uuid4()
        mock_project.project_name = "Sample Project"
        mock_project.owners = []
        mock_project.target_items = []
        mock_project.is_private = False
        return mock_project

    @patch('routes.crafting.CraftingProjectOrm.get_project_by_uuid')
    def test_get_project_by_public_uuid(self, mock_get, client: TestClient, sample_project_data) -> None:
        """Test retrieving project by public UUID (no auth required)."""
        mock_get.return_value = sample_project_data
        
        response = client.get(f"/crafting/projects/{sample_project_data.public_uuid}")
        
        assert response.status_code == httpx.codes.OK
        data = response.json()
        
        # Validate response structure includes new fields
        assert "project_id" in data
        assert "public_uuid" in data
        assert "private_uuid" in data
        assert "project_name" in data
        assert "owners" in data
        assert "target_items" in data
        assert "is_private" in data
        
        assert data["project_name"] == "Sample Project"

    @patch('routes.crafting.CraftingProjectOrm.get_project_by_uuid')
    def test_get_project_not_found(self, mock_get, client: TestClient) -> None:
        """Test retrieving non-existent project."""
        mock_get.return_value = None
        fake_uuid = uuid4()
        
        response = client.get(f"/crafting/projects/{fake_uuid}")
        
        assert response.status_code == httpx.codes.NOT_FOUND
        assert "Project not found" in response.json()["detail"]

    def test_get_project_invalid_uuid(self, client: TestClient) -> None:
        """Test retrieving project with invalid UUID format."""
        invalid_uuid = "not-a-valid-uuid"
        
        response = client.get(f"/crafting/projects/{invalid_uuid}")
        
        assert response.status_code == httpx.codes.BAD_REQUEST
        assert "Invalid UUID format" in response.json()["detail"]


class TestUserProjects:
    """Test user project listing endpoint."""

    @pytest.mark.auth
    @patch('routes.crafting.CraftingProjectOrm.get_user_projects')
    def test_get_user_projects_empty(self, mock_get, authenticated_client: TestClient) -> None:
        """Test getting user projects when user has no projects."""
        mock_get.return_value = []
        
        response = authenticated_client.get("/crafting/projects")
        
        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0
        
        # Verify the ORM method was called with correct user ID
        mock_get.assert_called_once_with(1)

    def test_get_user_projects_unauthenticated(self, client: TestClient) -> None:
        """Test getting user projects without authentication should fail."""
        response = client.get("/crafting/projects")
        
        assert response.status_code == httpx.codes.UNAUTHORIZED


class TestCraftingProjectItems:
    """Test crafting project item management endpoints."""

    @pytest.fixture
    def sample_project_data(self):
        """Sample project data for mocking."""
        mock_project = AsyncMock()
        mock_project.project_id = 1
        mock_project.public_uuid = uuid4()
        mock_project.private_uuid = uuid4()
        mock_project.project_name = "Item Test Project"
        return mock_project

    @pytest.mark.auth
    @patch('routes.crafting.CraftingProjectItemOrm.add_item_to_project')
    @patch('routes.crafting.CraftingProjectOrm.get_project_by_uuid')
    def test_add_item_to_project_success(self, mock_get_project, mock_add_item, 
                                       authenticated_client: TestClient, sample_project_data) -> None:
        """Test successfully adding an item to a project."""
        mock_get_project.return_value = sample_project_data
        mock_add_item.return_value = True  # Success
        
        item_data = {"item_id": 1, "count": 5}
        
        response = authenticated_client.post(f"/crafting/projects/{sample_project_data.public_uuid}/items", json=item_data)
        
        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert data["message"] == "Item added to project successfully"
        
        # Verify the ORM methods were called correctly
        mock_add_item.assert_called_once_with(
            project_id=1,
            item_id=1,
            count=5,
            user_id=1
        )

    def test_add_item_unauthenticated(self, client: TestClient, sample_project_data) -> None:
        """Test adding item without authentication should fail."""
        item_data = {"item_id": 1, "count": 5}
        
        response = client.post(f"/crafting/projects/{sample_project_data.public_uuid}/items", json=item_data)
        
        assert response.status_code == httpx.codes.UNAUTHORIZED

    @pytest.mark.auth
    @patch('routes.crafting.CraftingProjectItemOrm.add_item_to_project')
    @patch('routes.crafting.CraftingProjectOrm.get_project_by_uuid')
    def test_add_item_not_owner(self, mock_get_project, mock_add_item,
                              authenticated_client_2: TestClient, sample_project_data) -> None:
        """Test adding item when not an owner should be forbidden."""
        mock_get_project.return_value = sample_project_data
        mock_add_item.return_value = False  # Permission denied
        
        item_data = {"item_id": 1, "count": 5}
        
        response = authenticated_client_2.post(f"/crafting/projects/{sample_project_data.public_uuid}/items", json=item_data)
        
        assert response.status_code == httpx.codes.FORBIDDEN
        assert "permission" in response.json()["detail"].lower()

    @pytest.mark.auth
    @patch('routes.crafting.CraftingProjectOrm.get_project_by_uuid')
    def test_add_item_project_not_found(self, mock_get_project, authenticated_client: TestClient) -> None:
        """Test adding item to non-existent project."""
        mock_get_project.return_value = None
        
        fake_uuid = uuid4()
        item_data = {"item_id": 1, "count": 5}
        
        response = authenticated_client.post(f"/crafting/projects/{fake_uuid}/items", json=item_data)
        
        assert response.status_code == httpx.codes.NOT_FOUND
        assert "Project not found" in response.json()["detail"]

    @patch('routes.crafting.CraftingProjectItemOrm.get_project_items')
    @patch('routes.crafting.CraftingProjectOrm.get_project_by_uuid')
    def test_get_project_items_empty(self, mock_get_project, mock_get_items,
                                   client: TestClient, sample_project_data) -> None:
        """Test getting items from empty project (no auth required)."""
        mock_get_project.return_value = sample_project_data
        mock_get_items.return_value = []
        
        response = client.get(f"/crafting/projects/{sample_project_data.public_uuid}/items")
        
        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    @patch('routes.crafting.CraftingProjectItemOrm.get_project_items')
    @patch('routes.crafting.CraftingProjectOrm.get_project_by_uuid')
    def test_get_project_items_not_found(self, mock_get_project, mock_get_items, client: TestClient) -> None:
        """Test getting items from non-existent project."""
        mock_get_project.return_value = None
        
        fake_uuid = uuid4()
        
        response = client.get(f"/crafting/projects/{fake_uuid}/items")
        
        assert response.status_code == httpx.codes.NOT_FOUND
        assert "Project not found" in response.json()["detail"]


class TestCraftingProjectWorkflows:
    """Test complete workflows combining multiple endpoints."""

    @pytest.mark.auth
    @patch('routes.crafting.CraftingProjectOrm.create_project')
    def test_create_project_basic_workflow(self, mock_create, authenticated_client: TestClient) -> None:
        """Test basic project creation workflow."""
        # Mock the create_project response
        mock_project = AsyncMock()
        mock_project.public_uuid = uuid4()
        mock_project.private_uuid = uuid4()
        mock_create.return_value = mock_project
        
        # 1. Create project
        project_data = {"project_name": "Workflow Test Project"}
        response = authenticated_client.post("/crafting/projects", json=project_data)
        assert response.status_code == httpx.codes.OK
        project = response.json()
        
        # Validate response
        assert project["project_name"] == "Workflow Test Project"
        assert "public_uuid" in project
        assert "private_uuid" in project 