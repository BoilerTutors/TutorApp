"""Rebuild all tables in local Postgres to match current models.

  cd backend && python dev/create_tables.py
"""
import sys
from pathlib import Path

# Run from backend/ so app.database and app.models resolve
backend = Path(__file__).resolve().parents[1]
if str(backend) not in sys.path:
    sys.path.insert(0, str(backend))

from app.database import engine, Base
from app import models  # noqa: F401 — registers models with Base


def main() -> None:
    # drop_all + create_all ensures local schema stays aligned with models.py
    # even when table/column definitions change during development.
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Tables rebuilt to match current schema.")


if __name__ == "__main__":
    main()
