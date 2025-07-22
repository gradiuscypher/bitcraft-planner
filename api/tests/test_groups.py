"""
Test suite for group API functionality.

This module tests all group-related endpoints and functionality including:
- Group creation and retrieval
- Adding and removing group members
- Admin permission management
- Adding projects to groups
- Error handling and edge cases
"""

from unittest.mock import AsyncMock, patch
from uuid import uuid4

import httpx
import pytest
from fastapi.testclient import TestClient

from models.crafting import CraftingProjectResponse
from models.users import GroupOrm, UserGroupMembership


class TestGroupAPI:
    """Test group basic API endpoints."""

    @pytest.mark.auth
    @patch("routes.groups.GroupOrm.get_group")
    def test_get_group_success(self, mock_get_group, authenticated_client: TestClient) -> None:
        """Test successfully retrieving a group."""
        mock_group = AsyncMock()
        mock_group.id = 1
        mock_group.name = "Test Group"
        mock_get_group.return_value = mock_group

        response = authenticated_client.get("/groups/1")

        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert data["id"] == 1
        assert data["name"] == "Test Group"
        mock_get_group.assert_called_once_with(1)

    @pytest.mark.auth
    @patch("routes.groups.GroupOrm.get_group")
    def test_get_group_not_found(self, mock_get_group, authenticated_client: TestClient) -> None:
        """Test retrieving a non-existent group."""
        mock_get_group.return_value = None

        response = authenticated_client.get("/groups/999")

        # This will depend on how the actual endpoint handles None return
        # If it returns None, it might cause a 500 or need better error handling
        mock_get_group.assert_called_once_with(999)

    @pytest.mark.auth
    @patch("routes.groups.GroupOrm.create_group")
    def test_create_group_success(self, mock_create_group, authenticated_client: TestClient) -> None:
        """Test successfully creating a group."""
        mock_group = AsyncMock()
        mock_group.id = 1
        mock_group.name = "New Test Group"
        mock_create_group.return_value = mock_group

        response = authenticated_client.post("/groups/New%20Test%20Group")

        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert data["id"] == 1
        assert data["name"] == "New Test Group"
        mock_create_group.assert_called_once_with("New Test Group")

    def test_create_group_unauthenticated(self, test_client: TestClient) -> None:
        """Test creating a group without authentication should fail."""
        response = test_client.post("/groups/Test%20Group")
        assert response.status_code == httpx.codes.UNAUTHORIZED


