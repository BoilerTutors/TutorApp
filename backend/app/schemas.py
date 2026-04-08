from datetime import datetime, time
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, model_validator, field_validator


# Type aliases for the session status and semester code
SessionStatus = Literal["pending", "accepted", "declined", "completed", "cancelled"]
SemesterCode = Literal["F", "S"]

# ===========================================================
# ---- User schemas ----
# ===========================================================

class AdminCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class AdminUpdate(BaseModel):
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(default=None, min_length=8)


class AdminPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr

class UserCreate(BaseModel):
    email: EmailStr
    first_name: str = Field(min_length=1, max_length=255)
    last_name: str = Field(min_length=1, max_length=255)
    password: str = Field(min_length=8)
    is_tutor: bool = False
    is_student: bool = True

    tutor_profile: Optional["TutorProfileCreate"] = None
    student_profile: Optional["StudentProfileCreate"] = None

    @field_validator("email")
    @classmethod
    def validate_purdue_email(cls, v: EmailStr) -> EmailStr:
        email = str(v).lower().strip()
        local, separator, domain = email.rpartition("@")
        if domain != "purdue.edu" or not local:
            raise ValueError("Email must be a Purdue email (@purdue.edu)")
        return v

class UserUpdate(BaseModel):
    first_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    is_tutor: Optional[bool] = None
    is_student: Optional[bool] = None
    mfa_enabled: Optional[bool] = None


class UserStatusUpdate(BaseModel):
    """Update a user's account status: 0=active, 1=disabled, 2=banned."""

    status: int = Field(ge=0, le=2)


class ProfileUpdate(BaseModel):
    """Update current user profile (name + optional tutor/student profile fields)."""

    first_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    last_name: Optional[str] = Field(default=None, min_length=1, max_length=255)
    tutor_profile: Optional["TutorProfileUpdate"] = None
    student_profile: Optional["StudentProfileUpdate"] = None


class DeleteAccountRequest(BaseModel):
    """Confirm account deletion by typing DELETE."""

    confirmation: str = Field(min_length=1)

    @field_validator("confirmation")
    @classmethod
    def must_be_delete(cls, v: str) -> str:
        if v.strip().upper() != "DELETE":
            raise ValueError('You must type DELETE to confirm permanent account deletion')
        return v.strip().upper()


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    first_name: str
    last_name: str
    is_tutor: bool
    is_student: bool
    stripe_account_id: Optional[str] = None
    created_at: datetime
    mfa_enabled: bool

    tutor: Optional["TutorProfilePublic"] = None
    student: Optional["StudentProfilePublic"] = None


class UserLookupPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    first_name: str
    last_name: str


class UserProfileDetailsPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    first_name: str
    last_name: str
    is_tutor: bool
    is_student: bool
    tutor: Optional["TutorProfilePublic"] = None
    student: Optional["StudentProfilePublic"] = None
    student_average_help_level: Optional[float] = None

# ===========================================================
# ---- Tutor profile schemas ----
# ===========================================================

class TutorProfileCreate(BaseModel):
    bio: Optional[str] = None
    hourly_rate_cents: Optional[int] = None
    major: Optional[str] = Field(default=None, max_length=120)
    grad_year: Optional[int] = None
    preferred_locations: Optional[list[str]] = None
    classes: Optional[list["TutorClassCreate"]] = None
    help_provided: Optional[list[str]] = None
    session_mode: Optional[str] = None  # "online" | "in_person" | "both"
    max_sessions_per_week: Optional[int] = Field(default=None, ge=1, le=168)


class TutorProfileUpdate(BaseModel):
    bio: Optional[str] = None
    hourly_rate_cents: Optional[int] = None
    major: Optional[str] = Field(default=None, max_length=120)
    grad_year: Optional[int] = None
    preferred_locations: Optional[list[str]] = None
    help_provided: Optional[list[str]] = None
    session_mode: Optional[str] = None  # "online" | "in_person" | "both"
    classes: Optional[list["TutorClassCreate"]] = None
    matching_paused: Optional[bool] = None
    max_sessions_per_week: Optional[int] = Field(default=None, ge=1, le=168)


class TutorClassWithClassPublic(BaseModel):
    """TutorClass with course_code from the related Class."""
    id: int
    tutor_id: int
    class_id: int
    semester: str
    year_taken: int
    grade_received: str
    has_taed: bool
    hourly_rate_cents: Optional[int] = None
    course_code: str
    professor: Optional[str] = None


class TutorProfilePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    bio: Optional[str] = None
    hourly_rate_cents: Optional[int] = None
    major: Optional[str] = None
    grad_year: Optional[int] = None
    preferred_locations: Optional[list[str]] = None
    average_rating: Optional[float] = None
    help_provided: Optional[list[str]] = None
    session_mode: Optional[str] = None
    matching_paused: bool = False
    max_sessions_per_week: Optional[int] = None
    classes_tutoring: list["TutorClassWithClassPublic"] = []

    @model_validator(mode="wrap")
    @classmethod
    def build_classes_tutoring(cls, data: object, handler):
        """Build classes_tutoring from ORM TutorClass objects with class_ relation."""
        if hasattr(data, "classes_tutoring") and not isinstance(data, dict):
            tutor = data
            classes_data = []
            for tc in tutor.classes_tutoring:
                c = getattr(tc, "class_", None)
                course_code = f"{c.subject} {c.class_number}" if c else "Unknown"
                classes_data.append(
                    TutorClassWithClassPublic(
                        id=tc.id,
                        tutor_id=tc.tutor_id,
                        class_id=tc.class_id,
                        semester=tc.semester,
                        year_taken=tc.year_taken,
                        grade_received=tc.grade_received,
                        has_taed=tc.has_taed,
                        hourly_rate_cents=tc.hourly_rate_cents,
                        course_code=course_code,
                        professor=c.professor if c else None,
                    )
                )
            avg_rating = tutor.average_rating
            return handler(
                {
                    "id": tutor.id,
                    "user_id": tutor.user_id,
                    "bio": tutor.bio,
                    "hourly_rate_cents": tutor.hourly_rate_cents,
                    "major": tutor.major,
                    "grad_year": tutor.grad_year,
                    "preferred_locations": tutor.preferred_locations,
                    "average_rating": avg_rating,
                    "help_provided": tutor.help_provided,
                    "session_mode": getattr(tutor, "session_mode", None),
                    "matching_paused": getattr(tutor, "matching_paused", False),
                    "max_sessions_per_week": getattr(tutor, "max_sessions_per_week", None),
                    "classes_tutoring": classes_data,
                }
            )
        return handler(data)

# ===========================================================
# ---- Student profile schemas ----
# ===========================================================

class StudentProfileCreate(BaseModel):
    bio: Optional[str] = None
    major: Optional[str] = Field(default=None, max_length=120)
    grad_year: Optional[int] = None
    preferred_locations: Optional[list[str]] = None
    classes: Optional[list["StudentClassCreate"]] = None
    help_needed: Optional[list[str]] = None
    session_mode: Optional[str] = None  # "online" | "in_person" | "both"
    max_hourly_rate_cents: Optional[int] = Field(default=None, ge=0)


class StudentProfileUpdate(BaseModel):
    bio: Optional[str] = None
    major: Optional[str] = Field(default=None, max_length=120)
    grad_year: Optional[int] = None
    preferred_locations: Optional[list[str]] = None
    help_needed: Optional[list[str]] = None
    session_mode: Optional[str] = None  # "online" | "in_person" | "both"
    max_hourly_rate_cents: Optional[int] = Field(default=None, ge=0)


class StudentProfilePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    bio: Optional[str] = None
    major: Optional[str] = None
    grad_year: Optional[int] = None
    preferred_locations: Optional[list[str]] = None
    help_needed: Optional[list[str]] = None
    session_mode: Optional[str] = None
    max_hourly_rate_cents: Optional[int] = None


# ===========================================================
# ---- Availability schemas ----
# ===========================================================

class AvailabilityCreate(BaseModel):
    day_of_week: int = Field(ge=0, le=6)
    start_time: time
    end_time: time

    @model_validator(mode="after")
    def validate_time_order(self):
        if self.start_time >= self.end_time:
            raise ValueError("start_time must be before end_time")
        return self

class AvailabilityPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    day_of_week: int
    start_time: time
    end_time: time

# ===========================================================
# ---- Tutoring session schemas ----
# ===========================================================
class TutoringSessionCreate(BaseModel):
    tutor_id: int
    subject: str = Field(min_length=1, max_length=255)
    scheduled_start: datetime
    scheduled_end: datetime
    cost_cents: int = Field(ge=0)
    notes: Optional[str] = None


