"""
Test suite for BitCraft API search endpoints.
Uses FastAPI TestClient for testing API endpoints and validates responses against expected results from helper functions.
"""


import httpx
import pytest  # type: ignore[import-untyped]
from fastapi.testclient import TestClient

from api import app
from helpers import (
    fuzzy_search_all,
    fuzzy_search_buildings,
    fuzzy_search_cargo,
    fuzzy_search_items,
    get_best_match,
)


@pytest.fixture
def client() -> TestClient:
    """Create FastAPI test client."""
    return TestClient(app)


class TestAPIConnection:
    """Test basic API connectivity and root endpoint."""

    def test_root_endpoint(self, client: TestClient) -> None:
        """Test the root endpoint returns expected message."""
        response = client.get("/")

        assert response.status_code == httpx.codes.OK
        assert response.json() == {"message": "BitCraft Planner API"}


class TestItemSearch:
    """Test item search functionality."""

    def test_search_items_basic(self, client: TestClient) -> None:
        """Test basic item search functionality and validate against helper function results."""
        query = "wood"
        expected_results = fuzzy_search_items(query)

        response = client.get("/search/items", params={"query": query})

        assert response.status_code == httpx.codes.OK
        data = response.json()

        # Validate response structure
        assert "results" in data
        assert "query" in data
        assert "search_type" in data
        assert data["query"] == query
        assert data["search_type"] == "items"
        assert isinstance(data["results"], list)

        # Validate results match expected from helper function
        assert len(data["results"]) == len(expected_results)
        for i, result in enumerate(data["results"]):
            expected_name, expected_score, expected_id = expected_results[i]
            assert result["name"] == expected_name
            assert result["score"] == expected_score
            assert result["id"] == expected_id
            assert result["type"] == "item"

    def test_search_items_with_params(self, client: TestClient) -> None:
        """Test item search with custom parameters."""
        query = "wood"
        limit = 3
        score_cutoff = 50.0
        expected_results = fuzzy_search_items(query, limit, score_cutoff)

        params: dict[str, str | int | float] = {"query": query, "limit": limit, "score_cutoff": score_cutoff}
        response = client.get("/search/items", params=params)

        assert response.status_code == httpx.codes.OK
        data = response.json()

        # Validate results match expected from helper function
        assert len(data["results"]) == len(expected_results)
        assert len(data["results"]) <= limit

        for i, result in enumerate(data["results"]):
            expected_name, expected_score, expected_id = expected_results[i]
            assert result["name"] == expected_name
            assert result["score"] == expected_score
            assert result["id"] == expected_id
            assert result["score"] >= score_cutoff

    def test_search_items_no_results(self, client: TestClient) -> None:
        """Test item search with query that should return no results."""
        query = "nonexistentitem123"
        expected_results = fuzzy_search_items(query)

        response = client.get("/search/items", params={"query": query})

        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert len(data["results"]) == len(expected_results)
        assert data["results"] == []


class TestBuildingSearch:
    """Test building search functionality."""

    def test_search_buildings_basic(self, client: TestClient) -> None:
        """Test basic building search functionality and validate against helper function results."""
        query = "house"
        expected_results = fuzzy_search_buildings(query)

        response = client.get("/search/buildings", params={"query": query})

        assert response.status_code == httpx.codes.OK
        data = response.json()

        # Validate response structure
        assert "results" in data
        assert data["query"] == query
        assert data["search_type"] == "buildings"

        # Validate results match expected from helper function
        assert len(data["results"]) == len(expected_results)
        for i, result in enumerate(data["results"]):
            expected_name, expected_score, expected_id = expected_results[i]
            assert result["name"] == expected_name
            assert result["score"] == expected_score
            assert result["id"] == expected_id
            assert result["type"] == "building"

    def test_search_buildings_with_params(self, client: TestClient) -> None:
        """Test building search with custom parameters."""
        query = "house"
        limit = 2
        score_cutoff = 60.0
        expected_results = fuzzy_search_buildings(query, limit, score_cutoff)

        params: dict[str, str | int | float] = {"query": query, "limit": limit, "score_cutoff": score_cutoff}
        response = client.get("/search/buildings", params=params)

        assert response.status_code == httpx.codes.OK
        data = response.json()

        # Validate results match expected from helper function
        assert len(data["results"]) == len(expected_results)
        assert len(data["results"]) <= limit


