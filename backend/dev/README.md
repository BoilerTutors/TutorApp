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

From **backend**, pick **one** approach:

**A — SQLAlchemy only (simplest for local dev)**

```bash
python dev/create_tables.py
```

`create_tables.py` always drops existing tables first, then recreates them from `models.py`.

**B — Alembic only (matches production migrations)**

```bash
alembic upgrade head
```

If you already ran `create_tables.py`, the database has tables but Alembic does not know that. Running `alembic upgrade head` then tries to replay the first migration, which creates `conversations` and fails with **relation "conversations" already exists**. Fix it by marking that baseline migration as already applied, then apply the rest:

```bash
alembic stamp 6c05817e209e
alembic upgrade head
```

(Use your venv’s `alembic`, e.g. `backend/.venv/bin/alembic`, if the command is not on your `PATH`.)

## 4. Seed test data

Seed a test tutor and student user (safe to run multiple times):

```bash
python dev/seed_test_data.py
```

This prints their `id` and `email` so you can use them in the FastAPI docs for messaging tests.

## 5. Connect with psql (optional)

If you have the Postgres client installed:

```bash
PGPASSWORD=postgres psql -h localhost -p 5433 -U postgres -d tutorapp
```

Then, for example:

```sql
\dt              -- list tables
SELECT * FROM users;  -- view seeded users
```

## 6. Reset the local database

If your `models.py` changed a lot or you just want a clean slate, you can drop and recreate the local DB data:

From **backend**:

```bash
docker compose -f dev/docker-compose.yml down -v   # stop container and delete data volume
docker compose -f dev/docker-compose.yml up -d     # start fresh Postgres
python dev/create_tables.py                        # recreate tables from models.py
python dev/seed_test_data.py                       # reseed test users (optional)
```

Credentials used by Docker: user `postgres`, password `postgres`, database `tutorapp`, host port `5433` (maps to `5432` in the container).
