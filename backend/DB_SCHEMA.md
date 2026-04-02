# Database Schema (from `app/models.py`)



## Table Reference

### `users`
- **PK:** `id`
- **Unique:** `email`
- **Notable columns:** auth + MFA fields, role flags (`is_tutor`, `is_student`), `status`, `created_at`
- **Referenced by:** most domain tables (sessions, notifications, messaging, matching, etc.)

### `tutors`
- **PK:** `id`
- **FK:** `user_id -> users.id` (`ON DELETE CASCADE`)
- **Unique:** `user_id` (`uq_tutors_user_id`)
- **Notable columns:** `bio`, `hourly_rate_cents`, `major`, `grad_year`, `preferred_locations[]`, `help_provided[]`, `session_mode`

### `students`
- **PK:** `id`
- **FK:** `user_id -> users.id` (`ON DELETE CASCADE`)
- **Unique:** `user_id` (`uq_students_user_id`)
- **Notable columns:** `bio`, `major`, `grad_year`, `preferred_locations[]`, `help_needed[]`

### `user_availabilities`
- **PK:** `id`
- **FK:** `user_id -> users.id` (`ON DELETE CASCADE`)
- **Checks:**
  - `day_of_week` in `0..6`
  - `start_time < end_time`
- **Notable columns:** weekly recurring availability windows

### `tutoring_sessions`
- **PK:** `id`
- **FKs:**
  - `tutor_id -> users.id` (`ON DELETE CASCADE`)
  - `student_id -> users.id` (`ON DELETE CASCADE`)
- **Checks:**
  - `scheduled_end > scheduled_start`
  - `status` in `pending | confirmed | completed | cancelled`
- **Notable columns:** `subject`, `cost_cents`, `notes`, `purchased_at`

### `reviews`
- **PK:** `id`
- **FKs:**
  - `session_id -> tutoring_sessions.id` (`ON DELETE CASCADE`)
  - `class_id -> classes.id` (`ON DELETE CASCADE`)
- **Unique:** `session_id` (`uq_review_per_session`) -> at most one review per session
- **Check:** `rating` between `1.0` and `5.0`
- **Notable columns:** `comment`, `is_anonymous`, timestamps

### `classes`
- **PK:** `id`
- **Unique:** (`subject`, `class_number`, `professor`) (`uq_class_identity`)
- **Notable columns:** class identity (`subject`, number, professor)

### `student_classes`
- **PK:** `id`
- **FKs:**
  - `student_id -> students.id` (`ON DELETE CASCADE`)
  - `class_id -> classes.id` (`ON DELETE CASCADE`)
- **Unique:** (`student_id`, `class_id`) (`uq_student_class`)
- **Check:** `help_level` between `1` and `10`
- **Notable columns:** `estimated_grade`

### `tutor_classes`
- **PK:** `id`
- **FKs:**
  - `tutor_id -> tutors.id` (`ON DELETE CASCADE`)
  - `class_id -> classes.id` (`ON DELETE CASCADE`)
- **Unique:** (`tutor_id`, `class_id`) (`uq_tutor_class`)
- **Check:** `semester` in `F | S`
- **Notable columns:** `year_taken`, `grade_received`, `has_taed`

### `conversations`
- **PK:** `id`
- **FKs:**
  - `user1_id -> users.id` (`ON DELETE CASCADE`)
  - `user2_id -> users.id` (`ON DELETE CASCADE`)
- **Unique:** (`user1_id`, `user2_id`) (`uq_conversation_pair`)
- **Notable columns:** `created_at`, `updated_at`

### `messages`
- **PK:** `id`
- **FKs:**
  - `conversation_id -> conversations.id` (`ON DELETE CASCADE`)
  - `sender_id -> users.id` (`ON DELETE CASCADE`)
- **Notable columns:** message `content`, `created_at`

### `message_attachments`
- **PK:** `id`
- **FK:** `message_id -> messages.id` (`ON DELETE CASCADE`)
- **Unique:** `message_id` (`uq_message_attachments_message_id`) -> one attachment per message
- **Notable columns:** file metadata (`file_name`, `mime_type`, `size_bytes`, `storage_path`)

### `notifications`
- **PK:** `id`
- **FK:** `user_id -> users.id` (`ON DELETE CASCADE`)
- **Notable columns:** `event_type`, `title`, `body`, `payload_json`, `is_read`, `created_at`

### `user_device_tokens`
- **PK:** `id`
- **FK:** `user_id -> users.id` (`ON DELETE CASCADE`)
- **Unique:** `token` (`uq_user_device_token_value`)
- **Notable columns:** `platform`, `created_at`, `updated_at`

### `user_notification_settings`
- **PK/FK:** `user_id -> users.id` (`ON DELETE CASCADE`) (one row per user)
- **Check:** `email_digest_frequency` in `12h | daily | weekly`
- **Notable columns:** `email_digest_enabled`, `email_digest_frequency`, `updated_at`

### `user_embeddings`
- **PK:** `id`
- **FK:** `user_id -> users.id` (`ON DELETE CASCADE`)
- **Unique:** (`user_id`, `entity_type`, `field_name`, `model_name`) (`uq_user_embedding_slot`)
- **Checks:**
  - `entity_type` in `student | tutor`
  - `field_name` in `bio | help | locations`
- **Notable columns:** `embedding` (`FLOAT[]`), `updated_at`

### `match_runs`
- **PK:** `id`
- **FK:** `student_id -> users.id` (`ON DELETE CASCADE`)
- **Notable columns:** `model_name`, `top_k`, `weights_json`, `created_at`

### `matches`
- **PK:** `id`
- **FKs:**
  - `run_id -> match_runs.id` (`ON DELETE CASCADE`)
  - `student_id -> users.id` (`ON DELETE CASCADE`)
  - `tutor_id -> users.id` (`ON DELETE CASCADE`)
- **Unique:**
  - (`run_id`, `rank`) (`uq_matches_run_rank`)
  - (`run_id`, `tutor_id`) (`uq_matches_run_tutor`)
- **Notable columns:** score breakdown fields (`similarity_score`, `embedding_similarity`, `class_strength`, `availability_overlap`, `location_match`)

## Notes

- Arrays are PostgreSQL array columns (`ARRAY(Text)` / `ARRAY(Float)`).
- Most child rows are removed automatically via `ON DELETE CASCADE`.
- The source of truth for schema remains `backend/app/models.py`.
