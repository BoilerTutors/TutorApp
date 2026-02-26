from __future__ import annotations

from dataclasses import dataclass
import hashlib
import math
from datetime import time
from typing import Sequence, TypedDict

from sqlalchemy.orm import Session

from app.models import StudentProfile, TutorProfile, UserAvailability, UserEmbedding

# Embedding config
EMBED_DIM = 128
WEIGHTS = {
    "bio": 1.0,          # student.bio <-> tutor.bio
    "help": 1.0,         # student.help_needed <-> tutor.help_provided
    "locations": 0.5,    # student.locations <-> tutor.locations
}

GRADE_POINTS = {
    "A+": 4.3,
    "A": 4.0,
    "A-": 3.7,
    "B+": 3.3,
    "B": 3.0,
    "B-": 2.7,
    "C+": 2.3,
    "C": 2.0,
    "D": 1.0,
    "F": 0.0,
}

MAX_GRADE_POINTS = max(GRADE_POINTS.values())
MIN_GRADE_POINTS = min(GRADE_POINTS.values())
GRADE_RANGE = MAX_GRADE_POINTS - MIN_GRADE_POINTS


@dataclass
class StudentFeatures:
    bio: str
    help_needed: Sequence[str]
    locations: Sequence[str]


@dataclass
class TutorFeatures:
    tutor_id: int
    bio: str
    help_provided: Sequence[str]
    locations: Sequence[str]


def _normalize(v: list[float]) -> list[float]:
    norm = math.sqrt(sum(x * x for x in v))
    if norm == 0:
        return v
    return [x / norm for x in v]


def _tokenize(text: str) -> list[str]:
    return [token for token in text.lower().strip().split() if token]


def _embed_from_text(text: str) -> list[float]:
    """
    Deterministic local embedding placeholder.
    Replace this with Together/OpenAI provider call if desired.
    """
    tokens = _tokenize(text)
    if not tokens:
        return [0.0] * EMBED_DIM

    vector = [0.0] * EMBED_DIM
    for token in tokens:
        digest = hashlib.sha256(token.encode("utf-8")).digest()
        for i in range(EMBED_DIM):
            vector[i] += digest[i % len(digest)] / 255.0
    return _normalize(vector)


def join_list(values: Sequence[str] | None) -> str:
    if not values:
        return ""
    return ", ".join(v.strip() for v in values if v and v.strip())


def embed_text(text: str) -> list[float]:
    return _embed_from_text(text)


def cosine_sim(a: Sequence[float], b: Sequence[float]) -> float:
    a_norm = _normalize(list(a))
    b_norm = _normalize(list(b))
    return float(sum(x * y for x, y in zip(a_norm, b_norm, strict=False)))


def _grade_to_points(grade: str) -> float:
    return GRADE_POINTS.get((grade or "").strip().upper(), 0.0)


def _normalize_grade(points: float) -> float:
    if GRADE_RANGE <= 0:
        return 0.0
    return (points - MIN_GRADE_POINTS) / GRADE_RANGE