class TestCargoSearch:
    """Test cargo search functionality."""

    def test_search_cargo_basic(self, client: TestClient) -> None:
        """Test basic cargo search functionality and validate against helper function results."""
        query = "stone"
        expected_results = fuzzy_search_cargo(query)

        response = client.get("/search/cargo", params={"query": query})

        assert response.status_code == httpx.codes.OK
        data = response.json()

        # Validate response structure
        assert "results" in data
        assert data["query"] == query
        assert data["search_type"] == "cargo"

        # Validate results match expected from helper function
        assert len(data["results"]) == len(expected_results)
        for i, result in enumerate(data["results"]):
            expected_name, expected_score, expected_id = expected_results[i]
            assert result["name"] == expected_name
            assert result["score"] == expected_score
            assert result["id"] == expected_id
            assert result["type"] == "cargo"

    def test_search_cargo_with_params(self, client: TestClient) -> None:
        """Test cargo search with custom parameters."""
        query = "stone"
        limit = 4
        score_cutoff = 55.0
        expected_results = fuzzy_search_cargo(query, limit, score_cutoff)

        params: dict[str, str | int | float] = {"query": query, "limit": limit, "score_cutoff": score_cutoff}
        response = client.get("/search/cargo", params=params)

        assert response.status_code == httpx.codes.OK
        data = response.json()

        # Validate results match expected from helper function
        assert len(data["results"]) == len(expected_results)
        assert len(data["results"]) <= limit


class TestSearchAll:
    """Test search across all categories."""

    def test_search_all_basic(self, client: TestClient) -> None:
        """Test basic search across all categories and validate against helper function results."""
        query = "iron"
        expected_results = fuzzy_search_all(query)

        response = client.get("/search/all", params={"query": query})

        assert response.status_code == httpx.codes.OK
        data = response.json()

        # Validate response structure
        assert "query" in data
        assert "items" in data
        assert "buildings" in data
        assert "cargo" in data
        assert data["query"] == query

        # Validate each category matches expected results
        for category in ["items", "buildings", "cargo"]:
            assert isinstance(data[category], list)
            expected_category_results = expected_results[category]
            assert len(data[category]) == len(expected_category_results)

            for i, result in enumerate(data[category]):
                expected_name, expected_score, expected_id = expected_category_results[i]
                assert result["name"] == expected_name
                assert result["score"] == expected_score
                assert result["id"] == expected_id
                assert result["type"] == category.rstrip("s")  # Remove 's' to match singular form

    def test_search_all_with_params(self, client: TestClient) -> None:
        """Test search all with custom parameters."""
        query = "iron"
        limit = 2
        score_cutoff = 50.0
        expected_results = fuzzy_search_all(query, limit, score_cutoff)

        params: dict[str, str | int | float] = {"query": query, "limit": limit, "score_cutoff": score_cutoff}
        response = client.get("/search/all", params=params)

        assert response.status_code == httpx.codes.OK
        data = response.json()

        # Validate each category matches expected results
        for category in ["items", "buildings", "cargo"]:
            expected_category_results = expected_results[category]
            assert len(data[category]) == len(expected_category_results)
            assert len(data[category]) <= limit

            for i, result in enumerate(data[category]):
                expected_name, expected_score, expected_id = expected_category_results[i]
                assert result["name"] == expected_name
                assert result["score"] == expected_score
                assert result["id"] == expected_id
                assert result["score"] >= score_cutoff


