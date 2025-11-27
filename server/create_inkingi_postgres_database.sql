-- Create user if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'kwola') THEN
    CREATE USER kwola WITH PASSWORD 'asdf0780';
  ELSE
    ALTER USER kwola WITH PASSWORD 'asdf0780';
  END IF;
END
$$;

-- Grant privileges
ALTER USER kwola CREATEDB;

-- Create database if not exists
SELECT 'CREATE DATABASE inkingi_school OWNER kwola'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'inkingi_school')\gexec

-- Grant privileges on database
GRANT ALL PRIVILEGES ON DATABASE inkingi_school TO kwola;

-- Connect to database and grant schema privileges
\c inkingi_school

GRANT ALL ON SCHEMA public TO kwola;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO kwola;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO kwola;

-- Verify
\du kwola
\l inkingi_school