class TutoringSessionUpdate(BaseModel):
    status: Optional[SessionStatus] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    notes: Optional[str] = None
    cancel_reason: Optional[str] = None


class TutoringSessionPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tutor_id: int
    student_id: int
    subject: str
    scheduled_start: datetime
    scheduled_end: datetime
    cost_cents: int
    notes: Optional[str] = None
    status: SessionStatus
    purchased_at: datetime


def tutoring_session_status_for_api(raw: str) -> SessionStatus:
    """Map DB/session row status to API SessionStatus (legacy `confirmed` → `accepted`)."""
    if raw == "confirmed":
        return "accepted"
    return raw  # type: ignore[return-value]


def tutoring_session_to_public(row: "TutoringSession") -> TutoringSessionPublic:
    """Build TutoringSessionPublic from an ORM row; normalizes legacy statuses."""
    return TutoringSessionPublic(
        id=row.id,
        tutor_id=row.tutor_id,
        student_id=row.student_id,
        subject=row.subject,
        scheduled_start=row.scheduled_start,
        scheduled_end=row.scheduled_end,
        cost_cents=row.cost_cents,
        notes=row.notes,
        status=tutoring_session_status_for_api(row.status),
        purchased_at=row.purchased_at,
    )


class AdminTutoringSessionPublic(BaseModel):
    id: int
    tutor_id: int
    student_id: int
    tutor_name: str
    student_name: str
    subject: str
    scheduled_start: datetime
    scheduled_end: datetime
    cost_cents: int
    notes: Optional[str] = None
    status: SessionStatus
    purchased_at: datetime


def admin_tutoring_session_dict_to_public(session: dict) -> AdminTutoringSessionPublic:
    """Normalize legacy `status` for admin list payloads built from raw SQL rows."""
    payload = dict(session)
    if isinstance(payload.get("status"), str):
        payload["status"] = tutoring_session_status_for_api(payload["status"])
    return AdminTutoringSessionPublic.model_validate(payload)
      
      
class SessionVerificationCodePublic(BaseModel):
    verification_code: str = Field(min_length=6, max_length=6)


class SessionVerificationVerifyRequest(BaseModel):
    pin: str = Field(min_length=6, max_length=6)


class CurrentSessionExistsPublic(BaseModel):
    has_current_session: bool
    session_id: Optional[int] = None
    other_user_id: Optional[int] = None
    is_verified: Optional[bool] = None

# ===========================================================
# ---- Review schemas ----
# ===========================================================

class ReviewCreate(BaseModel):
    session_id: int
    class_id: int
    rating: float = Field(ge=1.0, le=5.0)
    comment: Optional[str] = None
    is_anonymous: bool = False


class ReviewUpdate(BaseModel):
    rating: Optional[float] = Field(default=None, ge=1.0, le=5.0)
    comment: Optional[str] = None
    is_anonymous: Optional[bool] = None


class ReviewPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    session_id: int
    class_id: int
    rating: float
    comment: Optional[str] = None
    is_anonymous: bool
    created_at: datetime
    updated_at: datetime

# ===========================================================
# ---- Class schemas ----
# ===========================================================
class ClassCreate(BaseModel):
    subject: str = Field(min_length=1, max_length=20)
    class_number: int
    professor: str = Field(min_length=1, max_length=255)


class ClassPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    subject: str
    class_number: int
    professor: str

    @computed_field
    @property
    def course_code(self) -> str:
        return f"{self.subject} {self.class_number}"

# ===========================================================
# ---- StudentClass schemas ----
# ===========================================================
class StudentClassCreate(BaseModel):
    class_id: int
    help_level: int = Field(ge=1, le=10)
    estimated_grade: str = Field(max_length=2)


class StudentClassPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    class_id: int
    help_level: int
    estimated_grade: str

# ===========================================================
# ---- TutorClass schemas ----
# ===========================================================

class TutorClassCreate(BaseModel):
    class_id: int
    semester: SemesterCode
    year_taken: int
    grade_received: str = Field(max_length=2)
    has_taed: bool = False
    hourly_rate_cents: Optional[int] = None


class TutorClassPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tutor_id: int
    class_id: int
    semester: SemesterCode
    year_taken: int
    grade_received: str
    has_taed: bool
    hourly_rate_cents: Optional[int] = None

