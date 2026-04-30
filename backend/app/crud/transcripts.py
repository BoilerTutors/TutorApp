"""CRUD/helper operations for transcripts stored in S3 + processed by AWS Textract."""

import os
import re
import time
from typing import Any

import boto3


def _get_textract_client():
    return boto3.client(
        "textract",
        region_name=os.getenv("AWS_DEFAULT_REGION", "us-east-1"),
    )


def _clean(s: str) -> str:
    """Normalize Textract text output: ligatures, page markers, whitespace."""
    s = (
        s.replace("\ufb01", "fi")
        .replace("\ufb02", "fl")
        .replace("\ufb03", "ffi")
        .replace("\ufb04", "ffl")
    )
    s = re.sub(r"\n--\s*\d+\s*of\s*\d+\s*--\s*\n", "\n", s)
    s = re.sub(r"[ \t]+\n", "\n", s)
    s = re.sub(r"\n{3,}", "\n\n", s)
    return s.strip()


def extract_transcript_text_from_s3(
    s3_key: str,
    bucket: str | None = None,
    poll_interval_seconds: float = 3.0,
    timeout_seconds: float = 300.0,
) -> str:
    """
    Run AWS Textract on a transcript PDF stored in S3 and return the cleaned text.

    Args:
        s3_key: The S3 object key for the transcript PDF (e.g. "transcripts/42/abc.pdf").
        bucket: The S3 bucket name. Defaults to the S3_TRANSCRIPTS_BUCKET env var.
        poll_interval_seconds: How often to poll Textract for job completion.
        timeout_seconds: Maximum time to wait for Textract to finish.

    Returns:
        A single cleaned string of all extracted text lines joined by newlines.

    Raises:
        RuntimeError: If the bucket is not configured, the job fails, or it times out.
    """
    bucket = bucket or os.getenv("S3_TRANSCRIPTS_BUCKET")
    if not bucket:
        raise RuntimeError("S3 bucket not configured (S3_TRANSCRIPTS_BUCKET env var)")

    textract = _get_textract_client()

    start_response = textract.start_document_text_detection(
        DocumentLocation={"S3Object": {"Bucket": bucket, "Name": s3_key}},
    )
    job_id = start_response["JobId"]

    deadline = time.time() + timeout_seconds
    job_status = "IN_PROGRESS"
    while job_status == "IN_PROGRESS":
        if time.time() > deadline:
            raise RuntimeError(f"Textract job {job_id} timed out after {timeout_seconds}s")
        time.sleep(poll_interval_seconds)
        status_response = textract.get_document_text_detection(JobId=job_id)
        job_status = status_response["JobStatus"]

    if job_status != "SUCCEEDED":
        raise RuntimeError(
            f"Textract job {job_id} failed with status {job_status}: "
            f"{status_response.get('StatusMessage', '')}"
        )

    blocks: list[dict[str, Any]] = list(status_response.get("Blocks", []))
    next_token = status_response.get("NextToken")
    while next_token:
        page = textract.get_document_text_detection(JobId=job_id, NextToken=next_token)
        blocks.extend(page.get("Blocks", []))
        next_token = page.get("NextToken")

    lines = [
        block.get("Text", "")
        for block in blocks
        if block.get("BlockType") == "LINE" and block.get("Text")
    ]

    return _clean("\n".join(lines))
