from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.crud.matches import (
    add_match_to_latest_run,
    get_latest_matches_for_student,
    has_student_matched_tutor,
)
from app.database import get_db
from app.models import TutorProfile, User
from app.schemas import MatchResultPublic, MatchSelectRequest
from app.services.embeddings import knn_retrieve_candidates, rerank_candidates
from app.services.notification_events import build_and_store_notification, emit_notification

router = APIRouter()


def _serialize_reranked_rows(db: Session, reranked: list[dict]) -> list[MatchResultPublic]:
    if not reranked:
        return []

    tutor_user_ids = [int(row["tutor_id"]) for row in reranked]
    tutors_by_user_id = {
        t.user_id: t
        for t in db.query(TutorProfile).filter(TutorProfile.user_id.in_(tutor_user_ids)).all()
    }
    users_by_id = {
        u.id: u
        for u in db.query(User).filter(User.id.in_(tutor_user_ids)).all()
    }

    response: list[MatchResultPublic] = []
    for idx, row in enumerate(reranked, start=1):
        tutor_id = int(row["tutor_id"])
        tutor_user = users_by_id.get(tutor_id)
        if tutor_user is None:
            continue
        tutor_profile = tutors_by_user_id.get(tutor_id)
        response.append(
            MatchResultPublic(
                rank=idx,
                tutor_id=tutor_id,
                tutor_profile_id=tutor_profile.id if tutor_profile else None,
                tutor_first_name=tutor_user.first_name,
                tutor_last_name=tutor_user.last_name,
                tutor_major=tutor_profile.major if tutor_profile else None,
                similarity_score=float(row["final_score"]),
                embedding_similarity=row.get("embedding_similarity"),
                class_strength=row.get("class_strength"),
                availability_overlap=row.get("availability_overlap"),
                location_match=row.get("location_match"),
            )
        )
    return response


def _build_saved_match_payload(db: Session, current_user_id: int) -> list[MatchResultPublic]:
    latest_matches = get_latest_matches_for_student(db, student_id=current_user_id)
    if not latest_matches:
        return []

    tutor_user_ids = [m.tutor_id for m in latest_matches]
    tutors_by_user_id = {
        t.user_id: t
        for t in db.query(TutorProfile).filter(TutorProfile.user_id.in_(tutor_user_ids)).all()
    }
    users_by_id = {
        u.id: u
        for u in db.query(User).filter(User.id.in_(tutor_user_ids)).all()
    }

    response: list[MatchResultPublic] = []
    for match in latest_matches:
        tutor_user = users_by_id.get(match.tutor_id)
        if tutor_user is None:
            continue
        tutor_profile = tutors_by_user_id.get(match.tutor_id)
        response.append(
            MatchResultPublic(
                rank=match.rank,
                tutor_id=match.tutor_id,
                tutor_profile_id=tutor_profile.id if tutor_profile else None,
                tutor_first_name=tutor_user.first_name,
                tutor_last_name=tutor_user.last_name,
                tutor_major=tutor_profile.major if tutor_profile else None,
                similarity_score=match.similarity_score,
                embedding_similarity=match.embedding_similarity,
                class_strength=match.class_strength,
                availability_overlap=match.availability_overlap,
                location_match=match.location_match,
            )
        )
    return response


def _compute_reranked_rows(db: Session, student_user_id: int) -> list[dict]:
    candidates = knn_retrieve_candidates(
        db,
        student_id=student_user_id,
        top_k=50,
        model_name="local-hash-v1",
    )
    candidate_tutor_ids = [row["tutor_id"] for row in candidates]
    return rerank_candidates(
        db,
        student_id=student_user_id,
        candidate_tutor_ids=candidate_tutor_ids,
        top_k=10,
        model_name="local-hash-v1",
    )


@router.post("/me/refresh", response_model=list[MatchResultPublic])
def refresh_my_match_candidates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MatchResultPublic]:
    if not current_user.is_student or current_user.student is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only student accounts can calculate tutor matches.",
        )

    reranked = _compute_reranked_rows(db, current_user.id)
    return _serialize_reranked_rows(db, reranked)


@router.post("/me/select", response_model=list[MatchResultPublic])
async def select_match(
    body: MatchSelectRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MatchResultPublic]:
    if not current_user.is_student or current_user.student is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only student accounts can select tutor matches.",
        )

    reranked = _compute_reranked_rows(db, current_user.id)
    selected = next((row for row in reranked if int(row["tutor_id"]) == body.tutor_id), None)
    if selected is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Tutor not found in current match candidates.",
        )
    if has_student_matched_tutor(db, student_id=current_user.id, tutor_id=body.tutor_id):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="You have already matched with this tutor.",
        )

    add_match_to_latest_run(
        db,
        student_id=current_user.id,
        ranked_row=selected,
        model_name="local-hash-v1",
        weights_json={
            "embedding_weight": 0.45,
            "class_strength_weight": 0.35,
            "availability_weight": 0.10,
            "location_weight": 0.10,
        },
    )
    tutor_user = db.get(User, body.tutor_id)
    if tutor_user is not None:
        row = build_and_store_notification(
            db,
            user_id=tutor_user.id,
            event_type="notification",
            title="You got a new match",
            body=f"{current_user.first_name} matched with you.",
            payload_json={"student_id": current_user.id, "tutor_id": tutor_user.id},
        )
        await emit_notification(tutor_user.id, row)
    return _build_saved_match_payload(db, current_user.id)


@router.get("/me", response_model=list[MatchResultPublic])
def get_my_matches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MatchResultPublic]:
    if not current_user.is_student or current_user.student is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only student accounts can view tutor matches.",
        )
    return _build_saved_match_payload(db, current_user.id)