# ===========================================================
# ---- Auth / misc schemas ----
# ===========================================================
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginResponse(BaseModel):
    access_token: Optional[str] = None
    token_type: str = "bearer"
    mfa_required: bool = False


class MfaVerifyRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)


class TokenPayload(BaseModel):
    sub: Optional[str] = None


class Message(BaseModel):
    message: str

class SecurityPreferencesUpdate(BaseModel):
    mfa_enabled: bool

class MfaVerifyRequest(BaseModel):
    email: EmailStr
    code: str = Field(min_length=6, max_length=6)
# ===========================================================
# ---- Messaging schemas ----
# ===========================================================

class MessageCreate(BaseModel):
    content: str = Field(min_length=1, max_length=10000)


class MessagePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    conversation_id: int
    sender_id: int
    content: str
    attachment: Optional["MessageAttachmentPublic"] = None
    created_at: datetime


class ConversationCreate(BaseModel):
    """Start or get a conversation with another user."""
    other_user_id: int


class ConversationPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user1_id: int
    user2_id: int
    created_at: datetime
    updated_at: datetime


class ConversationWithPartner(BaseModel):
    """Conversation list item: conversation plus the other user's id and last message preview."""
    model_config = ConfigDict(from_attributes=True)

    id: int
    user1_id: int
    user2_id: int
    created_at: datetime
    updated_at: datetime
    other_user_id: int
    other_user_first_name: Optional[str] = None
    other_user_last_name: Optional[str] = None
    last_message: Optional[MessagePublic] = None


# ===========================================================
# ---- Matching schemas ----
# ===========================================================
class MatchResultPublic(BaseModel):
    rank: int
    tutor_id: int
    tutor_profile_id: Optional[int] = None
    tutor_first_name: str
    tutor_last_name: str
    tutor_major: Optional[str] = None
    tutor_hourly_rate_cents: Optional[int] = None
    similarity_score: float
    embedding_similarity: Optional[float] = None
    class_strength: Optional[float] = None
    availability_overlap: Optional[float] = None
    location_match: Optional[float] = None
    tutor_matching_paused: bool = False
    tutor_weekly_cap_reached: bool = False


class MatchSelectRequest(BaseModel):
    tutor_id: int
    class_id: Optional[int] = None


class MatchUnmatchRequest(BaseModel):
    student_id: Optional[int] = None
    tutor_id: Optional[int] = None


class DeviceTokenRegisterRequest(BaseModel):
    token: str
    platform: Optional[str] = None


class DeviceTokenPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    token: str
    platform: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class NotificationPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    event_type: str
    title: str
    body: str
    payload_json: Optional[dict] = None
    is_read: bool
    created_at: datetime


class NotificationPreferencesPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    email_digest_enabled: bool
    email_digest_frequency: Literal["12h", "daily", "weekly"] = "daily"
    updated_at: datetime


class NotificationPreferencesUpdate(BaseModel):
    email_digest_enabled: bool
    email_digest_frequency: Literal["12h", "daily", "weekly"] = "daily"


class MessageAttachmentPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    message_id: int
    file_name: str
    mime_type: str
    size_bytes: int
    created_at: datetime


UserCreate.model_rebuild()
UserPublic.model_rebuild()
MessagePublic.model_rebuild()

ProfileUpdate.model_rebuild()

class TutoringSessionStudentPublic(BaseModel):
    """Session as seen by the student — includes tutor_id for name lookup."""
    model_config = ConfigDict(from_attributes=True)
 
    id: int
    tutor_id: int
    student_id: int
    subject: str
    scheduled_start: datetime
    scheduled_end: datetime
    cost_cents: int
    notes: Optional[str] = None
    status: SessionStatus
    purchased_at: datetime
 
 
# --- Report schemas ---


class AdminMessageCreate(BaseModel):
    tutor_id: int
    message: str = Field(min_length=1, max_length=4000)
    refund_requested: bool = False


class AdminMessagePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    student_id: int
    tutor_id: int
    message: str
    refund_requested: bool
    created_at: datetime
 
class ReportCreate(BaseModel):
    tutor_id: int
    session_id: Optional[int] = None
    reason: str = Field(min_length=20, max_length=2000)
 
 
class ReportPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)
 
    id: int
    reporter_id: int
    tutor_id: int
    session_id: Optional[int] = None
    reason: str
    status: str
    created_at: datetime
