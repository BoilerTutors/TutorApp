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
cp .env.example .env
uvicorn app.main:app --reload
```
