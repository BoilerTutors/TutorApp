from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    admin,
    auth,
    users,
    tutors,
    students,
    classes,
    sessions,
    availability,
    reviews,
    messages,
    matches,
    notifications,
    reports,
)

app = FastAPI(title="BoilerTutors API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8081",
        "http://127.0.0.1:8081",
        "http://localhost:19006",
        "http://127.0.0.1:19006",
    ],
    # Expo web / LAN dev (Metro on 192.168.x.x, various ports)
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1|192\.168\.\d{1,3}\.\d{1,3})(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(admin.router, prefix="/admin", tags=["admin"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(tutors.router, prefix="/tutors", tags=["tutors"])
app.include_router(students.router, prefix="/students", tags=["students"])
app.include_router(classes.router, prefix="/classes", tags=["classes"])
app.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
app.include_router(reviews.router, prefix="/reviews", tags=["reviews"])
app.include_router(availability.router, prefix="/availability", tags=["availability"])
app.include_router(messages.router, prefix="/messages", tags=["messages"])
app.include_router(matches.router, prefix="/matches", tags=["matches"])
app.include_router(notifications.router, prefix="/notifications", tags=["notifications"])
app.include_router(reports.router, prefix="/reports", tags=["reports"])


@app.get("/")
def root():
    return {"message": "BoilerTutors API", "docs": "/docs"}
