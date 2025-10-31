# Inkinki Smart School API

A FastAPI application with PostgreSQL and Redis integration for the Inkinki Smart School project.

## Features

- 🚀 FastAPI framework for high-performance API
- 🐘 PostgreSQL database for data persistence
- 🔴 Redis for caching and session management
- 📊 Health check endpoints
- 🧪 Test endpoints to verify all connections
- 🐳 Docker Compose for easy service management

## Prerequisites

- Python 3.8+
- Docker and Docker Compose
- pip (Python package manager)

## Environment Configuration

The application uses environment variables for configuration. You can create a `.env` file in the server directory with your custom settings:

```bash
# Copy the template and customize it
cp env_template.txt .env
```

### Key Environment Variables

- **DATABASE_URL**: PostgreSQL connection string
- **REDIS_URL**: Redis connection string
- **SECRET_KEY**: Secret key for JWT tokens (change in production)
- **DEBUG**: Enable/disable debug mode
- **HOST/PORT**: Server host and port
- **CORS_ORIGINS**: Allowed CORS origins (comma-separated)

## Quick Start

### 1. Setup Environment

```bash
# Make setup script executable
chmod +x setup.py

# Run setup script
python3 setup.py
```

### 2. Manual Setup (Alternative)

```bash
# Install Python dependencies
pip3 install -r requirements.txt

# Start PostgreSQL and Redis services
docker-compose up -d

# Wait for services to be ready (about 10 seconds)
sleep 10

# Run the application
python3 main.py
```

### 3. Access the Application

- **API Base URL**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health

## API Endpoints

### Health Check
- `GET /health` - Check database and Redis connections

### Test Endpoints
- `POST /test` - Create a test record (uses both PostgreSQL and Redis)
- `GET /test/{record_id}` - Get a test record (cached in Redis)
- `GET /test` - Get all test records

### Example Usage

```bash
# Check health
curl http://localhost:8000/health

# Create a test record
curl -X POST "http://localhost:8000/test" \
     -H "Content-Type: application/json" \
     -d '{"name": "Test Record", "description": "This is a test"}'

# Get a test record
curl http://localhost:8000/test/1
```

## Services

### PostgreSQL
- **Host**: localhost
- **Port**: 5432
- **Database**: inkinki_school
- **Username**: postgres
- **Password**: password123

### Redis
- **Host**: localhost
- **Port**: 6379
- **No authentication required**

## Project Structure

```
server/
├── app.py              # FastAPI application
├── main.py             # Application entry point
├── config.py           # Application configuration and settings
├── database.py         # PostgreSQL connection and configuration
├── redis_client.py     # Redis connection and utilities
├── models.py           # SQLAlchemy models
├── requirements.txt    # Python dependencies
├── docker-compose.yml  # Docker services configuration
├── env_template.txt    # Environment variables template
├── setup.py           # Setup script
└── README.md          # This file
```

## Development

### Running in Development Mode

The application runs with auto-reload enabled by default. Any changes to the code will automatically restart the server.

### Stopping Services

```bash
# Stop Docker services
docker-compose down

# Stop with data removal
docker-compose down -v
```

### Database Management

The application automatically creates the necessary database tables on startup. The `TestRecord` model is used for testing the database connection.

## Troubleshooting

### Common Issues

1. **Port already in use**: Make sure ports 5432, 6379, and 8000 are not being used by other applications
2. **Docker not running**: Ensure Docker Desktop is running
3. **Permission denied**: Make sure you have permission to run Docker commands

### Checking Service Status

```bash
# Check Docker services
docker-compose ps

# Check logs
docker-compose logs postgres
docker-compose logs redis
```

## Next Steps

This is a basic setup for testing the integration. You can now:

1. Add more models and endpoints
2. Implement authentication
3. Add more complex business logic
4. Set up proper environment configuration
5. Add tests
6. Deploy to production
