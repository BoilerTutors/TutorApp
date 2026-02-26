from datetime import datetime, time
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr
from sqlalchemy import (
    ARRAY,
    String,
    Integer,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
    func,
    UniqueConstraint,
    Time,
    Float,
    CheckConstraint,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


# ===========================================
# Users, Tutor Profiles, and Student Profiles
# ============================================
class User(Base):
    # Name of the table in the database
    __tablename__ = "users"

    # Basic User fields. Passwords are hashed using bcrypt before being stored in the database.
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    mfa_code: Mapped[Optional[str]] = mapped_column(String(50), nullable=True) # character string for the MFA code
    mfa_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    mfa_code_attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    # A user can be student, tutor, or both
    is_tutor: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_student: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    # Account status: 0=active, 1=disabled, 2=banned
    status: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    # 1-to-1 relationships (what other tables are linked to this one)
    # If you use user.tutor_profile, you can get the tutor profile associated with the user, or None if the user is not a tutor
    # Same concept for user.student_profile
    # "all, delete-orphan" means that if the user is deleted, the tutor profile and student profile will also be deleted
    # "back_populates" means that the tutor profile and student profile will have a reference to the user
    tutor: Mapped[Optional["TutorProfile"]] = relationship(
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    student: Mapped[Optional["StudentProfile"]] = relationship(
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )

    sessions_as_tutor: Mapped[list["TutoringSession"]] = relationship(
        foreign_keys="TutoringSession.tutor_id",
        back_populates="tutor",
    )

    sessions_as_student: Mapped[list["TutoringSession"]] = relationship(
        foreign_keys="TutoringSession.student_id",
        back_populates="student",
    )

    available_times: Mapped[list["UserAvailability"]] = relationship(
    back_populates="user",
    cascade="all, delete-orphan",
    )

    # Messaging: messages this user sent
    messages_sent: Mapped[list["Message"]] = relationship(
        foreign_keys="Message.sender_id",
        back_populates="sender",
    )
    embeddings: Mapped[list["UserEmbedding"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    device_tokens: Mapped[list["UserDeviceToken"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    notification_settings: Mapped[Optional["UserNotificationSetting"]] = relationship(
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
    )


class UserEmbedding(Base):
    __tablename__ = "user_embeddings"
    __table_args__ = (
        UniqueConstraint(
            "user_id",
            "entity_type",
            "field_name",
            "model_name",
            name="uq_user_embedding_slot",
        ),
        CheckConstraint("entity_type IN ('student', 'tutor')", name="ck_embedding_entity"),
        CheckConstraint("field_name IN ('bio', 'help', 'locations')", name="ck_embedding_field"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    entity_type: Mapped[str] = mapped_column(String(16), nullable=False)
    field_name: Mapped[str] = mapped_column(String(32), nullable=False)
    model_name: Mapped[str] = mapped_column(String(128), nullable=False, default="local-hash-v1")
    embedding: Mapped[list[float]] = mapped_column(ARRAY(Float), nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped["User"] = relationship(back_populates="embeddings")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    event_type: Mapped[str] = mapped_column(String(32), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    body: Mapped[str] = mapped_column(Text, nullable=False)
    payload_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    is_read: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    user: Mapped["User"] = relationship(back_populates="notifications")


class UserDeviceToken(Base):
    __tablename__ = "user_device_tokens"
    __table_args__ = (
        UniqueConstraint("token", name="uq_user_device_token_value"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token: Mapped[str] = mapped_column(String(255), nullable=False)
    platform: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped["User"] = relationship(back_populates="device_tokens")


class UserNotificationSetting(Base):
    __tablename__ = "user_notification_settings"

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        index=True,
    )
    email_digest_enabled: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
        server_default="false",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )

    user: Mapped["User"] = relationship(back_populates="notification_settings")


class TutorProfile(Base):
    __tablename__ = "tutors"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_tutors_user_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Foreign Key -> users.id (unique, one tutor profile per user)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    hourly_rate_cents: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    major: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    grad_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    preferred_locations: Mapped[Optional[list[str]]] = mapped_column(
        ARRAY(Text), nullable=True, default=None
    )
    help_provided: Mapped[Optional[list[str]]] = mapped_column(
        ARRAY(Text), nullable=True, default=None
    )
    # Session mode: "online" | "in_person" | "both"
    session_mode: Mapped[Optional[str]] = mapped_column(String(20), nullable=True, default="both")

    user: Mapped["User"] = relationship(back_populates="tutor")
    classes_tutoring: Mapped[list["TutorClass"]] = relationship(
        back_populates="tutor",
        cascade="all, delete-orphan",
    )

    @property
    def reviews_received(self) -> list["Review"]:
        return [s.review for s in self.user.sessions_as_tutor if s.review is not None]

    @property
    def average_rating(self) -> Optional[float]:
        reviews = self.reviews_received
        if not reviews:
            return None
        return sum(r.rating for r in reviews) / len(reviews)

class StudentProfile(Base):
    __tablename__ = "students"
    __table_args__ = (
        UniqueConstraint("user_id", name="uq_students_user_id"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Foreign Key -> users.id (unique => one student profile per user)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )

    bio: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    major: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    grad_year: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    preferred_locations: Mapped[Optional[list[str]]] = mapped_column(
        ARRAY(Text), nullable=True, default=None
    )
    help_needed: Mapped[Optional[list[str]]] = mapped_column(
        ARRAY(Text), nullable=True, default=None
    )

    user: Mapped["User"] = relationship(back_populates="student")
    classes_enrolled: Mapped[list["StudentClass"]] = relationship(
        back_populates="student",
        cascade="all, delete-orphan",
    )

    @property
    def reviews_written(self) -> list["Review"]:
        return [s.review for s in self.user.sessions_as_student if s.review is not None]

# ============================================
# User/Tutor/Student One-to-Many Attributes.
# UserAvailability, TutoringSession, Reviews, etc.
# ============================================

# Time slots that a user is available for tutoring, or to give tutoring sessions
class UserAvailability(Base):
    __tablename__ = "user_availabilities"
    __table_args__ = (
        CheckConstraint("day_of_week >= 0 AND day_of_week <= 6", name="ck_availability_day"),
        CheckConstraint("start_time < end_time", name="ck_availability_time_order"),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)   # 0=Mon, 1=Tues, ...., 6=Sun
    start_time: Mapped[time] = mapped_column(Time, nullable=False)
    end_time: Mapped[time] = mapped_column(Time, nullable=False)

    user: Mapped["User"] = relationship(back_populates="available_times")

# History of tutoring sessions. This will be used to store the history of tutoring sessions for a user
class TutoringSession(Base):
    __tablename__ = "tutoring_sessions"
    __table_args__ = (
        CheckConstraint("scheduled_end > scheduled_start", name="ck_session_time_order"),
        CheckConstraint(
            "status IN ('pending', 'confirmed', 'completed', 'cancelled')",
            name="ck_session_status",
        ),
    )
    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    # Foreign Keys to users.id of the tutor and student
    tutor_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    student_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    # --------------------------Tutoring Session Attributes--------------------------
    # 1. Dates and times of session, 2. subject, cost, and notes, then 3. The status of the session
    scheduled_start: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    scheduled_end: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    cost_cents: Mapped[int] = mapped_column(Integer, nullable=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # pending | confirmed | completed | cancelled
    status: Mapped[str] = mapped_column(
        String(30), nullable=False, default="pending"
    ) 

    # When the purchase happened
    purchased_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    # Relationships back to Users
    student: Mapped["User"] = relationship(
        foreign_keys=[student_id],
        back_populates="sessions_as_student",
    )

    tutor: Mapped["User"] = relationship(
        foreign_keys=[tutor_id],
        back_populates="sessions_as_tutor",
    )
    # Reviews given by students to tutors for tutoring sessions
    review: Mapped[Optional["Review"]] = relationship(
        back_populates="session",
        cascade="all, delete-orphan",
        uselist=False,
    )

# Reviews given by students to tutors for tutoring sessions.
# Student and tutor are derived from the linked TutoringSession (no duplicate FKs).
class Review(Base):
    __tablename__ = "reviews"
    __table_args__ = (
        UniqueConstraint("session_id", name="uq_review_per_session"),
        CheckConstraint("rating >= 1.0 AND rating <= 5.0", name="ck_review_rating_range"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)

    session_id: Mapped[int] = mapped_column(
        ForeignKey("tutoring_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    class_id: Mapped[int] = mapped_column(
        ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )

    rating: Mapped[float] = mapped_column(Float, nullable=False)  # 1.0 - 5.0
    comment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_anonymous: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    session: Mapped["TutoringSession"] = relationship(back_populates="review")
    class_: Mapped["Class"] = relationship()

    @property
    def student(self) -> "User":
        return self.session.student

    @property
    def tutor(self) -> "User":
        return self.session.tutor


# ============================================
# Messaging: Conversations and Messages
# ============================================
# Conversation: a thread between two users. user1_id < user2_id for canonical ordering.
class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (
        UniqueConstraint("user1_id", "user2_id", name="uq_conversation_pair"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user1_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user2_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at",
    )


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    conversation_id: Mapped[int] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sender_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    content: Mapped[str] = mapped_column(Text, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
    sender: Mapped["User"] = relationship(
        foreign_keys=[sender_id],
        back_populates="messages_sent",
    )


# ============================================
# Classes and Class Enrollments
# ============================================

class Class(Base):
    __tablename__ = "classes"
    __table_args__ = (
        UniqueConstraint("subject", "class_number", "professor", name="uq_class_identity"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    subject: Mapped[str] = mapped_column(String(20), nullable=False, index=True)       # e.g. "CS"
    class_number: Mapped[int] = mapped_column(Integer, nullable=False)                  # e.g. 251
    professor: Mapped[str] = mapped_column(String(255), nullable=False)                 # e.g. "Gustavo"

    student_classes: Mapped[list["StudentClass"]] = relationship(
        back_populates="class_",
        cascade="all, delete-orphan",
    )
    tutor_classes: Mapped[list["TutorClass"]] = relationship(
        back_populates="class_",
        cascade="all, delete-orphan",
    )

"""
StudentClass gives information about a student's class enrollment.
It is a one-to-many relationship between a student and a class.
It gives additional information about the student's class enrollment, such as the 
help level they need and their estimated current grade in the class.
"""
class StudentClass(Base):
    __tablename__ = "student_classes"
    # There must be only one student class per student and class combination
    __table_args__ = (
        UniqueConstraint("student_id", "class_id", name="uq_student_class"),
        CheckConstraint("help_level >= 1 AND help_level <= 10", name="ck_help_level_range"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    class_id: Mapped[int] = mapped_column(
        ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    help_level: Mapped[int] = mapped_column(Integer, nullable=False)  # 1-10 scale
    estimated_grade: Mapped[str] = mapped_column(String(2), nullable=False)  # "A+", "A", "A-", "B+", etc.
    student: Mapped["StudentProfile"] = relationship(back_populates="classes_enrolled")
    class_: Mapped["Class"] = relationship(back_populates="student_classes")


class TutorClass(Base):
    __tablename__ = "tutor_classes"
    __table_args__ = (
        UniqueConstraint("tutor_id", "class_id", name="uq_tutor_class"),
        CheckConstraint("semester IN ('F', 'S')", name="ck_semester_value"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    tutor_id: Mapped[int] = mapped_column(
        ForeignKey("tutors.id", ondelete="CASCADE"), nullable=False, index=True
    )
    class_id: Mapped[int] = mapped_column(
        ForeignKey("classes.id", ondelete="CASCADE"), nullable=False, index=True
    )
    semester: Mapped[str] = mapped_column(String(1), nullable=False)        # "F" or "S"
    year_taken: Mapped[int] = mapped_column(Integer, nullable=False)        # e.g. 2025
    grade_received: Mapped[str] = mapped_column(String(2), nullable=False)  # "A+", "A", "A-", "B+", etc.
    has_taed: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    tutor: Mapped["TutorProfile"] = relationship(back_populates="classes_tutoring")
    class_: Mapped["Class"] = relationship(back_populates="tutor_classes")


class MatchRun(Base):
    __tablename__ = "match_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    model_name: Mapped[str] = mapped_column(String(128), nullable=False, default="local-hash-v1")
    top_k: Mapped[int] = mapped_column(Integer, nullable=False)
    weights_json: Mapped[Optional[dict]] = mapped_column(JSON, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    matches: Mapped[list["Match"]] = relationship(
        back_populates="run", cascade="all, delete-orphan"
    )


class Match(Base):
    __tablename__ = "matches"
    __table_args__ = (
        UniqueConstraint("run_id", "rank", name="uq_matches_run_rank"),
        UniqueConstraint("run_id", "tutor_id", name="uq_matches_run_tutor"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("match_runs.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    tutor_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    similarity_score: Mapped[float] = mapped_column(Float, nullable=False)
    embedding_similarity: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    class_strength: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    availability_overlap: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    location_match: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    run: Mapped["MatchRun"] = relationship(back_populates="matches")
