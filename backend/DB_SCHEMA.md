# Database Schema

Schema reference generated from `backend/app/models.py`.

## Core Users & Profiles

### users
```sql
TABLE users (   -- Base account and auth table
    id INTEGER PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    hashed_password VARCHAR(255),
    mfa_enabled BOOLEAN,
    mfa_code VARCHAR(50),
    mfa_expires_at TIMESTAMP WITH TIME ZONE,
    mfa_code_attempts INTEGER,
    is_tutor BOOLEAN,
    is_student BOOLEAN,
    status INTEGER,   -- 0=active, 1=disabled, 2=banned
    created_at TIMESTAMP WITH TIME ZONE
);
```

### tutors
```sql
TABLE tutors (   -- Tutor profile (one-to-one with users)
    id INTEGER PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    hourly_rate_cents INTEGER,
    major VARCHAR(120),
    grad_year INTEGER,
    preferred_locations TEXT[],
    help_provided TEXT[],
    session_mode VARCHAR(20)   -- online | in_person | both
);
```

### students
```sql
TABLE students (   -- Student profile (one-to-one with users)
    id INTEGER PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    major VARCHAR(120),
    grad_year INTEGER,
    preferred_locations TEXT[],
    help_needed TEXT[]
);
```

### user_availabilities
```sql
TABLE user_availabilities (   -- Weekly recurring availability windows
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER,   -- 0=Mon ... 6=Sun
    start_time TIME,
    end_time TIME,
    CHECK (day_of_week >= 0 AND day_of_week <= 6),
    CHECK (start_time < end_time)
);
```

## Classes & Sessions

### classes
```sql
TABLE classes (
    id INTEGER PRIMARY KEY,
    subject VARCHAR(20),
    class_number INTEGER,
    professor VARCHAR(255),
    UNIQUE (subject, class_number, professor)   -- uq_class_identity
);
```

### student_classes
```sql
TABLE student_classes (   -- Student enrollment + help metadata for a class
    id INTEGER PRIMARY KEY,
    student_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    help_level INTEGER,   -- 1..10
    estimated_grade VARCHAR(2),
    UNIQUE (student_id, class_id),   -- uq_student_class
    CHECK (help_level >= 1 AND help_level <= 10)
);
```

### tutor_classes
```sql
TABLE tutor_classes (   -- Tutor history/qualification for a class
    id INTEGER PRIMARY KEY,
    tutor_id INTEGER REFERENCES tutors(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    semester VARCHAR(1),   -- F | S
    year_taken INTEGER,
    grade_received VARCHAR(2),
    has_taed BOOLEAN,
    UNIQUE (tutor_id, class_id),   -- uq_tutor_class
    CHECK (semester IN ('F', 'S'))
);
```

### tutoring_sessions
```sql
TABLE tutoring_sessions (   -- Booked tutoring session between a student and tutor
    id INTEGER PRIMARY KEY,
    tutor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    scheduled_start TIMESTAMP WITH TIME ZONE,
    scheduled_end TIMESTAMP WITH TIME ZONE,
    subject VARCHAR(255),
    cost_cents INTEGER,
    notes TEXT,
    status VARCHAR(30),   -- pending | confirmed | completed | cancelled
    purchased_at TIMESTAMP WITH TIME ZONE,
    CHECK (scheduled_end > scheduled_start),
    CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled'))
);
```

### reviews
```sql
TABLE reviews (   -- Review for a completed session, linked to a class
    id INTEGER PRIMARY KEY,
    session_id INTEGER REFERENCES tutoring_sessions(id) ON DELETE CASCADE,
    class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
    rating FLOAT,   -- 1.0..5.0
    comment TEXT,
    is_anonymous BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (session_id),   -- uq_review_per_session
    CHECK (rating >= 1.0 AND rating <= 5.0)
);
```

## Messaging

### conversations
```sql
TABLE conversations (   -- Canonical 1-to-1 user chat thread
    id INTEGER PRIMARY KEY,
    user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (user1_id, user2_id)   -- uq_conversation_pair
);
```

### messages
```sql
TABLE messages (   -- Chat messages inside a conversation
    id INTEGER PRIMARY KEY,
    conversation_id INTEGER REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT,
    created_at TIMESTAMP WITH TIME ZONE
);
```

### message_attachments
```sql
TABLE message_attachments (   -- Optional one-to-one attachment per message
    id INTEGER PRIMARY KEY,
    message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,
    file_name VARCHAR(255),
    mime_type VARCHAR(100),
    size_bytes INTEGER,
    storage_path VARCHAR(1024),
    created_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (message_id)   -- uq_message_attachments_message_id
);
```

## Notifications

### notifications
```sql
TABLE notifications (
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(32),
    title VARCHAR(255),
    body TEXT,
    payload_json JSON,
    is_read BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE
);
```

### user_device_tokens
```sql
TABLE user_device_tokens (   -- Push notification tokens for user devices
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE,   -- uq_user_device_token_value
    platform VARCHAR(32),
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE
);
```

### user_notification_settings
```sql
TABLE user_notification_settings (   -- One row per user
    user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    email_digest_enabled BOOLEAN,
    email_digest_frequency VARCHAR(16),   -- 12h | daily | weekly
    updated_at TIMESTAMP WITH TIME ZONE,
    CHECK (email_digest_frequency IN ('12h', 'daily', 'weekly'))
);
```

## Matching

### user_embeddings
```sql
TABLE user_embeddings (   -- Embeddings used by matching
    id INTEGER PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(16),   -- student | tutor
    field_name VARCHAR(32),   -- bio | help | locations
    model_name VARCHAR(128),
    embedding FLOAT[],
    updated_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (user_id, entity_type, field_name, model_name),   -- uq_user_embedding_slot
    CHECK (entity_type IN ('student', 'tutor')),
    CHECK (field_name IN ('bio', 'help', 'locations'))
);
```

### match_runs
```sql
TABLE match_runs (   -- One recommendation run for a student
    id INTEGER PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    model_name VARCHAR(128),
    top_k INTEGER,
    weights_json JSON,
    created_at TIMESTAMP WITH TIME ZONE
);
```

### matches
```sql
TABLE matches (   -- Ranked tutor results from a match run
    id INTEGER PRIMARY KEY,
    run_id INTEGER REFERENCES match_runs(id) ON DELETE CASCADE,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    tutor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    rank INTEGER,
    similarity_score FLOAT,
    embedding_similarity FLOAT,
    class_strength FLOAT,
    availability_overlap FLOAT,
    location_match FLOAT,
    created_at TIMESTAMP WITH TIME ZONE,
    UNIQUE (run_id, rank),   -- uq_matches_run_rank
    UNIQUE (run_id, tutor_id)   -- uq_matches_run_tutor
);
```
