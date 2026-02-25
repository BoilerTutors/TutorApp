# BoilerTutors

Scaffolded from the CS 407 design document for Team 7.

## Tech Stack

- **Frontend:** React Native + TypeScript (Expo-managed app)
- **Backend:** FastAPI + Python
- **Database:** PostgreSQL
- **AI Matching Integration:** OpenAI API (stubbed service layer)

## Repository Structure

```
TutorApp/
  frontend/        # React Native + TypeScript client
  backend/         # FastAPI server, modular API/services/models
  CS 407 Design Doc.pdf
```

## Domain Model (Design-Doc Aligned)

Backend scaffolding includes the core entities described in the document:

- `User` (base profile and auth fields)
- `Student` (extends `User` with student-specific data)
- `Tutor` (extends `User` with tutor-specific data)
- `Admin` (standalone, does not inherit from `User`)
- `Class` (academic class catalog object)
- `StudentClass` (student perspective of a class + help level)
- `TutorClass` (tutor perspective of a class + semester/grade received)
- `Review` (student feedback for tutor)

## Quick Start

### Frontend

```bash
cd frontend
npm install
npm run start
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Create a `backend/.env` file with either:

- **Local dev DB (Docker)** – recommended for testing:

  ```env
  LOCAL_DATABASE_URL=postgresql+psycopg2://postgres:postgres@localhost:5432/tutorapp
  ```

  Then see `backend/dev/README.md` for:
  - starting the local Postgres container
  - creating tables (`python dev/create_tables.py`)
  - seeding test users (`python dev/seed_test_data.py`)

- **Shared RDS DB** – if you have want to connect to deployed db:

  ```env
  RDS_HOST=...
  RDS_PORT=5432
  RDS_DB_NAME=...
  RDS_USERNAME=...
  RDS_PASSWORD=...
  RDS_SSL_MODE=verify-full
  RDS_SSL_ROOT_CERT=certs/global-bundle.pem
  ```

When `LOCAL_DATABASE_URL` is set, the backend uses your local Postgres; otherwise it connects to the configured RDS instance.

### Messaging API

The backend exposes a simple REST + WebSocket messaging system:

- `POST /messages/conversations` – create/get a conversation between two users.
- `GET /messages/conversations` – list a user’s conversations (with last message preview).
- `GET /messages/conversations/{id}/messages` – list messages in a conversation.
- `POST /messages/conversations/{id}/messages` – send a message (stored in the `messages` table).
- `WS /messages/ws/chat/{conversation_id}` – WebSocket endpoint for real-time chat in a conversation.
