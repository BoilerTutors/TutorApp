"""API routes for authentication.

- POST  /auth/login     - login with email + password, return JWT
- POST  /auth/mfa       - verify MFA code
- POST  /auth/refresh   - refresh an expiring token
"""
from fastapi import APIRouter
router = APIRouter()
