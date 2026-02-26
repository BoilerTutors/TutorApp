from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.models import MatchRun, Match


def create_match_run(
    db: Session,
    *,
    student_id: int,
    model_name: str,
    top_k: int,
    weights_json: dict | None = None,
) -> MatchRun:
    run = MatchRun(
        student_id=student_id,
        model_name=model_name,
        top_k=top_k,
        weights_json=weights_json,
    )
    db.add(run)
    db.flush()
    return run


def insert_matches_for_run(
    db: Session,
    *,
    run_id: int,
    student_id: int,
    ranked_rows: list[dict],  # from rerank_candidates
) -> list[Match]:
    out: list[Match] = []
    for idx, row in enumerate(ranked_rows, start=1):
        m = Match(
            run_id=run_id,
            student_id=student_id,
            tutor_id=row["tutor_id"],
            rank=idx,
            similarity_score=row["final_score"],
            embedding_similarity=row.get("embedding_similarity"),
            class_strength=row.get("class_strength"),
            availability_overlap=row.get("availability_overlap"),
            location_match=row.get("location_match"),
        )
        db.add(m)
        out.append(m)
    db.flush()
    return out


def save_match_results(
    db: Session,
    *,
    student_id: int,
    ranked_rows: list[dict],
    model_name: str = "local-hash-v1",
    weights_json: dict | None = None,
) -> MatchRun:
    run = create_match_run(
        db,
        student_id=student_id,
        model_name=model_name,
        top_k=len(ranked_rows),
        weights_json=weights_json,
    )
    insert_matches_for_run(
        db,
        run_id=run.id,
        student_id=student_id,
        ranked_rows=ranked_rows,
    )
    db.commit()
    db.refresh(run)
    return run


def get_latest_matches_for_student(db: Session, *, student_id: int) -> list[Match]:
    latest_run = (
        db.query(MatchRun)
        .filter(MatchRun.student_id == student_id)
        .order_by(desc(MatchRun.created_at), desc(MatchRun.id))
        .first()
    )
    if not latest_run:
        return []

    return (
        db.query(Match)
        .filter(Match.run_id == latest_run.id)
        .order_by(Match.rank.asc())
        .all()
    )