"""Create all tables in the local Postgres. Run from backend/ so app is importable.

  cd backend && python dev/create_tables.py
"""
import argparse
import sys
from pathlib import Path

# Run from backend/ so app.database and app.models resolve
backend = Path(__file__).resolve().parents[1]
if str(backend) not in sys.path:
    sys.path.insert(0, str(backend))

from app.database import engine, Base
from app import models  # noqa: F401 — registers models with Base


def main() -> None:
    parser = argparse.ArgumentParser(description="Create local DB tables from SQLAlchemy models.")
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Drop all existing tables first, then recreate from current models.",
    )
    args = parser.parse_args()

    if args.reset:
        Base.metadata.drop_all(bind=engine)
        print("Dropped existing tables.")

    Base.metadata.create_all(bind=engine)
    print("Tables created.")


if __name__ == "__main__":
    main()