def _as_number(value: object, default: float) -> float:
    try:
        return float(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _get_value(item: object, attr_name: str, default: object) -> object:
    if isinstance(item, dict):
        return item.get(attr_name, default)
    return getattr(item, attr_name, default)


def compute_class_strength_score(
    tutor_classes: Sequence[object],
    student_classes: Sequence[object],
    *,
    ta_bonus: float = 0.5,
    help_weight: float = 0.5,
    inverse_grade_weight: float = 0.5,
) -> float:
    """
    Compare tutor strength vs student need on overlapping classes.

    Expects tutor class items with:
      - class_id
      - grade_received
      - has_taed (bool)
    Expects student class items with:
      - class_id
      - help_level (1..10)
      - estimated_grade
    Accepts either dict rows or objects with attributes.
    """
    if not tutor_classes or not student_classes:
        return 0.0

    tutor_by_class: dict[int, tuple[float, bool]] = {}
    for row in tutor_classes:
        class_id_raw = _get_value(row, "class_id", None)
        if class_id_raw is None:
            continue
        class_id = int(class_id_raw)
        grade_received = str(_get_value(row, "grade_received", ""))
        has_taed = bool(_get_value(row, "has_taed", False))
        tutor_by_class[class_id] = (_grade_to_points(grade_received), has_taed)

    if not tutor_by_class:
        return 0.0

    overlap_scores: list[float] = []
    for row in student_classes:
        class_id_raw = _get_value(row, "class_id", None)
        if class_id_raw is None:
            continue
        class_id = int(class_id_raw)
        if class_id not in tutor_by_class:
            continue

        tutor_grade_points, has_taed = tutor_by_class[class_id]
        tutor_strength_points = tutor_grade_points + (ta_bonus if has_taed else 0.0)
        tutor_strength_norm = max(
            0.0,
            min(1.0, tutor_strength_points / (MAX_GRADE_POINTS + ta_bonus)),
        )

        help_level = _as_number(_get_value(row, "help_level", 5), 5.0)
        help_level_norm = max(0.0, min(1.0, (help_level - 1.0) / 9.0))

        student_grade_points = _grade_to_points(str(_get_value(row, "estimated_grade", "")))
        student_grade_norm = _normalize_grade(student_grade_points)
        inverse_grade_need = 1.0 - student_grade_norm

        student_need = (
            help_weight * help_level_norm
            + inverse_grade_weight * inverse_grade_need
        )
        if (help_weight + inverse_grade_weight) > 0:
            student_need = student_need / (help_weight + inverse_grade_weight)
        student_need = max(0.0, min(1.0, student_need))

        overlap_scores.append(tutor_strength_norm * student_need)

    if not overlap_scores:
        return 0.0
    return sum(overlap_scores) / len(overlap_scores)


def score_tutor(student: StudentFeatures, tutor: TutorFeatures) -> dict:
    sim_bio = cosine_sim(embed_text(student.bio or ""), embed_text(tutor.bio or ""))
    sim_help = cosine_sim(
        embed_text(join_list(student.help_needed)),
        embed_text(join_list(tutor.help_provided)),
    )
    sim_locations = cosine_sim(
        embed_text(join_list(student.locations)),
        embed_text(join_list(tutor.locations)),
    )
    weighted_sum = (
        WEIGHTS["bio"] * sim_bio
        + WEIGHTS["help"] * sim_help
        + WEIGHTS["locations"] * sim_locations
    )
    final_score = weighted_sum / (WEIGHTS["bio"] + WEIGHTS["help"] + WEIGHTS["locations"])
    return {
        "tutor_id": tutor.tutor_id,
        "score": final_score,
        "components": {"bio": sim_bio, "help": sim_help, "locations": sim_locations},
    }


def rank_tutors(student: StudentFeatures, tutors: Sequence[TutorFeatures], top_k: int = 10) -> list[dict]:
    scored = [score_tutor(student, tutor) for tutor in tutors]
    scored.sort(key=lambda row: row["score"], reverse=True)
    return scored[:top_k]


class TutorMatchResult(TypedDict):
    tutor_id: int
    final_score: float
    embedding_similarity: float
    class_strength: float
    availability_overlap: float
    location_match: float


class TutorCandidateResult(TypedDict):
    tutor_id: int  # users.id
    embedding_similarity: float


def _minutes(t: time) -> int:
    return (t.hour * 60) + t.minute


def _availability_overlap_score(
    student_slots: Sequence[UserAvailability],
    tutor_slots: Sequence[UserAvailability],
) -> float:
    if not student_slots or not tutor_slots:
        return 0.0

    total_student_minutes = 0
    overlap_minutes = 0
    tutor_by_day: dict[int, list[UserAvailability]] = {}

    for slot in tutor_slots:
        tutor_by_day.setdefault(slot.day_of_week, []).append(slot)

    for s in student_slots:
        s_start = _minutes(s.start_time)
        s_end = _minutes(s.end_time)
        if s_end <= s_start:
            continue
        total_student_minutes += (s_end - s_start)
        for t_slot in tutor_by_day.get(s.day_of_week, []):
            t_start = _minutes(t_slot.start_time)
            t_end = _minutes(t_slot.end_time)
            if t_end <= t_start:
                continue
            overlap = max(0, min(s_end, t_end) - max(s_start, t_start))
            overlap_minutes += overlap

    if total_student_minutes <= 0:
        return 0.0
    return max(0.0, min(1.0, overlap_minutes / total_student_minutes))


def _location_match_score(
    student_locations: Sequence[str] | None,
    tutor_locations: Sequence[str] | None,
) -> float:
    student_set = {loc.strip() for loc in (student_locations or []) if loc and loc.strip()}
    if not student_set:
        return 0.0
    tutor_set = {loc.strip() for loc in (tutor_locations or []) if loc and loc.strip()}
    return len(student_set.intersection(tutor_set)) / len(student_set)


def knn_retrieve_candidates(
    db: Session,
    *,
    student_id: int,
    top_k: int = 50,
    model_name: str = "local-hash-v1",
    bio_weight: float = 1.0,
    help_weight: float = 1.0,
    locations_weight: float = 0.5,
) -> list[TutorCandidateResult]:
    """
    First-stage KNN-like retrieval over weighted embedding similarity.

    Returns tutor user IDs (users.id), suitable to pass directly into
    rerank_candidates(..., candidate_tutor_ids=[...]).
    """
    student = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    if student is None:
        return []

    tutors = db.query(TutorProfile).all()
    if not tutors:
        return []

    tutor_user_ids = [t.user_id for t in tutors]
    embedding_rows = (
        db.query(UserEmbedding)
        .filter(
            UserEmbedding.model_name == model_name,
            UserEmbedding.user_id.in_([student.user_id, *tutor_user_ids]),
            UserEmbedding.field_name.in_(["bio", "help", "locations"]),
        )
        .all()
    )
    embedding_map = {
        (row.user_id, row.entity_type, row.field_name): row.embedding
        for row in embedding_rows
    }

    # Fallback to deterministic local embedding if cached row is missing.
    student_bio_vec = embedding_map.get((student.user_id, "student", "bio")) or embed_text(student.bio or "")
    student_help_vec = embedding_map.get((student.user_id, "student", "help")) or embed_text(
        join_list(student.help_needed)
    )
    student_locations_vec = embedding_map.get((student.user_id, "student", "locations")) or embed_text(
        join_list(student.preferred_locations)
    )

    weight_sum = bio_weight + help_weight + locations_weight
    if weight_sum <= 0:
        weight_sum = 1.0

    scored: list[TutorCandidateResult] = []
    for tutor in tutors:
        tutor_bio_vec = embedding_map.get((tutor.user_id, "tutor", "bio")) or embed_text(tutor.bio or "")
        tutor_help_vec = embedding_map.get((tutor.user_id, "tutor", "help")) or embed_text(
            join_list(tutor.help_provided)
        )
        tutor_locations_vec = embedding_map.get((tutor.user_id, "tutor", "locations")) or embed_text(
            join_list(tutor.preferred_locations)
        )

        sim_bio = cosine_sim(student_bio_vec, tutor_bio_vec)
        sim_help = cosine_sim(student_help_vec, tutor_help_vec)
        sim_locations = cosine_sim(student_locations_vec, tutor_locations_vec)
        embedding_similarity = (
            (bio_weight * sim_bio)
            + (help_weight * sim_help)
            + (locations_weight * sim_locations)
        ) / weight_sum

        scored.append({"tutor_id": tutor.user_id, "embedding_similarity": embedding_similarity})

    scored.sort(key=lambda row: row["embedding_similarity"], reverse=True)
    return scored[:top_k]


def rerank_candidates(
    db: Session,
    *,
    student_id: int,
    candidate_tutor_ids: list[int],
    top_k: int = 10,
    embedding_weight: float = 0.45,
    class_strength_weight: float = 0.35,
    availability_weight: float = 0.10,
    location_weight: float = 0.10,
    model_name: str = "local-hash-v1",
) -> list[TutorMatchResult]:
    if not candidate_tutor_ids:
        return []

    student = db.query(StudentProfile).filter(StudentProfile.user_id == student_id).first()
    if student is None:
        return []

    tutors = (
        db.query(TutorProfile)
        .filter(TutorProfile.user_id.in_(candidate_tutor_ids))
        .all()
    )
    if not tutors:
        return []

    tutor_by_id = {t.user_id: t for t in tutors}
    tutor_user_ids = [t.user_id for t in tutors]

    embedding_rows = (
        db.query(UserEmbedding)
        .filter(
            UserEmbedding.model_name == model_name,
            UserEmbedding.user_id.in_([student.user_id, *tutor_user_ids]),
            UserEmbedding.field_name.in_(["bio", "help", "locations"]),
        )
        .all()
    )
    embedding_map = {
        (row.user_id, row.entity_type, row.field_name): row.embedding
        for row in embedding_rows
    }

    student_slots = db.query(UserAvailability).filter(UserAvailability.user_id == student.user_id).all()
    tutor_slots = db.query(UserAvailability).filter(UserAvailability.user_id.in_(tutor_user_ids)).all()
    tutor_slots_by_user: dict[int, list[UserAvailability]] = {}
    for slot in tutor_slots:
        tutor_slots_by_user.setdefault(slot.user_id, []).append(slot)

    scored: list[TutorMatchResult] = []
    for tutor_id in candidate_tutor_ids:
        tutor = tutor_by_id.get(tutor_id)
        if tutor is None:
            continue

        sim_bio = cosine_sim(
            embedding_map.get((student.user_id, "student", "bio"), []),
            embedding_map.get((tutor.user_id, "tutor", "bio"), []),
        )
        sim_help = cosine_sim(
            embedding_map.get((student.user_id, "student", "help"), []),
            embedding_map.get((tutor.user_id, "tutor", "help"), []),
        )
        sim_locations = cosine_sim(
            embedding_map.get((student.user_id, "student", "locations"), []),
            embedding_map.get((tutor.user_id, "tutor", "locations"), []),
        )
        embedding_similarity = (
            (WEIGHTS["bio"] * sim_bio)
            + (WEIGHTS["help"] * sim_help)
            + (WEIGHTS["locations"] * sim_locations)
        ) / (WEIGHTS["bio"] + WEIGHTS["help"] + WEIGHTS["locations"])

        class_strength = compute_class_strength_score(
            tutor_classes=tutor.classes_tutoring,
            student_classes=student.classes_enrolled,
        )
        availability_overlap = _availability_overlap_score(
            student_slots=student_slots,
            tutor_slots=tutor_slots_by_user.get(tutor.user_id, []),
        )
        location_match = _location_match_score(student.preferred_locations, tutor.preferred_locations)

        weight_sum = embedding_weight + class_strength_weight + availability_weight + location_weight
        if weight_sum <= 0:
            weight_sum = 1.0
        final_score = (
            (embedding_weight * embedding_similarity)
            + (class_strength_weight * class_strength)
            + (availability_weight * availability_overlap)
            + (location_weight * location_match)
        ) / weight_sum

        scored.append(
            {
                "tutor_id": tutor.user_id,
                "final_score": final_score,
                "embedding_similarity": embedding_similarity,
                "class_strength": class_strength,
                "availability_overlap": availability_overlap,
                "location_match": location_match,
            }
        )

    scored.sort(key=lambda row: row["final_score"], reverse=True)
    return scored[:top_k]