# BitCraft API Tests

This directory contains comprehensive tests for the BitCraft API search endpoints.

## Test Structure

- `test_search.py` - Main test suite for search functionality
- `conftest.py` - Pytest configuration and fixtures
- `api_requests_log.json` - Generated log of API requests for LLM analysis

## Running Tests

### All Tests
```bash
pytest
```

### Specific Test Classes
```bash
pytest tests/test_search.py::TestItemSearch
pytest tests/test_search.py::TestBuildingSearch
pytest tests/test_search.py::TestCargoSearch
```

### Specific Tests
```bash
pytest tests/test_search.py::TestItemSearch::test_search_items_basic
```

### With Coverage
```bash
pytest --cov=api tests/
```

### Verbose Output
```bash
pytest -v
```

## Test Categories

### TestAPIConnection
Tests basic API connectivity and root endpoint.

### TestItemSearch
Tests item search functionality with various parameters.

### TestBuildingSearch
Tests building search functionality.

### TestCargoSearch
Tests cargo search functionality.

### TestSearchAll
Tests searching across all categories simultaneously.

### TestBestMatch
Tests best match functionality with fuzzy matching.

### TestComprehensiveSearch
Comprehensive tests using parametrized queries to test multiple scenarios.

### TestErrorHandling
Tests error handling and edge cases.

## Request Logging

The test suite automatically captures all API requests and responses to `api_requests_log.json`. This log file is designed to provide comprehensive examples of API usage for LLM analysis when building the web UI.

## Demo Mode

You can run the demo function directly:
```bash
python tests/test_search.py
```

This will run a quick demonstration of the API functionality without pytest. 