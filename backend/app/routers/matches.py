from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.crud.matches import get_latest_matches_for_student, save_match_results
from app.database import get_db
from app.models import TutorProfile, User
from app.schemas import MatchResultPublic
from app.services.embeddings import knn_retrieve_candidates, rerank_candidates

router = APIRouter()


def _build_match_payload(db: Session, current_user_id: int) -> list[MatchResultPublic]:
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


@router.post("/me/refresh", response_model=list[MatchResultPublic])
def refresh_my_matches(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[MatchResultPublic]:
    if not current_user.is_student or current_user.student is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only student accounts can calculate tutor matches.",
        )

    candidates = knn_retrieve_candidates(
        db,
        student_id=current_user.id,
        top_k=50,
        model_name="local-hash-v1",
    )
    candidate_tutor_ids = [row["tutor_id"] for row in candidates]
    reranked = rerank_candidates(
        db,
        student_id=current_user.id,
        candidate_tutor_ids=candidate_tutor_ids,
        top_k=10,
        model_name="local-hash-v1",
    )

    save_match_results(
        db,
        student_id=current_user.id,
        ranked_rows=reranked,
        model_name="local-hash-v1",
        weights_json={
            "embedding_weight": 0.45,
            "class_strength_weight": 0.35,
            "availability_weight": 0.10,
            "location_weight": 0.10,
        },
    )
    return _build_match_payload(db, current_user.id)


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
    return _build_match_payload(db, current_user.id)