class TestBestMatch:
    """Test best match functionality."""

    def test_best_match_basic(self, client: TestClient) -> None:
        """Test basic best match functionality and validate against helper function results."""
        query = "sword"
        expected_result = get_best_match(query)

        response = client.get("/search/best", params={"query": query})

        assert response.status_code == httpx.codes.OK
        data = response.json()

        if expected_result:
            expected_name, expected_score, expected_id, expected_type = expected_result
            assert data is not None
            assert data["name"] == expected_name
            assert data["score"] == expected_score
            assert data["id"] == expected_id
            assert data["type"] == expected_type
        else:
            assert data is None

    def test_best_match_with_search_type(self, client: TestClient) -> None:
        """Test best match with specific search type."""
        query = "sword"
        search_type = "items"
        expected_result = get_best_match(query, search_type)

        params: dict[str, str] = {"query": query, "search_type": search_type}
        response = client.get("/search/best", params=params)

        assert response.status_code == httpx.codes.OK
        data = response.json()

        if expected_result:
            expected_name, expected_score, expected_id, expected_type = expected_result
            assert data is not None
            assert data["name"] == expected_name
            assert data["score"] == expected_score
            assert data["id"] == expected_id
            assert data["type"] == expected_type
        else:
            assert data is None

    def test_best_match_invalid_search_type(self, client: TestClient) -> None:
        """Test best match with invalid search type."""
        params: dict[str, str] = {"query": "sword", "search_type": "invalid"}
        response = client.get("/search/best", params=params)

        assert response.status_code == httpx.codes.BAD_REQUEST
        assert "search_type must be one of" in response.json()["detail"]

    def test_best_match_typo_correction(self, client: TestClient) -> None:
        """Test best match with intentional typo (fuzzy matching)."""
        query = "sward"  # typo for "sword"
        expected_result = get_best_match(query)

        response = client.get("/search/best", params={"query": query})

        assert response.status_code == httpx.codes.OK
        data = response.json()

        if expected_result:
            expected_name, expected_score, expected_id, expected_type = expected_result
            assert data is not None
            assert data["name"] == expected_name
            assert data["score"] == expected_score
            assert data["id"] == expected_id
            assert data["type"] == expected_type
        else:
            assert data is None


class TestComprehensiveSearch:
    """Comprehensive tests that exercise multiple endpoints."""

    @pytest.mark.parametrize("query", [
        "wood", "stone", "iron", "gold", "copper",
        "house", "castle", "farm", "mine", "workshop",
        "sword", "pickaxe", "hammer", "bow", "shield",
    ])
    def test_comprehensive_search_queries(self, client: TestClient, query: str) -> None:
        """Test various search queries across all endpoints and validate against helper functions."""
        # Test items endpoint
        expected_items = fuzzy_search_items(query)
        response = client.get("/search/items", params={"query": query})
        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert len(data["results"]) == len(expected_items)

        # Test buildings endpoint
        expected_buildings = fuzzy_search_buildings(query)
        response = client.get("/search/buildings", params={"query": query})
        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert len(data["results"]) == len(expected_buildings)

        # Test cargo endpoint
        expected_cargo = fuzzy_search_cargo(query)
        response = client.get("/search/cargo", params={"query": query})
        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert len(data["results"]) == len(expected_cargo)

        # Test all endpoint
        expected_all = fuzzy_search_all(query)
        response = client.get("/search/all", params={"query": query})
        assert response.status_code == httpx.codes.OK
        data = response.json()
        assert len(data["items"]) == len(expected_all["items"])
        assert len(data["buildings"]) == len(expected_all["buildings"])
        assert len(data["cargo"]) == len(expected_all["cargo"])

        # Test best endpoint
        expected_best = get_best_match(query)
        response = client.get("/search/best", params={"query": query})
        assert response.status_code == httpx.codes.OK
        data = response.json()
        if expected_best:
            assert data is not None
        else:
            assert data is None

    def test_search_parameter_variations(self, client: TestClient) -> None:
        """Test different parameter combinations and validate against helper functions."""
        test_cases = [
            {"query": "wood", "limit": 1, "score_cutoff": 70.0},
            {"query": "wood", "limit": 10, "score_cutoff": 30.0},
            {"query": "wood", "limit": 5, "score_cutoff": 60.0},
        ]

        for test_case in test_cases:
            query = str(test_case["query"])
            limit: int = test_case["limit"]  # type: ignore[assignment]
            score_cutoff: float = test_case["score_cutoff"]  # type: ignore[assignment]

            expected_results = fuzzy_search_items(query, limit, score_cutoff)
            params: dict[str, str | int | float] = {"query": query, "limit": limit, "score_cutoff": score_cutoff}
            response = client.get("/search/items", params=params)

            assert response.status_code == httpx.codes.OK
            data = response.json()

            # Validate results match expected from helper function
            assert len(data["results"]) == len(expected_results)
            assert len(data["results"]) <= limit

            for i, result in enumerate(data["results"]):
                expected_name, expected_score, expected_id = expected_results[i]
                assert result["name"] == expected_name
                assert result["score"] == expected_score
                assert result["id"] == expected_id
                assert result["score"] >= score_cutoff