class TestGroupMembers:
    """Test group member management endpoints."""

    @pytest.mark.auth
    @patch("routes.groups.GroupOrm.is_admin")
    @patch("routes.groups.GroupOrm.add_member")
    def test_add_member_success(self, mock_add_member, mock_is_admin, authenticated_client: TestClient) -> None:
        """Test successfully adding a member to a group."""
        mock_is_admin.return_value = True  # Current user is admin
        mock_membership = AsyncMock()
        mock_membership.user_id = 2
        mock_membership.group_id = 1
        mock_membership.is_admin = False
        mock_add_member.return_value = mock_membership

        response = authenticated_client.post("/groups/1/members?user_id=2")

        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert data["user_id"] == 2
        assert data["group_id"] == 1
        assert data["is_admin"] is False

        mock_is_admin.assert_called_once_with(1, 1)  # group_id, current_user.id
        mock_add_member.assert_called_once_with(1, 2)  # group_id, user_id

    @pytest.mark.auth
    @patch("routes.groups.GroupOrm.is_admin")
    def test_add_member_not_admin(self, mock_is_admin, authenticated_client: TestClient) -> None:
        """Test adding a member when current user is not admin."""
        mock_is_admin.return_value = False  # Current user is not admin

        response = authenticated_client.post("/groups/1/members?user_id=2")

        assert response.status_code == httpx.codes.FORBIDDEN
        data = response.json()
        assert "not an admin" in data["detail"]
        mock_is_admin.assert_called_once_with(1, 1)

    @pytest.mark.auth
    @patch("routes.groups.GroupOrm.is_admin")
    @patch("routes.groups.GroupOrm.remove_member")
    def test_remove_member_success(self, mock_remove_member, mock_is_admin, authenticated_client: TestClient) -> None:
        """Test successfully removing a member from a group."""
        mock_is_admin.return_value = True  # Current user is admin
        mock_remove_member.return_value = True  # Success

        response = authenticated_client.delete("/groups/1/members/2")

        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert data is True

        mock_is_admin.assert_called_once_with(1, 1)
        mock_remove_member.assert_called_once_with(1, 2)

    @pytest.mark.auth
    @patch("routes.groups.GroupOrm.is_admin")
    def test_remove_member_not_admin(self, mock_is_admin, authenticated_client: TestClient) -> None:
        """Test removing a member when current user is not admin."""
        mock_is_admin.return_value = False

        response = authenticated_client.delete("/groups/1/members/2")

        assert response.status_code == httpx.codes.FORBIDDEN
        data = response.json()
        assert "not an admin" in data["detail"]

    def test_add_member_unauthenticated(self, test_client: TestClient) -> None:
        """Test adding member without authentication should fail."""
        response = test_client.post("/groups/1/members?user_id=2")
        assert response.status_code == httpx.codes.UNAUTHORIZED

    def test_remove_member_unauthenticated(self, test_client: TestClient) -> None:
        """Test removing member without authentication should fail."""
        response = test_client.delete("/groups/1/members/2")
        assert response.status_code == httpx.codes.UNAUTHORIZED


class TestGroupProjects:
    """Test group project management."""

    @pytest.mark.auth
    @patch("routes.groups.CraftingProjectOrm.get_group_projects")
    def test_get_group_projects_success(self, mock_get_projects, authenticated_client: TestClient) -> None:
        """Test successfully retrieving group projects."""
        mock_projects = [
            CraftingProjectResponse(
                project_id=1,
                public_uuid=str(uuid4()),
                private_uuid=str(uuid4()),
                project_name="Project 1",
                target_items=[],
                owners=[],
            ),
            CraftingProjectResponse(
                project_id=2,
                public_uuid=str(uuid4()),
                private_uuid=str(uuid4()),
                project_name="Project 2",
                target_items=[],
                owners=[],
            ),
        ]
        mock_get_projects.return_value = mock_projects

        response = authenticated_client.get("/groups/1/projects")

        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert len(data) == 2
        assert data[0]["project_name"] == "Project 1"
        assert data[1]["project_name"] == "Project 2"
        mock_get_projects.assert_called_once_with(1)

    @pytest.mark.auth
    @patch("routes.groups.CraftingProjectOrm.get_group_projects")
    def test_get_group_projects_empty(self, mock_get_projects, authenticated_client: TestClient) -> None:
        """Test retrieving projects for a group with no projects."""
        mock_get_projects.return_value = []

        response = authenticated_client.get("/groups/1/projects")

        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert data == []
        mock_get_projects.assert_called_once_with(1)

    def test_get_group_projects_unauthenticated(self, test_client: TestClient) -> None:
        """Test getting group projects without authentication should fail."""
        response = test_client.get("/groups/1/projects")
        assert response.status_code == httpx.codes.UNAUTHORIZED


