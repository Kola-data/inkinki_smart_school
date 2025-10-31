# Inkinki Smart School API - Async Version

This is the fully async version of the Inkinki Smart School API, built with FastAPI, async SQLAlchemy, and async Redis.

## 🚀 Key Features

- **Fully Async**: All database and Redis operations are asynchronous
- **High Performance**: Non-blocking I/O operations for better concurrency
- **Modern Stack**: FastAPI + async SQLAlchemy + async Redis
- **Scalable**: Designed to handle high concurrent loads

## 📋 Prerequisites

- Python 3.8+
- PostgreSQL 12+
- Redis 6+
- Virtual environment (recommended)

## 🛠️ Installation

1. **Clone the repository** (if not already done)
   ```bash
   cd /home/kwola/RealWordProjects/inkinki_smart_school/server
   ```

2. **Create and activate virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Linux/Mac
   # or
   venv\Scripts\activate  # On Windows
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp env_template.txt .env
   # Edit .env file with your database and Redis credentials
   ```

## 🗄️ Database Setup

1. **Start PostgreSQL and Redis services**
   ```bash
   # Using Docker (recommended)
   docker-compose up -d
   
   # Or start services manually
   sudo systemctl start postgresql
   sudo systemctl start redis
   ```

2. **Create database**
   ```sql
   CREATE DATABASE inkinki_school;
   ```

## 🧪 Testing the Async System

Run the async test script to verify everything works:

```bash
python test_async.py
```

This will test:
- ✅ Async database connection
- ✅ Async Redis connection  
- ✅ Async database operations (CRUD)
- ✅ Async Redis operations (set/get/delete)

## 🚀 Running the Application

### Option 1: Using the async startup script (Recommended)
```bash
python start_async.py
```

### Option 2: Using the main.py script
```bash
python main.py
```

### Option 3: Using uvicorn directly
```bash
uvicorn app:app --host 0.0.0.0 --port 8000 --reload
```

## 📡 API Endpoints

### Health Check
```bash
GET /health
```
Returns the status of database and Redis connections.

### Test Endpoints
```bash
# Create a test record
POST /test
{
  "name": "Test Record",
  "description": "Testing async operations"
}

# Get a test record
GET /test/{record_id}

# Get all test records
GET /test
```

## 🔧 Configuration

The application uses environment variables for configuration. Key settings:

- `DATABASE_URL`: PostgreSQL connection string (now uses `postgresql+asyncpg://`)
- `REDIS_URL`: Redis connection string
- `DEBUG`: Enable/disable debug mode
- `HOST`: Server host (default: 0.0.0.0)
- `PORT`: Server port (default: 8000)

## 🏗️ Architecture Changes

### Database Layer
- **Before**: Synchronous SQLAlchemy with `psycopg2`
- **After**: Async SQLAlchemy with `asyncpg`
- **Session Management**: `AsyncSession` instead of `Session`
- **Query Execution**: `await session.execute()` instead of `session.query()`

### Redis Layer
- **Before**: Synchronous Redis with `redis` library
- **After**: Async Redis with `aioredis`
- **Operations**: All Redis operations are now `async/await`

### API Layer
- **Before**: Mixed sync/async endpoints
- **After**: All endpoints are fully async
- **Database Operations**: All use `await` for database calls
- **Redis Operations**: All use `await` for Redis calls

## 📊 Performance Benefits

1. **Non-blocking I/O**: Database and Redis operations don't block the event loop
2. **Better Concurrency**: Handle more concurrent requests
3. **Resource Efficiency**: Lower memory usage per request
4. **Scalability**: Better performance under high load

## 🔍 Monitoring

The application includes health check endpoints to monitor:
- Database connectivity
- Redis connectivity
- Overall system health

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check PostgreSQL is running
   - Verify DATABASE_URL format (should use `postgresql+asyncpg://`)
   - Ensure database exists

2. **Redis Connection Errors**
   - Check Redis is running
   - Verify REDIS_URL format
   - Check Redis authentication

3. **Import Errors**
   - Ensure all dependencies are installed: `pip install -r requirements.txt`
   - Check Python version (3.8+ required)

### Debug Mode

Enable debug mode by setting `DEBUG=True` in your environment variables for detailed error messages.

## 📝 Development

### Adding New Async Endpoints

```python
@app.post("/new-endpoint")
async def new_endpoint(db: AsyncSession = Depends(get_db)):
    # Use await for all database operations
    result = await db.execute(select(YourModel))
    records = result.scalars().all()
    
    # Use await for Redis operations
    await redis_service.set("key", "value")
    
    return {"data": records}
```

### Database Operations

```python
# Create
new_record = YourModel(name="test")
db.add(new_record)
await db.commit()
await db.refresh(new_record)

# Read
result = await db.execute(select(YourModel).filter(YourModel.id == record_id))
record = result.scalar_one_or_none()

# Update
record.name = "updated"
await db.commit()

# Delete
await db.delete(record)
await db.commit()
```

## 🎯 Next Steps

1. **Add Authentication**: Implement JWT-based authentication
2. **Add Validation**: Use Pydantic models for request/response validation
3. **Add Logging**: Implement structured logging
4. **Add Testing**: Create comprehensive test suite
5. **Add Documentation**: Generate API documentation with FastAPI

## 📞 Support

For issues or questions about the async implementation, check the logs and ensure all services are running properly.
