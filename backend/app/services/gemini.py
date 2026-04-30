"""Gemini API integration for transcript verification."""

import json
import os
from typing import Any

import google.generativeai as genai


def _get_gemini_model():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable not set")
    genai.configure(api_key=api_key)
    return genai.GenerativeModel("gemini-1.5-flash")


def _build_prompt(
    transcript_text: str,
    full_name: str,
    claimed_classes: list[dict[str, Any]],
) -> str:
    claimed_json = json.dumps(claimed_classes, indent=2)
    return f"""You are a transcript verifier. Decide if a transcript is valid for the given user.

A transcript is VALID only if ALL of the following are true:
1. It is a Purdue University transcript (e.g., contains "Purdue University" or equivalent identification).
2. The user's full name appears on the transcript.
3. Every claimed class appears on the transcript with subject + course number matching.
4. The grade on the transcript for each claimed class is equal to or better than the claimed grade.

USER FULL NAME: {full_name}

CLAIMED CLASSES (JSON):
{claimed_json}

TRANSCRIPT TEXT:
{transcript_text}

Respond with ONLY this JSON shape (no markdown, no extra text):
{{
  "success": true | false,
  "reason": "short human-readable reason explaining the decision"
}}
"""


def verify_transcript(
    transcript_text: str,
    full_name: str,
    claimed_classes: list[dict[str, Any]],
) -> tuple[bool, str]:
    """
    Ask Gemini whether a transcript is valid for the given user + claimed classes.

    Args:
        transcript_text: Cleaned text from the transcript PDF (via Textract).
        full_name: The current user's full name (e.g., "Gavin McCormack").
        claimed_classes: List of dicts the frontend wants to add as TutorClasses.
            Each dict should include at minimum: subject, course_number, claimed_grade.

    Returns:
        (success, reason) - success is True only if Gemini confirms all four checks
        (Purdue origin, name on transcript, all classes present, grades match/beat).
    """
    if not claimed_classes:
        return False, "No claimed classes provided"

    prompt = _build_prompt(transcript_text, full_name, claimed_classes)

    model = _get_gemini_model()
    response = model.generate_content(
        prompt,
        generation_config=genai.GenerationConfig(
            response_mime_type="application/json",
            temperature=0.1,
        ),
    )

    raw = response.text.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]

    try:
        parsed = json.loads(raw)
    except json.JSONDecodeError:
        return False, "Gemini returned an unparseable response"

    success = bool(parsed.get("success", False))
    reason = str(parsed.get("reason", "")).strip() or (
        "Verified" if success else "Verification failed"
    )
    return success, reason