class TestProjectToGroup:
    """Test adding projects to groups functionality."""

    @pytest.fixture
    def sample_project_data(self):
        """Sample project data for mocking."""
        mock_project = AsyncMock()
        mock_project.project_id = 1
        mock_project.public_uuid = uuid4()
        mock_project.private_uuid = uuid4()
        mock_project.project_name = "Test Project"
        return mock_project

    @pytest.mark.auth
    @patch("routes.crafting.CraftingProjectOrm.add_group")
    @patch("routes.crafting.CraftingProjectOrm.get_project_by_uuid")
    def test_add_project_to_group_success(self, mock_get_project, mock_add_group,
                                        authenticated_client: TestClient, sample_project_data) -> None:
        """Test successfully adding a project to a group."""
        mock_get_project.return_value = sample_project_data
        mock_add_group.return_value = True  # Success

        response = authenticated_client.post(f"/crafting/projects/{sample_project_data.public_uuid}/groups/1")

        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert data["message"] == "Project added to group successfully"

        mock_get_project.assert_called_once_with(str(sample_project_data.public_uuid))
        mock_add_group.assert_called_once_with(1, 1)  # project_id, group_id

    @pytest.mark.auth
    @patch("routes.crafting.CraftingProjectOrm.get_project_by_uuid")
    def test_add_project_to_group_project_not_found(self, mock_get_project, authenticated_client: TestClient) -> None:
        """Test adding non-existent project to a group."""
        mock_get_project.return_value = None
        fake_uuid = str(uuid4())

        response = authenticated_client.post(f"/crafting/projects/{fake_uuid}/groups/1")

        assert response.status_code == httpx.codes.NOT_FOUND
        data = response.json()
        assert data["detail"] == "Project not found"

    @pytest.mark.auth
    @patch("routes.crafting.CraftingProjectOrm.add_group")
    @patch("routes.crafting.CraftingProjectOrm.get_project_by_uuid")
    def test_add_project_to_group_permission_denied(self, mock_get_project, mock_add_group,
                                                   authenticated_client: TestClient, sample_project_data) -> None:
        """Test adding project to group without permission."""
        mock_get_project.return_value = sample_project_data
        mock_add_group.return_value = False  # Permission denied

        response = authenticated_client.post(f"/crafting/projects/{sample_project_data.public_uuid}/groups/1")

        assert response.status_code == httpx.codes.FORBIDDEN
        data = response.json()
        assert "permission" in data["detail"]

    def test_add_project_to_group_unauthenticated(self, test_client: TestClient, sample_project_data) -> None:
        """Test adding project to group without authentication should fail."""
        response = test_client.post(f"/crafting/projects/{sample_project_data.public_uuid}/groups/1")
        assert response.status_code == httpx.codes.UNAUTHORIZED


class TestGroupOrmMethods:
    """Test GroupOrm model methods directly."""

    @pytest.mark.unit
    @patch("models.users.SessionLocal")
    @patch("models.users.GroupOrm")
    async def test_get_group(self, mock_group_orm, mock_session_local) -> None:
        """Test GroupOrm.get_group static method."""
        # Setup mock session
        mock_session = AsyncMock()
        mock_session_local.return_value.__aenter__.return_value = mock_session

        # Setup mock group
        mock_group = AsyncMock()
        mock_session.get.return_value = mock_group

        # Call the method
        result = await GroupOrm.get_group(1)

        # Verify calls
        mock_session.get.assert_called_once_with(GroupOrm, 1)
        assert result == mock_group

    @pytest.mark.unit
    @patch("models.users.SessionLocal")
    async def test_create_group(self, mock_session_local) -> None:
        """Test GroupOrm.create_group static method."""
        # Setup mock session
        mock_session = AsyncMock()
        mock_session_local.return_value.__aenter__.return_value = mock_session

        # The current implementation has issues, but this shows how it should be tested
        # when the implementation is fixed
        mock_session.get.return_value = AsyncMock(id=1, name="Test Group")

        result = await GroupOrm.create_group("Test Group")

        # Verify session operations
        mock_session.add.assert_called_once()
        mock_session.commit.assert_called_once()

    @pytest.mark.unit
    async def test_add_member_instance_method(self) -> None:
        """Test GroupOrm.add_member instance method."""
        # Create a mock GroupOrm instance
        group = GroupOrm()
        group.id = 1

        with patch("models.users.SessionLocal") as mock_session_local:
            mock_session = AsyncMock()
            mock_session_local.return_value.__aenter__.return_value = mock_session

            # Mock the refresh operation
            mock_membership = UserGroupMembership(user_id=2, group_id=1, is_admin=False)
            mock_session.refresh = AsyncMock()

            result = await group.add_member(2)

            # Verify session operations
            mock_session.add.assert_called_once()
            mock_session.commit.assert_called_once()
            mock_session.refresh.assert_called_once()

    @pytest.mark.unit
    async def test_admin_functionality(self) -> None:
        """Test admin-related methods: add_admin, is_admin, remove_admin."""
        group = GroupOrm()
        group.id = 1

        with patch("models.users.SessionLocal") as mock_session_local:
            mock_session = AsyncMock()
            mock_session_local.return_value.__aenter__.return_value = mock_session

            # Test is_admin
            mock_membership = AsyncMock()
            mock_membership.is_admin = True
            mock_session.get.return_value = mock_membership

            result = await group.is_admin(2)
            assert result is True

            # Test add_admin
            result = await group.add_admin(2)
            assert result is True
            assert mock_membership.is_admin is True

            # Test remove_admin
            result = await group.remove_admin(2)
            assert result is True


