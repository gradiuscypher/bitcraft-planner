"""
Test suite for BitCraft API crafting endpoints.
Tests all CRUD operations for crafting projects and project items.
"""

import httpx
import pytest
from fastapi.testclient import TestClient

from api import app


@pytest.fixture
def client() -> TestClient:
    """Create FastAPI test client."""
    return TestClient(app)


class TestCraftingProjectCreation:
    """Test crafting project creation endpoint."""

    def test_create_project_success(self, client: TestClient) -> None:
        """Test successful project creation."""
        project_data = {"project_name": "Test Project"}
        
        response = client.post("/crafting/projects", json=project_data)
        
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

    def test_create_project_empty_name(self, client: TestClient) -> None:
        """Test project creation with empty name."""
        project_data = {"project_name": ""}
        
        response = client.post("/crafting/projects", json=project_data)
        
        # Should still succeed - empty names might be allowed
        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert data["project_name"] == ""

    def test_create_project_missing_name(self, client: TestClient) -> None:
        """Test project creation with missing project name."""
        response = client.post("/crafting/projects", json={})
        
        assert response.status_code == httpx.codes.UNPROCESSABLE_ENTITY

    def test_create_project_invalid_json(self, client: TestClient) -> None:
        """Test project creation with invalid JSON."""
        response = client.post(
            "/crafting/projects", 
            data="invalid json",
            headers={"Content-Type": "application/json"}
        )
        
        assert response.status_code == httpx.codes.UNPROCESSABLE_ENTITY


class TestCraftingProjectRetrieval:
    """Test crafting project retrieval endpoint."""

    @pytest.fixture
    def sample_project(self, client: TestClient) -> dict:
        """Create a sample project for testing."""
        project_data = {"project_name": "Sample Project"}
        response = client.post("/crafting/projects", json=project_data)
        return response.json()

    def test_get_project_by_public_uuid(self, client: TestClient, sample_project: dict) -> None:
        """Test retrieving project by public UUID."""
        public_uuid = sample_project["public_uuid"]
        
        response = client.get(f"/crafting/projects/{public_uuid}")
        
        assert response.status_code == httpx.codes.OK
        data = response.json()
        
        assert "project_id" in data
        assert "project_uuid" in data
        assert "project_name" in data
        assert data["project_uuid"] == public_uuid
        assert data["project_name"] == "Sample Project"

    def test_get_project_by_private_uuid(self, client: TestClient, sample_project: dict) -> None:
        """Test retrieving project by private UUID."""
        private_uuid = sample_project["private_uuid"]
        
        response = client.get(f"/crafting/projects/{private_uuid}")
        
        assert response.status_code == httpx.codes.OK
        data = response.json()
        
        assert data["project_uuid"] == private_uuid
        assert data["project_name"] == "Sample Project"

    def test_get_project_not_found(self, client: TestClient) -> None:
        """Test retrieving non-existent project."""
        fake_uuid = "12345678-1234-1234-1234-123456789abc"
        
        response = client.get(f"/crafting/projects/{fake_uuid}")
        
        assert response.status_code == httpx.codes.NOT_FOUND
        assert "Project not found" in response.json()["detail"]

    def test_get_project_invalid_uuid(self, client: TestClient) -> None:
        """Test retrieving project with invalid UUID format."""
        invalid_uuid = "not-a-valid-uuid"
        
        response = client.get(f"/crafting/projects/{invalid_uuid}")
        
        assert response.status_code == httpx.codes.BAD_REQUEST
        assert "Invalid UUID format" in response.json()["detail"]


