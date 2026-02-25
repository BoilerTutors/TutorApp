from datetime import datetime, time
from typing import Optional, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, model_validator, field_validator


# Type aliases for the session status and semester code
SessionStatus = Literal["pending", "confirmed", "completed", "cancelled"]
SemesterCode = Literal["F", "S"]

# ===========================================================
# ---- User schemas ----
# ===========================================================

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


class UserPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    email: EmailStr
    first_name: str
    last_name: str
    is_tutor: bool
    is_student: bool
    created_at: datetime

    tutor: Optional["TutorProfilePublic"] = None
    student: Optional["StudentProfilePublic"] = None

# ===========================================================
# ---- Tutor profile schemas ----
# ===========================================================

class TutorProfileCreate(BaseModel):
    bio: Optional[str] = None
    hourly_rate_cents: Optional[int] = None
    major: Optional[str] = Field(default=None, max_length=120)
    grad_year: Optional[int] = None


class TutorProfileUpdate(BaseModel):
    bio: Optional[str] = None
    hourly_rate_cents: Optional[int] = None
    major: Optional[str] = Field(default=None, max_length=120)
    grad_year: Optional[int] = None


class TutorProfilePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    bio: Optional[str] = None
    hourly_rate_cents: Optional[int] = None
    major: Optional[str] = None
    grad_year: Optional[int] = None
    average_rating: Optional[float] = None

# ===========================================================
# ---- Student profile schemas ----
# ===========================================================

class StudentProfileCreate(BaseModel):
    major: Optional[str] = Field(default=None, max_length=120)
    grad_year: Optional[int] = None


class StudentProfileUpdate(BaseModel):
    major: Optional[str] = Field(default=None, max_length=120)
    grad_year: Optional[int] = None


class StudentProfilePublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    major: Optional[str] = None
    grad_year: Optional[int] = None

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


class TutorClassPublic(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    tutor_id: int
    class_id: int
    semester: SemesterCode
    year_taken: int
    grade_received: str

# ===========================================================
# ---- Auth / misc schemas ----
# ===========================================================
class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenPayload(BaseModel):
    sub: Optional[str] = None


class Message(BaseModel):
    message: str

UserCreate.model_rebuild()
UserPublic.model_rebuild()