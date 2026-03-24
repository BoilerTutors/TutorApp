import pytest
import os
from dotenv import load_dotenv
from pathlib import Path
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from app.main import app
from app.database import get_db
from app.database import Base 

BASE_DIR = Path(__file__).resolve().parents[1]
load_dotenv(BASE_DIR / ".env") 

SQLALCHEMY_DATABASE_URL = (
    os.getenv("LOCAL_TESTING_DATABASE_URL")  # local dev (.env)
    or os.getenv("TESTING_DATABASE_URL")     # CI (GitHub Actions container)
)

if not SQLALCHEMY_DATABASE_URL:
    raise RuntimeError(
        "Testing database not configured. "
        "Set LOCAL_TESTING_DATABASE_URL (local) or TESTING_DATABASE_URL (CI)."
    )

engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Override the get_db dependency to use the testing session local instead of
# the dev database session local
def override_get_db():
    try:
        db = TestingSessionLocal()
        yield db
    finally:
        db.close()

@pytest.fixture(scope="function")
def db_session():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture(scope="function")
def client(db_session: Session):
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()