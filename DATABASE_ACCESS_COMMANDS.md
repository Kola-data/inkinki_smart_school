# Database Access Commands

## PostgreSQL Database Access

### Connection Details
- **Host**: localhost (or `postgres` from within Docker network)
- **Port**: 5430 (mapped from container port 5432)
- **Database**: `inkinki_school`
- **User**: `postgres`
- **Password**: `password123`
- **Container Name**: `inkinki_postgres`

### 1. Access via Docker (Recommended)

#### Interactive psql session:
```bash
cd server
docker-compose exec postgres psql -U postgres -d inkinki_school
```

#### Run a single SQL command:
```bash
cd server
docker-compose exec postgres psql -U postgres -d inkinki_school -c "SELECT COUNT(*) FROM test_marks;"
```

#### Run SQL from a file:
```bash
cd server
docker-compose exec -T postgres psql -U postgres -d inkinki_school < your_script.sql
```

### 2. Access via psql (if installed locally)

```bash
psql -h localhost -p 5430 -U postgres -d inkinki_school
# Password: password123
```

### 3. Access via Docker exec (Alternative)

```bash
docker exec -it inkinki_postgres psql -U postgres -d inkinki_school
```

### 4. Useful Database Commands

#### Check if containers are running:
```bash
cd server
docker-compose ps
```

#### View all tables:
```bash
docker-compose exec postgres psql -U postgres -d inkinki_school -c "\dt"
```

#### View test_marks table structure:
```bash
docker-compose exec postgres psql -U postgres -d inkinki_school -c "\d test_marks"
```

#### Count records in test_marks:
```bash
docker-compose exec postgres psql -U postgres -d inkinki_school -c "SELECT COUNT(*) FROM test_marks WHERE is_deleted = false;"
```

#### View all test marks:
```bash
docker-compose exec postgres psql -U postgres -d inkinki_school -c "SELECT test_mark_id, student_name, test_mark, test_avg_mark FROM test_marks LIMIT 10;"
```

#### Check assessment_marks table (if exists):
```bash
docker-compose exec postgres psql -U postgres -d inkinki_school -c "SELECT COUNT(*) FROM assessment_marks;"
```

#### View table sizes:
```bash
docker-compose exec postgres psql -U postgres -d inkinki_school -c "SELECT schemaname, tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

### 5. Backup Database

#### Create a backup:
```bash
cd server
docker-compose exec postgres pg_dump -U postgres inkinki_school > backup_$(date +%Y%m%d_%H%M%S).sql
```

#### Restore from backup:
```bash
cd server
docker-compose exec -T postgres psql -U postgres -d inkinki_school < backup_20241106_102000.sql
```

### 6. Common SQL Queries

#### View test marks with student names:
```sql
SELECT 
    tm.test_mark_id,
    s.std_name as student_name,
    sub.subj_name as subject_name,
    c.cls_name as class_name,
    tm.test_mark,
    tm.test_avg_mark,
    tm.term,
    tm.status
FROM test_marks tm
LEFT JOIN students s ON tm.std_id = s.std_id
LEFT JOIN subjects sub ON tm.subj_id = sub.subj_id
LEFT JOIN classes c ON tm.cls_id = c.cls_id
WHERE tm.is_deleted = false
LIMIT 20;
```

#### Check for duplicate test marks:
```sql
SELECT 
    school_id, std_id, subj_id, cls_id, academic_id, term,
    COUNT(*) as count
FROM test_marks
WHERE is_deleted = false
GROUP BY school_id, std_id, subj_id, cls_id, academic_id, term
HAVING COUNT(*) > 1;
```

#### View recent test marks:
```sql
SELECT 
    test_mark_id,
    test_mark,
    test_avg_mark,
    created_at
FROM test_marks
WHERE is_deleted = false
ORDER BY created_at DESC
LIMIT 10;
```

### 7. Redis Access

#### Access Redis CLI:
```bash
cd server
docker-compose exec redis redis-cli
```

#### View all keys:
```bash
docker-compose exec redis redis-cli KEYS "*"
```

#### View test marks cache:
```bash
docker-compose exec redis redis-cli KEYS "*testmarks*"
```

#### Clear all cache:
```bash
docker-compose exec redis redis-cli FLUSHDB
```

#### Get specific key value:
```bash
docker-compose exec redis redis-cli GET "testmarks:school:1c192e35-0f03-4753-829a-7b69a56cb6d1"
```

### 8. Database Connection String

For external tools (DBeaver, pgAdmin, etc.):
```
Host: localhost
Port: 5430
Database: inkinki_school
Username: postgres
Password: password123
```

JDBC URL:
```
jdbc:postgresql://localhost:5430/inkinki_school
```

### 9. Environment Variables (for reference)

From docker-compose.yml:
- `POSTGRES_DB=inkinki_school`
- `POSTGRES_USER=postgres`
- `POSTGRES_PASSWORD=password123`
- `DATABASE_URL=postgresql+asyncpg://postgres:password123@postgres:5432/inkinki_school`

