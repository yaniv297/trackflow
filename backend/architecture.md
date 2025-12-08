# TrackFlow Backend Architecture

## Overview

TrackFlow backend is a music management system built with FastAPI, SQLAlchemy, and PostgreSQL/SQLite. It follows a layered architecture pattern with clear separation of concerns.

## Technology Stack

- **Framework**: FastAPI 0.104.1 with Uvicorn
- **Database**: SQLAlchemy 2.0.23 with SQLite (dev) / PostgreSQL (prod)  
- **Authentication**: JWT with python-jose and bcrypt
- **File Storage**: Cloudinary for media assets
- **External APIs**: Spotify integration via spotipy
- **Deployment**: Railway with Docker

## Project Structure

```
backend/
├── main.py                 # FastAPI app entry point
├── database.py             # Database configuration & session management
├── models.py              # SQLAlchemy ORM models
├── schemas.py             # Pydantic schemas for API contracts
├── auth.py                # Authentication utilities
├── api/                   # API route modules
│   ├── [module]/          # Feature-based module organization
│   │   ├── __init__.py    
│   │   ├── router.py      # Route definitions (newer modules)
│   │   ├── routes/        # Route handlers (some modules)
│   │   ├── services/      # Business logic layer
│   │   ├── repositories/  # Data access layer  
│   │   └── validators/    # Input validation logic
│   ├── songs.py           # Legacy monolithic route file
│   ├── auth.py           # Authentication routes
│   ├── packs.py          # Pack management routes
│   └── ...               # Other feature modules
├── services/             # Shared business services
├── migrations/           # Database migration scripts
├── tools/               # Utility scripts
└── tests/              # Test suite
```

## Architecture Patterns

### 1. Layered Architecture (New Modules)

Modern modules (e.g., `album_series`, `songs`, `achievements`) follow a clean layered approach:

- **Routes Layer** (`routes/` or `router.py`): Handle HTTP requests/responses
- **Services Layer** (`services/`): Business logic and orchestration  
- **Repository Layer** (`repositories/`): Data access and queries
- **Validators Layer** (`validators/`): Input validation and business rules

### 2. Legacy Monolithic Pattern

Older modules are organized as single files (e.g., `auth.py`, `packs.py`) containing all layers mixed together.

## Database Architecture

### Core Models

- **User**: User accounts with authentication
- **Song**: Individual tracks with metadata and status
- **Pack**: Collections of songs for distribution  
- **AlbumSeries**: Organized song collections with metadata
- **Collaboration**: Multi-user song projects
- **Achievement**: User progress tracking system

### Key Design Patterns

- **SafeDateTime**: Custom SQLAlchemy type handling empty string edge cases
- **Soft Enums**: String-based enums for status fields (SongStatus, PostType, etc.)
- **Relationship Mapping**: Extensive use of SQLAlchemy relationships
- **Indexing**: Performance indexes on frequently queried columns

## API Design Conventions

### Request/Response Flow

1. **Route Handler**: Validates request, extracts user context
2. **Service Layer**: Implements business logic, calls repositories  
3. **Repository Layer**: Executes database operations
4. **Response**: Pydantic schemas ensure consistent API contracts

### Authentication

- JWT token-based authentication
- Dependency injection via FastAPI's `Depends`
- User context passed through service layers
- Admin-only endpoints protected with role checks

### Error Handling

- HTTP exceptions with proper status codes
- Database transaction rollbacks on errors
- Graceful degradation for external service failures

## Database Management

### Connection Handling

- Connection pooling with SQLAlchemy engine
- Dependency injection for database sessions
- Automatic rollback on exceptions
- Pool recycling for Railway deployment stability

### Migrations

- Custom migration scripts in `migrations/` directory
- Safe migration execution without blocking server startup
- Environment-aware migration behavior (SQLite vs PostgreSQL)

## Development Patterns

### Code Organization Rules

1. **Prefer layered architecture** for new features
2. **Repository pattern** for all database access
3. **Service layer** for business logic orchestration
4. **Pydantic schemas** for all API contracts
5. **Type hints** throughout the codebase

### Database Patterns

1. **Always use repository methods** for database access
2. **Implement proper error handling** in services
3. **Use transactions** for multi-operation workflows
4. **Index frequently queried columns** for performance
5. **Use SafeDateTime** for datetime fields to handle edge cases

### Security Patterns

1. **Never expose raw database models** in API responses
2. **Always validate user permissions** before data access
3. **Use bcrypt** for password hashing
4. **Implement proper CORS** configuration
5. **Environment-based configuration** via .env files

## External Integrations

### Spotify API

- OAuth2 client credentials flow
- Track metadata enrichment
- Album/artist information lookup
- Rate limiting and error handling

### Cloudinary

- Image and audio file storage
- URL-based asset management
- Automatic optimization and delivery

## Testing Architecture

- **Unit tests** for individual components
- **Integration tests** for API endpoints  
- **Database tests** with transaction rollbacks
- **Test coverage** tracking with coverage.xml

## Performance Considerations

### Database Optimizations

- Connection pooling with appropriate limits
- Query optimization with proper indexes
- Eager loading for related data
- Query result pagination for large datasets

### API Optimizations  

- GZip compression middleware
- Request timeout handling
- Pool configuration for concurrent requests
- Graceful error handling to prevent cascading failures

## Deployment

### Environment Configuration

- Railway-optimized connection settings
- Environment variable-based configuration
- Docker containerization with health checks
- Automatic database initialization

### Scaling Considerations

- Single worker deployment for memory efficiency
- Connection pool tuning for concurrent access
- Request concurrency limiting
- Database connection recycling

## AI Development Guidelines

### When Adding New Features

1. **Follow layered architecture** - create service and repository layers
2. **Use existing patterns** - look at `album_series` or `songs` modules as examples
3. **Implement proper validation** - both Pydantic schema and business rule validation
4. **Add proper error handling** - use HTTP exceptions with meaningful messages
5. **Update database models** carefully - consider migration impact

### Database Best Practices

1. **Always use SafeDateTime** for datetime fields
2. **Add proper indexes** for query performance
3. **Use relationship loading strategies** (joinedload, selectinload) appropriately
4. **Handle database errors gracefully** - rollback transactions on failures

### Code Quality Standards

1. **Type hints are mandatory** for all new code
2. **Follow existing naming conventions** - snake_case for Python, camelCase for API
3. **Document complex business logic** with clear comments
4. **Test all new functionality** with appropriate test coverage
5. **Use repository pattern** - never raw database queries in route handlers