import pytest
from fastapi.testclient import TestClient

@pytest.mark.unit
def test_random_items_endpoint(test_client: TestClient):
    resp = test_client.get("/items/random?count=3")
    assert resp.status_code == 200
    data = resp.json()
    assert set(data.keys()) >= {"items", "buildings", "cargo", "query"}

@pytest.mark.unit
def test_items_search_requires_query_param(test_client: TestClient):
    resp = test_client.get("/items/search")
    assert resp.status_code == 422
