# Server Startup Commands

## Backend Server (FastAPI)

### Option 1: Using run_server.py (Recommended)
```bash
cd server
source venv/bin/activate
python run_server.py
```

### Option 2: Using uvicorn directly
```bash
cd server
source venv/bin/activate
python -m uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

**Backend will be available at:** http://localhost:8000
**API Documentation:** http://localhost:8000/docs

---

## Frontend Server (React/Vite)

```bash
cd client
npm run dev
```

**Frontend will be available at:** http://localhost:5173

---

## Using Docker (Alternative)

### Start all services (PostgreSQL, Redis, and API)
```bash
cd server
docker-compose up -d
```

### View logs
```bash
docker-compose logs -f
```

### Stop services
```bash
docker-compose down
```

---

## Quick Start (Both Servers)

### Terminal 1 - Backend
```bash
cd /home/kwola/RealWordProjects/inkinki_smart_school/server
source venv/bin/activate
python run_server.py
```

### Terminal 2 - Frontend
```bash
cd /home/kwola/RealWordProjects/inkinki_smart_school/client
npm run dev
```

---

## Notes

- **Backend**: Requires Python virtual environment to be activated
- **Frontend**: Requires Node.js and npm installed
- **Database**: Ensure PostgreSQL is running (or use Docker)
- **Redis**: Optional (for Celery tasks), server will work without it but with warnings

