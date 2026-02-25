# Local dev database

Everything here is for running a **local Postgres instance** for testing. It stays separate from app logic.

## 1. Start Postgres

From the **backend** directory:

```bash
docker compose -f dev/docker-compose.yml up -d
```

Stop: `docker compose -f dev/docker-compose.yml down`

## 2. Point the app at local DB

In **backend/.env**, set (and comment out RDS_* if you want to use only local):

```env
LOCAL_DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/tutorapp
```

See **dev/.env.example** for the same line.

## 3. Create tables

From **backend**:

```bash
python dev/create_tables.py
```

Credentials used by Docker: user `postgres`, password `postgres`, database `tutorapp`, port `5432`.
