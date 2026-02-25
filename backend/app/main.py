"""FastAPI application entry point."""
from fastapi import FastAPI

from app.routers import auth, availability, classes, reviews, sessions, students, tutors, users

app = FastAPI(
    title="BoilerTutors API",
    description="Tutoring app backend",
    version="0.1.0",
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(tutors.router, prefix="/tutors", tags=["tutors"])
app.include_router(students.router, prefix="/students", tags=["students"])
app.include_router(classes.router, prefix="/classes", tags=["classes"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
app.include_router(availability.router, prefix="/availability", tags=["availability"])


@app.get("/")
def root():
    return {"message": "BoilerTutors API", "docs": "/docs"}


@app.get("/health")
def health():
    return {"status": "ok"}
