import os
import uuid
from datetime import datetime, timezone
from typing import Any

import boto3
from botocore.config import Config
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.crud.transcripts import extract_transcript_text_from_s3
from app.models import Class, TranscriptSubmission, User
from app.schemas import Message, TutorClassCreate
from app.services.textract import (
    build_llm_transcript_context,
    get_transcript_analysis,
    start_transcript_analysis,
)
from app.services.gemini import verify_transcript

router = APIRouter()


def get_s3_client():
    return boto3.client(
        "s3",
        region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
        config=Config(signature_version="s3v4"),
    )


def get_bucket_name() -> str:
    bucket = os.getenv("S3_TRANSCRIPTS_BUCKET")
    if not bucket:
        raise HTTPException(status_code=500, detail="S3 bucket not configured")
    return bucket


class PresignedUrlResponse(BaseModel):
    upload_url: str
    s3_key: str
    expires_in: int


class ConfirmUploadRequest(BaseModel):
    s3_key: str
    file_name: str
    mime_type: str = "application/pdf"


class TranscriptSubmissionPublic(BaseModel):
    id: int
    user_id: int
    status: str
    file_name: str
    storage_path: str
    submitted_at: datetime

    class Config:
        from_attributes = True


class TextractStartResponse(BaseModel):
    submission_id: int
    job_id: str
    status: str


class TextractAnalysisResponse(BaseModel):
    submission_id: int
    job_id: str
    job_status: str
    status_message: str | None = None
    warnings: list[dict[str, Any]] = []
    document_metadata: dict[str, Any] = {}
    transcript_context: dict[str, Any] | None = None


@router.post("/presigned-upload-url", response_model=PresignedUrlResponse)
def get_presigned_upload_url(
    current_user: User = Depends(get_current_user),
):
    """Generate a presigned URL for uploading a transcript PDF directly to S3."""
    s3 = get_s3_client()
    bucket = get_bucket_name()

    file_id = uuid.uuid4().hex
    s3_key = f"transcripts/{current_user.id}/{file_id}.pdf"

    expires_in = 300

    upload_url = s3.generate_presigned_url(
        "put_object",
        Params={
            "Bucket": bucket,
            "Key": s3_key,
            "ContentType": "application/pdf",
        },
        ExpiresIn=expires_in,
    )

    return PresignedUrlResponse(
        upload_url=upload_url,
        s3_key=s3_key,
        expires_in=expires_in,
    )


@router.post("/confirm-upload", response_model=TranscriptSubmissionPublic)
def confirm_transcript_upload(
    body: ConfirmUploadRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Confirm that a transcript was uploaded to S3 and create the DB record."""
    if not body.s3_key.startswith(f"transcripts/{current_user.id}/"):
        raise HTTPException(status_code=403, detail="Invalid S3 key for this user")

    submission = TranscriptSubmission(
        user_id=current_user.id,
        status="uploaded",
        file_name=body.file_name,
        mime_type=body.mime_type,
        storage_path=body.s3_key,
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    return submission


@router.post("/{submission_id}/textract/start", response_model=TextractStartResponse)
def start_textract_for_transcript(
    submission_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Start Textract analysis for a confirmed transcript PDF in S3."""
    submission = db.get(TranscriptSubmission, submission_id)
    if not submission or submission.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transcript submission not found")

    if submission.mime_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF transcripts are supported")

    bucket = get_bucket_name()
    try:
        job_id = start_transcript_analysis(bucket, submission.storage_path)
    except Exception as exc:
        submission.status = "failed"
        submission.processed_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(
            status_code=502,
            detail=f"Failed to start Textract analysis: {exc}",
        ) from exc

    submission.status = "processing"
    db.commit()

    return TextractStartResponse(
        submission_id=submission.id,
        job_id=job_id,
        status=submission.status,
    )


@router.get("/{submission_id}/textract/result", response_model=TextractAnalysisResponse)
def get_textract_result_for_transcript(
    submission_id: int,
    job_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Poll Textract and return LLM-ready transcript context once complete."""
    submission = db.get(TranscriptSubmission, submission_id)
    if not submission or submission.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transcript submission not found")

    try:
        analysis = get_transcript_analysis(job_id)
    except Exception as exc:
        submission.status = "failed"
        submission.processed_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(
            status_code=502,
            detail=f"Failed to fetch Textract analysis: {exc}",
        ) from exc

    job_status = analysis["job_status"]
    transcript_context = None

    if job_status == "SUCCEEDED":
        submission.status = "parsed"
        submission.processed_at = datetime.now(timezone.utc)
        transcript_context = build_llm_transcript_context(analysis["blocks"])
        db.commit()
    elif job_status == "FAILED":
        submission.status = "failed"
        submission.processed_at = datetime.now(timezone.utc)
        db.commit()

    return TextractAnalysisResponse(
        submission_id=submission.id,
        job_id=job_id,
        job_status=job_status,
        status_message=analysis.get("status_message"),
        warnings=analysis.get("warnings", []),
        document_metadata=analysis.get("document_metadata", {}),
        transcript_context=transcript_context,
    )


@router.post("/{submission_id}/verify", response_model=Message)
def verify_transcript_against_claimed_classes(
    submission_id: int,
    claimed_classes: list[TutorClassCreate],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Verify a transcript against the classes the tutor wants to claim.

    The frontend sends the in-progress class selections (before they are saved
    as TutorClass rows). This endpoint:
      1. Pulls cleaned text from the S3 PDF via Textract
      2. Looks up subject + course_number for each claimed class
      3. Asks Gemini to confirm Purdue origin, name match, classes present, grades match

    On success the frontend should then call PATCH /users/me to actually persist
    the TutorClass rows. On failure no TutorClasses are added.

    Returns a Message: "success: <reason>" or "failure: <reason>".
    """
    submission = db.get(TranscriptSubmission, submission_id)
    if not submission or submission.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Transcript submission not found")

    if not current_user.is_tutor:
        raise HTTPException(
            status_code=400,
            detail="Only tutors can verify transcripts against claimed classes",
        )

    if not claimed_classes:
        raise HTTPException(status_code=400, detail="No claimed classes provided")

    class_ids = [c.class_id for c in claimed_classes]
    classes = db.query(Class).filter(Class.id.in_(class_ids)).all()
    classes_by_id = {c.id: c for c in classes}

    claimed_payload: list[dict[str, Any]] = []
    for c in claimed_classes:
        cls = classes_by_id.get(c.class_id)
        if not cls:
            raise HTTPException(
                status_code=400,
                detail=f"Unknown class_id: {c.class_id}",
            )
        claimed_payload.append(
            {
                "subject": cls.subject,
                "course_number": cls.class_number,
                "claimed_grade": c.grade_received,
            }
        )

    try:
        transcript_text = extract_transcript_text_from_s3(submission.storage_path)
    except Exception as exc:
        submission.status = "failed"
        submission.processed_at = datetime.now(timezone.utc)
        db.commit()
        raise HTTPException(
            status_code=502,
            detail=f"Failed to extract transcript text from S3: {exc}",
        ) from exc

    full_name = f"{current_user.first_name} {current_user.last_name}".strip()

    try:
        success, reason = verify_transcript(
            transcript_text=transcript_text,
            full_name=full_name,
            claimed_classes=claimed_payload,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Failed to verify transcript with Gemini: {exc}",
        ) from exc

    submission.status = "verified" if success else "failed"
    submission.processed_at = datetime.now(timezone.utc)
    db.commit()

    prefix = "success" if success else "failure"
    return Message(message=f"{prefix}: {reason}")