class TestCraftingProjectItems:
    """Test crafting project item management endpoints."""

    @pytest.fixture
    def sample_project(self, client: TestClient) -> dict:
        """Create a sample project for testing."""
        project_data = {"project_name": "Item Test Project"}
        response = client.post("/crafting/projects", json=project_data)
        return response.json()

    def test_add_item_to_project_success(self, client: TestClient, sample_project: dict) -> None:
        """Test successfully adding an item to a project."""
        private_uuid = sample_project["private_uuid"]
        item_data = {"item_id": 1, "count": 5}
        
        response = client.post(f"/crafting/projects/{private_uuid}/items", json=item_data)
        
        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert data["message"] == "Item added to project successfully"

    def test_add_item_with_public_uuid_forbidden(self, client: TestClient, sample_project: dict) -> None:
        """Test adding item with public UUID should be forbidden."""
        public_uuid = sample_project["public_uuid"]
        item_data = {"item_id": 1, "count": 5}
        
        response = client.post(f"/crafting/projects/{public_uuid}/items", json=item_data)
        
        assert response.status_code == httpx.codes.FORBIDDEN
        assert "Use the private UUID" in response.json()["detail"]

    def test_add_item_project_not_found(self, client: TestClient) -> None:
        """Test adding item to non-existent project."""
        fake_uuid = "12345678-1234-1234-1234-123456789abc"
        item_data = {"item_id": 1, "count": 5}
        
        response = client.post(f"/crafting/projects/{fake_uuid}/items", json=item_data)
        
        assert response.status_code == httpx.codes.NOT_FOUND
        assert "Project not found" in response.json()["detail"]

    def test_add_item_invalid_data(self, client: TestClient, sample_project: dict) -> None:
        """Test adding item with invalid data."""
        private_uuid = sample_project["private_uuid"]
        
        # Missing required fields
        response = client.post(f"/crafting/projects/{private_uuid}/items", json={})
        assert response.status_code == httpx.codes.UNPROCESSABLE_ENTITY
        
        # Invalid item_id type
        response = client.post(f"/crafting/projects/{private_uuid}/items", json={"item_id": "not_int", "count": 5})
        assert response.status_code == httpx.codes.UNPROCESSABLE_ENTITY
        
        # Invalid count type
        response = client.post(f"/crafting/projects/{private_uuid}/items", json={"item_id": 1, "count": "not_int"})
        assert response.status_code == httpx.codes.UNPROCESSABLE_ENTITY

    def test_get_project_items_empty(self, client: TestClient, sample_project: dict) -> None:
        """Test getting items from empty project."""
        public_uuid = sample_project["public_uuid"]
        
        response = client.get(f"/crafting/projects/{public_uuid}/items")
        
        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 0

    def test_get_project_items_with_items(self, client: TestClient, sample_project: dict) -> None:
        """Test getting items from project with items."""
        private_uuid = sample_project["private_uuid"]
        public_uuid = sample_project["public_uuid"]
        
        # Add some items
        item1_data = {"item_id": 1, "count": 5}
        item2_data = {"item_id": 2, "count": 10}
        
        client.post(f"/crafting/projects/{private_uuid}/items", json=item1_data)
        client.post(f"/crafting/projects/{private_uuid}/items", json=item2_data)
        
        # Get items
        response = client.get(f"/crafting/projects/{public_uuid}/items")
        
        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        
        # Validate item structure
        for item in data:
            assert "item_id" in item
            assert "count" in item
            assert item["item_id"] in [1, 2]
            assert item["count"] in [5, 10]

    def test_get_project_items_not_found(self, client: TestClient) -> None:
        """Test getting items from non-existent project."""
        fake_uuid = "12345678-1234-1234-1234-123456789abc"
        
        response = client.get(f"/crafting/projects/{fake_uuid}/items")
        
        assert response.status_code == httpx.codes.NOT_FOUND
        assert "Project not found" in response.json()["detail"]

    def test_remove_item_from_project_success(self, client: TestClient, sample_project: dict) -> None:
        """Test successfully removing an item from a project."""
        private_uuid = sample_project["private_uuid"]
        item_data = {"item_id": 1, "count": 5}
        
        # Add item first
        client.post(f"/crafting/projects/{private_uuid}/items", json=item_data)
        
        # Remove item
        response = client.delete(f"/crafting/projects/{private_uuid}/items/1")
        
        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert data["message"] == "Item removed from project successfully"

    def test_remove_item_with_public_uuid_forbidden(self, client: TestClient, sample_project: dict) -> None:
        """Test removing item with public UUID should be forbidden."""
        public_uuid = sample_project["public_uuid"]
        
        response = client.delete(f"/crafting/projects/{public_uuid}/items/1")
        
        assert response.status_code == httpx.codes.FORBIDDEN
        assert "Use the private UUID" in response.json()["detail"]

    def test_remove_item_project_not_found(self, client: TestClient) -> None:
        """Test removing item from non-existent project."""
        fake_uuid = "12345678-1234-1234-1234-123456789abc"
        
        response = client.delete(f"/crafting/projects/{fake_uuid}/items/1")
        
        assert response.status_code == httpx.codes.NOT_FOUND
        assert "Project not found" in response.json()["detail"]

    def test_update_item_count_success(self, client: TestClient, sample_project: dict) -> None:
        """Test successfully updating item count."""
        private_uuid = sample_project["private_uuid"]
        item_data = {"item_id": 1, "count": 5}
        
        # Add item first
        client.post(f"/crafting/projects/{private_uuid}/items", json=item_data)
        
        # Update count
        update_data = {"count": 15}
        response = client.put(f"/crafting/projects/{private_uuid}/items/1/count", json=update_data)
        
        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert data["message"] == "Item count updated successfully"

    def test_update_item_count_with_public_uuid_forbidden(self, client: TestClient, sample_project: dict) -> None:
        """Test updating item count with public UUID should be forbidden."""
        public_uuid = sample_project["public_uuid"]
        update_data = {"count": 15}
        
        response = client.put(f"/crafting/projects/{public_uuid}/items/1/count", json=update_data)
        
        assert response.status_code == httpx.codes.FORBIDDEN
        assert "Use the private UUID" in response.json()["detail"]

    def test_update_item_count_project_not_found(self, client: TestClient) -> None:
        """Test updating item count for non-existent project."""
        fake_uuid = "12345678-1234-1234-1234-123456789abc"
        update_data = {"count": 15}
        
        response = client.put(f"/crafting/projects/{fake_uuid}/items/1/count", json=update_data)
        
        assert response.status_code == httpx.codes.NOT_FOUND
        assert "Project not found" in response.json()["detail"]

    def test_update_item_count_item_not_found(self, client: TestClient, sample_project: dict) -> None:
        """Test updating count for non-existent item in project."""
        private_uuid = sample_project["private_uuid"]
        update_data = {"count": 15}
        
        response = client.put(f"/crafting/projects/{private_uuid}/items/999/count", json=update_data)
        
        assert response.status_code == httpx.codes.NOT_FOUND
        assert "Item not found in project" in response.json()["detail"]

    def test_update_item_count_invalid_data(self, client: TestClient, sample_project: dict) -> None:
        """Test updating item count with invalid data."""
        private_uuid = sample_project["private_uuid"]
        item_data = {"item_id": 1, "count": 5}
        
        # Add item first
        client.post(f"/crafting/projects/{private_uuid}/items", json=item_data)
        
        # Invalid count type
        response = client.put(f"/crafting/projects/{private_uuid}/items/1/count", json={"count": "not_int"})
        assert response.status_code == httpx.codes.UNPROCESSABLE_ENTITY
        
        # Missing count field
        response = client.put(f"/crafting/projects/{private_uuid}/items/1/count", json={})
        assert response.status_code == httpx.codes.UNPROCESSABLE_ENTITY