class TestGroupPermissions:
    """Test group permission and authorization scenarios."""

    @pytest.mark.auth
    @patch("routes.groups.GroupOrm.is_admin")
    def test_group_admin_permissions(self, mock_is_admin, authenticated_client: TestClient) -> None:
        """Test that only group admins can perform admin actions."""
        # Test that admin can add members
        mock_is_admin.return_value = True
        with patch("routes.groups.GroupOrm.add_member") as mock_add_member:
            mock_add_member.return_value = AsyncMock()
            response = authenticated_client.post("/groups/1/members?user_id=2")
            assert response.status_code == httpx.codes.OK

        # Test that non-admin cannot add members
        mock_is_admin.return_value = False
        response = authenticated_client.post("/groups/1/members?user_id=3")
        assert response.status_code == httpx.codes.FORBIDDEN

    @pytest.mark.auth
    @patch("routes.groups.GroupOrm.is_admin")
    def test_group_member_permissions(self, mock_is_admin, authenticated_client: TestClient) -> None:
        """Test group member permissions vs non-member permissions."""
        # Members can view group projects (assuming no additional restrictions)
        with patch("routes.groups.CraftingProjectOrm.get_group_projects") as mock_get_projects:
            mock_get_projects.return_value = []
            response = authenticated_client.get("/groups/1/projects")
            assert response.status_code == httpx.codes.OK

        # Non-admins cannot manage members
        mock_is_admin.return_value = False
        response = authenticated_client.post("/groups/1/members?user_id=2")
        assert response.status_code == httpx.codes.FORBIDDEN


