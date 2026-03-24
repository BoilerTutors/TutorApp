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

LOCAL_TESTING_DATABASE_URL = os.getenv("LOCAL_TESTING_DATABASE_URL")

if LOCAL_TESTING_DATABASE_URL:
    SQLALCHEMY_DATABASE_URL = LOCAL_TESTING_DATABASE_URL
    engine = create_engine(SQLALCHEMY_DATABASE_URL, pool_pre_ping=True)
else:
    host = os.getenv("TEST_DB_HOST")
    port = os.getenv("TEST_DB_PORT", "5432")
    db_name = os.getenv("TEST_DB_NAME")
    username = os.getenv("TEST_DB_USERNAME")
    password = os.getenv("TEST_DB_PASSWORD", "")

    if not host or not db_name or not username:
        raise RuntimeError(
            "Testing database not configured. Set LOCAL_TESTING_DATABASE_URL or set "
            "TEST_DB_HOST/TEST_DB_NAME/TEST_DB_USERNAME (and optionally TEST_DB_PASSWORD)."
        )

    SQLALCHEMY_DATABASE_URL = f"postgresql+psycopg2://{username}:{password}@{host}:{port}/{db_name}"

    sslmode = os.getenv("TEST_DB_SSL_MODE")
    sslrootcert_env = os.getenv("TEST_DB_SSL_ROOT_CERT")

    connect_args: dict = {}
    if sslmode:
        connect_args["sslmode"] = sslmode
    if sslrootcert_env:
        connect_args["sslrootcert"] = str((BASE_DIR / sslrootcert_env).resolve())

    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        connect_args=connect_args if connect_args else None,
    )
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