"""API routes for TutoringSession (purchases).

- POST   /sessions/              - student purchases/books a session
- GET    /sessions/me            - get current user's sessions (as student or tutor)
- GET    /sessions/{session_id}  - get session details
- PATCH  /sessions/{session_id}  - update session (status, reschedule, notes)
- DELETE /sessions/{session_id}  - cancel/delete a session
"""
from fastapi import APIRouter
router = APIRouter()
