"""API routes for UserAvailability time slots.

- POST   /availability/         - add availability slot(s) for current user
- GET    /availability/me       - get current user's availability
- GET    /availability/{user_id} - get a user's availability
- PUT    /availability/{slot_id} - update a slot
- DELETE /availability/{slot_id} - delete a slot
"""
from fastapi import APIRouter
router = APIRouter()