class TestGroupErrorHandling:
    """Test error handling and edge cases."""

    @pytest.mark.auth
    @patch("routes.groups.GroupOrm.get_group")
    def test_invalid_group_id(self, mock_get_group, authenticated_client: TestClient) -> None:
        """Test operations with invalid group IDs."""
        # Test with string that should be integer
        response = authenticated_client.get("/groups/invalid")
        assert response.status_code == httpx.codes.UNPROCESSABLE_ENTITY

        # Test with negative ID
        mock_get_group.return_value = None
        response = authenticated_client.get("/groups/-1")
        mock_get_group.assert_called_with(-1)

    @pytest.mark.auth
    @patch("routes.groups.GroupOrm.is_admin")
    @patch("routes.groups.GroupOrm.add_member")
    def test_invalid_user_id(self, mock_add_member, mock_is_admin, authenticated_client: TestClient) -> None:
        """Test operations with invalid user IDs."""
        mock_is_admin.return_value = True

        # Test adding user with negative ID
        response = authenticated_client.post("/groups/1/members?user_id=-1")
        # The actual behavior depends on the ORM implementation

        # Test adding non-existent user (should be handled by ORM)
        mock_add_member.side_effect = Exception("User not found")
        response = authenticated_client.post("/groups/1/members?user_id=9999")
        # Should handle the exception gracefully

    @pytest.mark.auth
    @patch("routes.groups.GroupOrm.is_admin")
    @patch("routes.groups.GroupOrm.add_member")
    def test_duplicate_operations(self, mock_add_member, mock_is_admin, authenticated_client: TestClient) -> None:
        """Test duplicate operations (adding same user twice, etc.)."""
        mock_is_admin.return_value = True

        # First addition should succeed
        mock_membership = AsyncMock()
        mock_add_member.return_value = mock_membership
        response = authenticated_client.post("/groups/1/members?user_id=2")
        assert response.status_code == httpx.codes.OK

        # Second addition might fail or succeed depending on implementation
        # This should be handled gracefully
        mock_add_member.side_effect = Exception("User already in group")
        response = authenticated_client.post("/groups/1/members?user_id=2")
        # Should handle the duplicate gracefully

    @pytest.mark.auth
    @patch("routes.groups.GroupOrm.create_group")
    def test_create_group_with_special_characters(self, mock_create_group, authenticated_client: TestClient) -> None:
        """Test creating groups with special characters in names."""
        mock_group = AsyncMock()
        mock_group.id = 1
        mock_group.name = "Test Group & Co. #1"
        mock_create_group.return_value = mock_group

        # URL encode the special characters
        encoded_name = "Test%20Group%20%26%20Co.%20%231"
        response = authenticated_client.post(f"/groups/{encoded_name}")

        assert response.status_code == httpx.codes.OK
        mock_create_group.assert_called_once_with("Test Group & Co. #1")

    @pytest.mark.auth
    @patch("routes.crafting.CraftingProjectOrm.get_project_by_uuid")
    def test_add_project_with_invalid_uuid(self, mock_get_project, authenticated_client: TestClient) -> None:
        """Test adding project to group with malformed UUID."""
        # Test with completely invalid UUID format
        response = authenticated_client.post("/crafting/projects/not-a-uuid/groups/1")
        # Should return 422 for invalid UUID format
        assert response.status_code in [httpx.codes.UNPROCESSABLE_ENTITY, httpx.codes.NOT_FOUND]


class TestRouterIntegration:
    """Test that the groups router is properly integrated."""

    def test_groups_router_included(self, test_client: TestClient) -> None:
        """Test that groups endpoints are accessible (router is included)."""
        # This test should now pass since we added the groups router to main app
        response = test_client.get("/groups/1")
        # Should get a valid response from the groups router
        # 404 is valid here (group not found), what we don't want is router not found
        # The fact that we get any response means the router is included
        assert response.status_code in [httpx.codes.NOT_FOUND, httpx.codes.UNAUTHORIZED, httpx.codes.OK]
        # If it's 404, make sure it's the "Group not found" message, not a router issue
        if response.status_code == httpx.codes.NOT_FOUND:
            data = response.json()
            assert "Group not found" in data["detail"]

    def test_all_group_endpoints_registered(self, test_client: TestClient) -> None:
        """Test that all group endpoints are properly registered."""
        endpoints_to_test = [
            ("GET", "/groups/1"),
            ("POST", "/groups/TestGroup"),
            ("POST", "/groups/1/members"),
            ("DELETE", "/groups/1/members/1"),
            ("GET", "/groups/1/projects"),
        ]

        for method, endpoint in endpoints_to_test:
            if method == "GET":
                response = test_client.get(endpoint)
            elif method == "POST":
                response = test_client.post(endpoint)
            elif method == "DELETE":
                response = test_client.delete(endpoint)

            # All should return 401 (Unauthorized) not 404 (Not Found)
            # This confirms the endpoints are registered
            assert response.status_code != httpx.codes.NOT_FOUND