class TestCraftingProjectWorkflows:
    """Test complete workflows combining multiple endpoints."""

    def test_complete_project_workflow(self, client: TestClient) -> None:
        """Test complete workflow: create project, add items, update counts, remove items."""
        # 1. Create project
        project_data = {"project_name": "Workflow Test Project"}
        response = client.post("/crafting/projects", json=project_data)
        assert response.status_code == httpx.codes.OK
        project = response.json()
        
        private_uuid = project["private_uuid"]
        public_uuid = project["public_uuid"]
        
        # 2. Verify project is empty
        response = client.get(f"/crafting/projects/{public_uuid}/items")
        assert response.status_code == httpx.codes.OK
        assert len(response.json()) == 0
        
        # 3. Add multiple items
        items_to_add = [
            {"item_id": 1, "count": 5},
            {"item_id": 2, "count": 10},
            {"item_id": 3, "count": 3}
        ]
        
        for item_data in items_to_add:
            response = client.post(f"/crafting/projects/{private_uuid}/items", json=item_data)
            assert response.status_code == httpx.codes.OK
        
        # 4. Verify all items were added
        response = client.get(f"/crafting/projects/{public_uuid}/items")
        assert response.status_code == httpx.codes.OK
        items = response.json()
        assert len(items) == 3
        
        item_ids = [item["item_id"] for item in items]
        assert 1 in item_ids
        assert 2 in item_ids
        assert 3 in item_ids
        
        # 5. Update item count
        response = client.put(f"/crafting/projects/{private_uuid}/items/1/count", json={"count": 20})
        assert response.status_code == httpx.codes.OK
        
        # 6. Remove an item
        response = client.delete(f"/crafting/projects/{private_uuid}/items/2")
        assert response.status_code == httpx.codes.OK
        
        # 7. Verify final state
        response = client.get(f"/crafting/projects/{public_uuid}/items")
        assert response.status_code == httpx.codes.OK
        final_items = response.json()
        assert len(final_items) == 2
        
        final_item_ids = [item["item_id"] for item in final_items]
        assert 1 in final_item_ids
        assert 3 in final_item_ids
        assert 2 not in final_item_ids

    def test_project_access_control(self, client: TestClient) -> None:
        """Test access control between public and private UUIDs."""
        # Create project
        project_data = {"project_name": "Access Control Test"}
        response = client.post("/crafting/projects", json=project_data)
        project = response.json()
        
        private_uuid = project["private_uuid"]
        public_uuid = project["public_uuid"]
        
        # Public UUID should allow reading but not writing
        response = client.get(f"/crafting/projects/{public_uuid}")
        assert response.status_code == httpx.codes.OK
        
        response = client.get(f"/crafting/projects/{public_uuid}/items")
        assert response.status_code == httpx.codes.OK
        
        # Public UUID should forbid writing operations
        response = client.post(f"/crafting/projects/{public_uuid}/items", json={"item_id": 1, "count": 5})
        assert response.status_code == httpx.codes.FORBIDDEN
        
        response = client.delete(f"/crafting/projects/{public_uuid}/items/1")
        assert response.status_code == httpx.codes.FORBIDDEN
        
        response = client.put(f"/crafting/projects/{public_uuid}/items/1/count", json={"count": 10})
        assert response.status_code == httpx.codes.FORBIDDEN
        
        # Private UUID should allow all operations
        response = client.get(f"/crafting/projects/{private_uuid}")
        assert response.status_code == httpx.codes.OK
        
        response = client.post(f"/crafting/projects/{private_uuid}/items", json={"item_id": 1, "count": 5})
        assert response.status_code == httpx.codes.OK
        
        response = client.put(f"/crafting/projects/{private_uuid}/items/1/count", json={"count": 10})
        assert response.status_code == httpx.codes.OK
        
        response = client.delete(f"/crafting/projects/{private_uuid}/items/1")
        assert response.status_code == httpx.codes.OK 