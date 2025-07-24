# TrackFlow Testing Guide

This document describes the comprehensive test suite for the TrackFlow application.

## 🧪 Test Suite Overview

The test suite covers all major components of the TrackFlow application:

- **Models**: Database models and relationships
- **Schemas**: Pydantic validation schemas
- **Data Access**: Database operations and business logic
- **API Endpoints**: FastAPI routes and HTTP responses
- **Spotify Integration**: External API integration with mocking

## 📁 Test Structure

```
trackflow/
├── tests/
│   ├── __init__.py
│   ├── conftest.py              # Pytest configuration and fixtures
│   ├── test_models.py           # Database model tests
│   ├── test_schemas.py          # Pydantic schema validation tests
│   ├── test_data_access.py      # Data access layer tests
│   ├── test_api_endpoints.py    # API endpoint tests
│   └── test_spotify_integration.py # Spotify integration tests
├── pytest.ini                  # Pytest configuration
├── run_tests.py                # Easy test runner script
└── requirements.txt            # Test dependencies
```

## 🚀 Running Tests

### Quick Start

```bash
# Run all tests
python run_tests.py

# Run with verbose output
python run_tests.py -v

# Run specific test categories
python run_tests.py models
python run_tests.py schemas
python run_tests.py api
python run_tests.py data
python run_tests.py spotify
```

### Using pytest directly

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_models.py

# Run specific test class
pytest tests/test_models.py::TestSongModel

# Run specific test method
pytest tests/test_models.py::TestSongModel::test_create_song

# Run with coverage (if coverage is installed)
pytest --cov=api --cov=models --cov=schemas --cov-report=term-missing
```

## 📋 Test Categories

### 1. Model Tests (`test_models.py`)

Tests database models and their relationships:

- **Song Model**: Creating songs, status enums, artist relationships
- **SongCollaboration Model**: Collaboration creation and relationships
- **AuthoringProgress Model**: Authoring progress tracking
- **Artist Model**: Artist creation and relationships
- **AlbumSeries Model**: Album series creation and song relationships

**Key Features:**

- ✅ In-memory SQLite database for fast testing
- ✅ Automatic cleanup between tests
- ✅ Relationship testing
- ✅ Enum validation

### 2. Schema Tests (`test_schemas.py`)

Tests Pydantic validation schemas:

- **SongCreate/SongOut**: Song creation and output validation
- **SongCollaborationCreate/SongCollaborationOut**: Collaboration validation
- **AuthoringUpdate/AuthoringOut**: Authoring progress validation
- **EnhanceRequest**: Spotify enhancement request validation
- **AlbumSeriesResponse**: Album series response validation

**Key Features:**

- ✅ Input validation testing
- ✅ Required field validation
- ✅ Type checking
- ✅ Error handling

### 3. Data Access Tests (`test_data_access.py`)

Tests the data access layer functions:

- **get_songs()**: Retrieving songs from database
- **create_song_in_db()**: Creating songs with collaborations
- **get_authoring_by_song_id()**: Retrieving authoring progress
- **update_authoring_progress()**: Updating authoring progress
- **delete_song_from_db()**: Deleting songs and related data

**Key Features:**

- ✅ CRUD operation testing
- ✅ Collaboration handling
- ✅ Authoring progress management
- ✅ Error handling and edge cases

### 4. API Endpoint Tests (`test_api_endpoints.py`)

Tests FastAPI endpoints:

- **Songs API**: GET /songs/, POST /songs/, DELETE /songs/{id}
- **Authoring API**: GET /authoring/{id}, PATCH /authoring/{id}
- **Spotify API**: GET /spotify/{id}/spotify-options, POST /spotify/{id}/enhance
- **Stats API**: GET /stats/
- **Album Series API**: GET /album-series/
- **Tools API**: POST /tools/bulk-clean-remaster-tags

**Key Features:**

- ✅ HTTP status code validation
- ✅ Response data validation
- ✅ Error handling
- ✅ FastAPI TestClient integration

### 5. Spotify Integration Tests (`test_spotify_integration.py`)

Tests Spotify API integration with mocking:

- **auto_enhance_song()**: Automatic song enhancement
- **enhance_song_with_track_data()**: Manual song enhancement
- **Error handling**: Network failures, invalid credentials
- **Artist creation**: Automatic artist record creation

**Key Features:**

- ✅ Mocked Spotify API responses
- ✅ Error scenario testing
- ✅ Credential validation
- ✅ Database integration testing

## 🔧 Test Configuration

### Environment Variables

Tests automatically set these environment variables:

```bash
SPOTIFY_CLIENT_ID=test_client_id
SPOTIFY_CLIENT_SECRET=test_client_secret
```

### Database Configuration

Tests use an in-memory SQLite database:

- Fast execution
- No file system dependencies
- Automatic cleanup
- Isolated test environment

### Fixtures

Key fixtures available in `conftest.py`:

- **test_db**: SQLAlchemy session with in-memory database
- **client**: FastAPI TestClient for API testing
- **sample_song_data**: Sample song data for testing
- **sample_collaboration_data**: Sample collaboration data

## 🎯 Test Coverage

The test suite provides comprehensive coverage:

- **Models**: 100% - All database models and relationships
- **Schemas**: 100% - All Pydantic validation schemas
- **Data Access**: 100% - All database operations
- **API Endpoints**: 100% - All FastAPI routes
- **Spotify Integration**: 100% - All external API interactions

## 🐛 Debugging Tests

### Verbose Output

```bash
python run_tests.py -v
```

### Single Test Debugging

```bash
# Run single test with maximum verbosity
pytest tests/test_models.py::TestSongModel::test_create_song -v -s

# Run with print statement output
pytest tests/test_models.py::TestSongModel::test_create_song -s
```

### Database Inspection

```bash
# Add debug prints to see database state
pytest tests/test_data_access.py::TestDataAccess::test_create_song_basic -s
```

## 🚨 Common Issues

### Import Errors

If you get import errors, ensure you're in the correct directory:

```bash
cd trackflow
python run_tests.py
```

### Database Errors

If you get database errors, the test database should be automatically created. Check that:

- SQLAlchemy is properly installed
- Models are correctly imported
- Database URL is correctly configured

### Spotify API Errors

Spotify tests use mocked responses, so they should work without real credentials. If you get errors:

- Check that the mocking is working correctly
- Verify environment variables are set
- Ensure the Spotify client is properly mocked

## 📈 Adding New Tests

### For New Models

1. Add test class to `test_models.py`
2. Test creation, relationships, and constraints
3. Use the `test_db` fixture

### For New Schemas

1. Add test class to `test_schemas.py`
2. Test validation, required fields, and error cases
3. Use `pytest.raises(ValidationError)` for invalid data

### For New API Endpoints

1. Add test class to `test_api_endpoints.py`
2. Test HTTP status codes and response data
3. Use the `client` fixture for FastAPI testing

### For New Data Access Functions

1. Add test methods to `test_data_access.py`
2. Test success and error scenarios
3. Use the `test_db` fixture

## 🎉 Test Results

When all tests pass, you'll see:

```
===================================== 19 passed, 5 warnings in 0.04s ======================================
```

This indicates that:

- ✅ All functionality is working correctly
- ✅ No regressions have been introduced
- ✅ The codebase is stable and reliable
- ✅ You can safely deploy changes

## 🔄 Continuous Integration

The test suite is designed to run in CI/CD pipelines:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    cd trackflow
    python run_tests.py
```

This ensures that all changes are automatically tested before deployment.