class TestErrorHandling:
    """Test error handling and edge cases."""

    def test_missing_query_parameter(self, client: TestClient) -> None:
        """Test endpoints with missing query parameter."""
        response = client.get("/search/items")
        assert response.status_code == httpx.codes.UNPROCESSABLE_ENTITY  # Validation error

    def test_invalid_parameter_types(self, client: TestClient) -> None:
        """Test with invalid parameter types."""
        params: dict[str, str] = {"query": "wood", "limit": "invalid", "score_cutoff": "invalid"}
        response = client.get("/search/items", params=params)
        assert response.status_code == httpx.codes.UNPROCESSABLE_ENTITY  # Validation error

    def test_empty_query(self, client: TestClient) -> None:
        """Test with empty query string and validate against helper function."""
        query = ""
        expected_results = fuzzy_search_items(query)

        response = client.get("/search/items", params={"query": query})

        assert response.status_code == httpx.codes.OK
        data = response.json()

        # Validate results match expected from helper function
        assert "results" in data
        assert isinstance(data["results"], list)
        assert len(data["results"]) == len(expected_results)


class TestDataConsistency:
    """Test consistency between helper functions and API responses."""

    def test_items_consistency(self, client: TestClient) -> None:
        """Test that items endpoint returns exactly what the helper function returns."""
        test_queries = ["wood", "stone", "iron", "sword", "pickaxe"]

        for query in test_queries:
            expected_results = fuzzy_search_items(query)
            response = client.get("/search/items", params={"query": query})

            assert response.status_code == httpx.codes.OK
            data = response.json()

            assert len(data["results"]) == len(expected_results)
            for i, result in enumerate(data["results"]):
                expected_name, expected_score, expected_id = expected_results[i]
                assert result["name"] == expected_name
                assert result["score"] == expected_score
                assert result["id"] == expected_id

    def test_buildings_consistency(self, client: TestClient) -> None:
        """Test that buildings endpoint returns exactly what the helper function returns."""
        test_queries = ["house", "castle", "farm", "mine", "workshop"]

        for query in test_queries:
            expected_results = fuzzy_search_buildings(query)
            response = client.get("/search/buildings", params={"query": query})

            assert response.status_code == httpx.codes.OK
            data = response.json()

            assert len(data["results"]) == len(expected_results)
            for i, result in enumerate(data["results"]):
                expected_name, expected_score, expected_id = expected_results[i]
                assert result["name"] == expected_name
                assert result["score"] == expected_score
                assert result["id"] == expected_id

    def test_cargo_consistency(self, client: TestClient) -> None:
        """Test that cargo endpoint returns exactly what the helper function returns."""
        test_queries = ["stone", "wood", "iron", "gold", "copper"]

        for query in test_queries:
            expected_results = fuzzy_search_cargo(query)
            response = client.get("/search/cargo", params={"query": query})

            assert response.status_code == httpx.codes.OK
            data = response.json()

            assert len(data["results"]) == len(expected_results)
            for i, result in enumerate(data["results"]):
                expected_name, expected_score, expected_id = expected_results[i]
                assert result["name"] == expected_name
                assert result["score"] == expected_score
                assert result["id"] == expected_id

    def test_best_match_consistency(self, client: TestClient) -> None:
        """Test that best match endpoint returns exactly what the helper function returns."""
        test_queries = ["sword", "house", "stone", "pickaxe", "farm"]

        for query in test_queries:
            expected_result = get_best_match(query)
            response = client.get("/search/best", params={"query": query})

            assert response.status_code == httpx.codes.OK
            data = response.json()

            if expected_result:
                expected_name, expected_score, expected_id, expected_type = expected_result
                assert data is not None
                assert data["name"] == expected_name
                assert data["score"] == expected_score
                assert data["id"] == expected_id
                assert data["type"] == expected_type
            else:
                assert data is None
