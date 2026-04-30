"""Verify AWS credentials and S3 bucket access (same checks as manual boto3 smoke tests).

Skipped unless these are set in ``backend/.env`` (or the environment):

- ``AWS_ACCESS_KEY_ID``
- ``AWS_SECRET_ACCESS_KEY``
- ``S3_TRANSCRIPTS_BUCKET`` (e.g. ``boilertutors-transcripts-dev``)

Optional:

- ``AWS_DEFAULT_REGION`` (defaults to ``us-east-1``)

The list call uses ``Prefix=transcripts/`` so it matches a typical
prefix-scoped IAM policy. Run only this file::

    pytest tests/integration/test_aws_s3_connection.py -v
"""

from __future__ import annotations

import os
from pathlib import Path

import pytest
from dotenv import load_dotenv

# Load backend/.env before reading os.environ (conftest also loads, but this
# file may be collected first in some tooling).
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

boto3 = pytest.importorskip("boto3", reason="Install boto3: pip install boto3")


def _aws_s3_configured() -> bool:
    return all(
        os.getenv(k)
        for k in (
            "AWS_ACCESS_KEY_ID",
            "AWS_SECRET_ACCESS_KEY",
            "S3_TRANSCRIPTS_BUCKET",
        )
    )


pytestmark = pytest.mark.skipif(
    not _aws_s3_configured(),
    reason=(
        "Set AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, and "
        "S3_TRANSCRIPTS_BUCKET in backend/.env to run AWS S3 connection tests."
    ),
)


@pytest.fixture
def aws_region() -> str:
    return os.getenv("AWS_DEFAULT_REGION", "us-east-1")


@pytest.fixture
def transcripts_bucket() -> str:
    return os.environ["S3_TRANSCRIPTS_BUCKET"]


def test_sts_get_caller_identity(aws_region: str) -> None:
    """Confirms access keys are valid and reach AWS."""
    sts = boto3.client("sts", region_name=aws_region)
    ident = sts.get_caller_identity()
    assert ident.get("Account")
    assert ident.get("Arn")


def test_s3_list_objects_under_transcripts_prefix(
    aws_region: str, transcripts_bucket: str
) -> None:
    """Confirms IAM allows ListBucket for the transcript prefix (matches app usage)."""
    s3 = boto3.client("s3", region_name=aws_region)
    resp = s3.list_objects_v2(
        Bucket=transcripts_bucket,
        Prefix="transcripts/",
        MaxKeys=5,
    )
    assert resp["ResponseMetadata"]["HTTPStatusCode"] == 200
    assert resp.get("Name") == transcripts_bucket
