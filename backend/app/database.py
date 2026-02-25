from sqlalchemy.orm.session import Session


from dotenv import load_dotenv
from pathlib import Path
import os

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase


BASE_DIR = Path(__file__).resolve().parents[1] # get the backend directory path
load_dotenv(BASE_DIR / ".env") # load the environment variables from the .env file

# Local testing: set LOCAL_DATABASE_URL to use a local Postgres (no SSL).
# Example: postgresql+psycopg2://postgres:postgres@localhost:5432/tutorapp
LOCAL_DATABASE_URL = os.getenv("LOCAL_DATABASE_URL")

if LOCAL_DATABASE_URL:
    DATABASE_URL = LOCAL_DATABASE_URL
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    host = os.getenv("RDS_HOST")
    port = os.getenv("RDS_PORT", "5432")
    db_name = os.getenv("RDS_DB_NAME")
    username = os.getenv("RDS_USERNAME")
    password = os.getenv("RDS_PASSWORD", "")
    sslmode = os.getenv("RDS_SSL_MODE", "verify-full")
    sslrootcert_env = os.getenv("RDS_SSL_ROOT_CERT", "certs/global-bundle.pem")

    sslrootcert_path = (BASE_DIR / sslrootcert_env).resolve()

    DATABASE_URL = (
        f"postgresql+psycopg2://{username}:{password}"
        f"@{host}:{port}/{db_name}"
    )

    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        connect_args={
            "sslmode": sslmode,
            "sslrootcert": str(sslrootcert_path),
        },
    )

SessionLocal: sessionmaker[Session] = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)

class Base(DeclarativeBase):
    pass

def get_db():
    with SessionLocal() as session:
        yield session
