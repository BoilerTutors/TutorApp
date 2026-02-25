from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import auth, users, tutors, students, classes, sessions, availability, reviews, sessions, messages

app = FastAPI(title="BoilerTutors API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(tutors.router, prefix="/tutors", tags=["tutors"])
app.include_router(students.router, prefix="/students", tags=["students"])
app.include_router(classes.router, prefix="/classes", tags=["classes"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
app.include_router(availability.router, prefix="/availability", tags=["availability"])
app.include_router(messages.router, prefix="/messages", tags=["messages"])


@app.get("/")
def root():
    return {"message": "BoilerTutors API", "docs": "/docs"}
