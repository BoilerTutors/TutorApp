--
-- PostgreSQL database dump
--

\restrict kVlPYplHLICPAxr16AD42cdXS0KsNdOt7qGlGD48B3zUITKlKnJLvXdywlb5dMK

-- Dumped from database version 16.12
-- Dumped by pg_dump version 17.8 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.classes (
    id integer NOT NULL,
    subject character varying(255) NOT NULL,
    course_code character varying(20) NOT NULL,
    professor character varying(255) NOT NULL
);


--
-- Name: classes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.classes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: classes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.classes_id_seq OWNED BY public.classes.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conversations (
    id integer NOT NULL,
    user1_id integer NOT NULL,
    user2_id integer NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.conversations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- Name: match_runs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.match_runs (
    id integer NOT NULL,
    student_id integer NOT NULL,
    model_name character varying(128) DEFAULT 'local-hash-v1'::character varying NOT NULL,
    top_k integer NOT NULL,
    weights_json jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: match_runs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.match_runs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: match_runs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.match_runs_id_seq OWNED BY public.match_runs.id;


--
-- Name: matches; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matches (
    id integer NOT NULL,
    run_id integer NOT NULL,
    student_id integer NOT NULL,
    tutor_id integer NOT NULL,
    rank integer NOT NULL,
    similarity_score double precision NOT NULL,
    embedding_similarity double precision,
    class_strength double precision,
    availability_overlap double precision,
    location_match double precision,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: matches_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.matches_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: matches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.matches_id_seq OWNED BY public.matches.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    sender_id integer NOT NULL,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id integer NOT NULL,
    event_type character varying(32) NOT NULL,
    title character varying(255) NOT NULL,
    body text NOT NULL,
    payload_json jsonb,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reviews (
    id integer NOT NULL,
    session_id integer NOT NULL,
    class_id integer NOT NULL,
    rating double precision NOT NULL,
    comment text,
    is_anonymous boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_review_rating_range CHECK (((rating >= (1.0)::double precision) AND (rating <= (5.0)::double precision)))
);


--
-- Name: reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reviews_id_seq OWNED BY public.reviews.id;


--
-- Name: student_classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.student_classes (
    id integer NOT NULL,
    student_id integer NOT NULL,
    class_id integer NOT NULL,
    help_level integer NOT NULL,
    estimated_grade character varying(2) NOT NULL,
    CONSTRAINT ck_help_level_range CHECK (((help_level >= 1) AND (help_level <= 10)))
);


--
-- Name: student_classes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.student_classes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: student_classes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.student_classes_id_seq OWNED BY public.student_classes.id;


--
-- Name: students; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.students (
    id integer NOT NULL,
    user_id integer NOT NULL,
    major character varying(120),
    grad_year integer,
    preferred_locations text[] DEFAULT '{}'::text[],
    help_needed text[] DEFAULT '{}'::text[],
    bio text
);


--
-- Name: students_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.students_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: students_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.students_id_seq OWNED BY public.students.id;


--
-- Name: tutor_classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tutor_classes (
    id integer NOT NULL,
    tutor_id integer NOT NULL,
    class_id integer NOT NULL,
    semester character varying(1) NOT NULL,
    year_taken integer NOT NULL,
    grade_received character varying(2) NOT NULL,
    has_taed boolean DEFAULT false NOT NULL,
    CONSTRAINT ck_semester_value CHECK (((semester)::text = ANY ((ARRAY['F'::character varying, 'S'::character varying])::text[])))
);


--
-- Name: tutor_classes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tutor_classes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tutor_classes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tutor_classes_id_seq OWNED BY public.tutor_classes.id;


--
-- Name: tutoring_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tutoring_sessions (
    id integer NOT NULL,
    tutor_id integer NOT NULL,
    student_id integer NOT NULL,
    scheduled_start timestamp with time zone NOT NULL,
    scheduled_end timestamp with time zone NOT NULL,
    subject character varying(255) NOT NULL,
    cost_cents integer NOT NULL,
    notes text,
    status character varying(30) NOT NULL,
    purchased_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT ck_session_status CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'confirmed'::character varying, 'completed'::character varying, 'cancelled'::character varying])::text[]))),
    CONSTRAINT ck_session_time_order CHECK ((scheduled_end > scheduled_start))
);


--
-- Name: tutoring_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tutoring_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tutoring_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tutoring_sessions_id_seq OWNED BY public.tutoring_sessions.id;


--
-- Name: tutors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tutors (
    id integer NOT NULL,
    user_id integer NOT NULL,
    bio text,
    hourly_rate_cents integer,
    major character varying(120),
    grad_year integer,
    preferred_locations text[] DEFAULT '{}'::text[],
    help_provided text[] DEFAULT '{}'::text[]
);


--
-- Name: tutors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tutors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tutors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tutors_id_seq OWNED BY public.tutors.id;


--
-- Name: user_availabilities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_availabilities (
    id integer NOT NULL,
    user_id integer NOT NULL,
    day_of_week integer NOT NULL,
    start_time time without time zone NOT NULL,
    end_time time without time zone NOT NULL,
    CONSTRAINT ck_availability_day CHECK (((day_of_week >= 0) AND (day_of_week <= 6))),
    CONSTRAINT ck_availability_time_order CHECK ((start_time < end_time))
);


--
-- Name: user_availabilities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_availabilities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_availabilities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_availabilities_id_seq OWNED BY public.user_availabilities.id;


--
-- Name: user_embeddings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_embeddings (
    id integer NOT NULL,
    user_id integer NOT NULL,
    entity_type character varying(16) NOT NULL,
    field_name character varying(32) NOT NULL,
    model_name character varying(128) DEFAULT 'local-hash-v1'::character varying NOT NULL,
    embedding double precision[] NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_embeddings_entity_type_check CHECK (((entity_type)::text = ANY ((ARRAY['student'::character varying, 'tutor'::character varying])::text[]))),
    CONSTRAINT user_embeddings_field_name_check CHECK (((field_name)::text = ANY ((ARRAY['bio'::character varying, 'help'::character varying, 'locations'::character varying])::text[])))
);


--
-- Name: user_embeddings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.user_embeddings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: user_embeddings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.user_embeddings_id_seq OWNED BY public.user_embeddings.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    email character varying(255) NOT NULL,
    first_name character varying(255) NOT NULL,
    last_name character varying(255) NOT NULL,
    hashed_password character varying(255) NOT NULL,
    mfa_enabled boolean NOT NULL,
    mfa_code character varying(50),
    mfa_expires_at timestamp with time zone,
    mfa_code_attempts integer NOT NULL,
    is_tutor boolean NOT NULL,
    is_student boolean NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    status integer DEFAULT 0 NOT NULL
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: classes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes ALTER COLUMN id SET DEFAULT nextval('public.classes_id_seq'::regclass);


--
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- Name: match_runs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_runs ALTER COLUMN id SET DEFAULT nextval('public.match_runs_id_seq'::regclass);


--
-- Name: matches id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches ALTER COLUMN id SET DEFAULT nextval('public.matches_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews ALTER COLUMN id SET DEFAULT nextval('public.reviews_id_seq'::regclass);


--
-- Name: student_classes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_classes ALTER COLUMN id SET DEFAULT nextval('public.student_classes_id_seq'::regclass);


--
-- Name: students id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students ALTER COLUMN id SET DEFAULT nextval('public.students_id_seq'::regclass);


--
-- Name: tutor_classes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_classes ALTER COLUMN id SET DEFAULT nextval('public.tutor_classes_id_seq'::regclass);


--
-- Name: tutoring_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutoring_sessions ALTER COLUMN id SET DEFAULT nextval('public.tutoring_sessions_id_seq'::regclass);


--
-- Name: tutors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutors ALTER COLUMN id SET DEFAULT nextval('public.tutors_id_seq'::regclass);


--
-- Name: user_availabilities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_availabilities ALTER COLUMN id SET DEFAULT nextval('public.user_availabilities_id_seq'::regclass);


--
-- Name: user_embeddings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_embeddings ALTER COLUMN id SET DEFAULT nextval('public.user_embeddings_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: classes classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT classes_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: match_runs match_runs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_runs
    ADD CONSTRAINT match_runs_pkey PRIMARY KEY (id);


--
-- Name: matches matches_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: reviews reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_pkey PRIMARY KEY (id);


--
-- Name: student_classes student_classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_classes
    ADD CONSTRAINT student_classes_pkey PRIMARY KEY (id);


--
-- Name: students students_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_pkey PRIMARY KEY (id);


--
-- Name: tutor_classes tutor_classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_classes
    ADD CONSTRAINT tutor_classes_pkey PRIMARY KEY (id);


--
-- Name: tutoring_sessions tutoring_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutoring_sessions
    ADD CONSTRAINT tutoring_sessions_pkey PRIMARY KEY (id);


--
-- Name: tutors tutors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutors
    ADD CONSTRAINT tutors_pkey PRIMARY KEY (id);


--
-- Name: classes uq_class_identity; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.classes
    ADD CONSTRAINT uq_class_identity UNIQUE (subject, course_code, professor);


--
-- Name: conversations uq_conversation_pair; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT uq_conversation_pair UNIQUE (user1_id, user2_id);


--
-- Name: matches uq_matches_run_rank; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT uq_matches_run_rank UNIQUE (run_id, rank);


--
-- Name: matches uq_matches_run_tutor; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT uq_matches_run_tutor UNIQUE (run_id, tutor_id);


--
-- Name: reviews uq_review_per_session; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT uq_review_per_session UNIQUE (session_id);


--
-- Name: student_classes uq_student_class; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_classes
    ADD CONSTRAINT uq_student_class UNIQUE (student_id, class_id);


--
-- Name: students uq_students_user_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT uq_students_user_id UNIQUE (user_id);


--
-- Name: tutor_classes uq_tutor_class; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_classes
    ADD CONSTRAINT uq_tutor_class UNIQUE (tutor_id, class_id);


--
-- Name: tutors uq_tutors_user_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutors
    ADD CONSTRAINT uq_tutors_user_id UNIQUE (user_id);


--
-- Name: user_availabilities user_availabilities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_availabilities
    ADD CONSTRAINT user_availabilities_pkey PRIMARY KEY (id);


--
-- Name: user_embeddings user_embeddings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_embeddings
    ADD CONSTRAINT user_embeddings_pkey PRIMARY KEY (id);


--
-- Name: user_embeddings user_embeddings_user_id_entity_type_field_name_model_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_embeddings
    ADD CONSTRAINT user_embeddings_user_id_entity_type_field_name_model_name_key UNIQUE (user_id, entity_type, field_name, model_name);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: ix_classes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_classes_id ON public.classes USING btree (id);


--
-- Name: ix_classes_subject; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_classes_subject ON public.classes USING btree (subject);


--
-- Name: ix_conversations_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_conversations_id ON public.conversations USING btree (id);


--
-- Name: ix_conversations_user1_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_conversations_user1_id ON public.conversations USING btree (user1_id);


--
-- Name: ix_conversations_user2_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_conversations_user2_id ON public.conversations USING btree (user2_id);


--
-- Name: ix_match_runs_student_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_match_runs_student_created ON public.match_runs USING btree (student_id, created_at DESC);


--
-- Name: ix_matches_run_rank; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_matches_run_rank ON public.matches USING btree (run_id, rank);


--
-- Name: ix_matches_student_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_matches_student_score ON public.matches USING btree (student_id, similarity_score DESC);


--
-- Name: ix_messages_conversation_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_messages_conversation_id ON public.messages USING btree (conversation_id);


--
-- Name: ix_messages_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_messages_id ON public.messages USING btree (id);


--
-- Name: ix_messages_sender_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_messages_sender_id ON public.messages USING btree (sender_id);


--
-- Name: ix_notifications_user_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_user_created ON public.notifications USING btree (user_id, created_at DESC);


--
-- Name: ix_notifications_user_unread; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_notifications_user_unread ON public.notifications USING btree (user_id, is_read, created_at DESC);


--
-- Name: ix_reviews_class_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reviews_class_id ON public.reviews USING btree (class_id);


--
-- Name: ix_reviews_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reviews_id ON public.reviews USING btree (id);


--
-- Name: ix_reviews_session_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_reviews_session_id ON public.reviews USING btree (session_id);


--
-- Name: ix_student_classes_class_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_student_classes_class_id ON public.student_classes USING btree (class_id);


--
-- Name: ix_student_classes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_student_classes_id ON public.student_classes USING btree (id);


--
-- Name: ix_student_classes_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_student_classes_student_id ON public.student_classes USING btree (student_id);


--
-- Name: ix_students_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_students_id ON public.students USING btree (id);


--
-- Name: ix_students_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_students_user_id ON public.students USING btree (user_id);


--
-- Name: ix_tutor_classes_class_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tutor_classes_class_id ON public.tutor_classes USING btree (class_id);


--
-- Name: ix_tutor_classes_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tutor_classes_id ON public.tutor_classes USING btree (id);


--
-- Name: ix_tutor_classes_tutor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tutor_classes_tutor_id ON public.tutor_classes USING btree (tutor_id);


--
-- Name: ix_tutoring_sessions_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tutoring_sessions_id ON public.tutoring_sessions USING btree (id);


--
-- Name: ix_tutoring_sessions_student_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tutoring_sessions_student_id ON public.tutoring_sessions USING btree (student_id);


--
-- Name: ix_tutoring_sessions_tutor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tutoring_sessions_tutor_id ON public.tutoring_sessions USING btree (tutor_id);


--
-- Name: ix_tutors_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_tutors_id ON public.tutors USING btree (id);


--
-- Name: ix_tutors_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_tutors_user_id ON public.tutors USING btree (user_id);


--
-- Name: ix_user_availabilities_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_availabilities_id ON public.user_availabilities USING btree (id);


--
-- Name: ix_user_availabilities_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_availabilities_user_id ON public.user_availabilities USING btree (user_id);


--
-- Name: ix_user_embeddings_entity_field; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_embeddings_entity_field ON public.user_embeddings USING btree (entity_type, field_name);


--
-- Name: ix_user_embeddings_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_user_embeddings_user_id ON public.user_embeddings USING btree (user_id);


--
-- Name: ix_users_email; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX ix_users_email ON public.users USING btree (email);


--
-- Name: ix_users_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX ix_users_id ON public.users USING btree (id);


--
-- Name: conversations conversations_user1_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_user1_id_fkey FOREIGN KEY (user1_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_user2_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_user2_id_fkey FOREIGN KEY (user2_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: match_runs match_runs_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.match_runs
    ADD CONSTRAINT match_runs_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: matches matches_run_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_run_id_fkey FOREIGN KEY (run_id) REFERENCES public.match_runs(id) ON DELETE CASCADE;


--
-- Name: matches matches_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: matches matches_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matches
    ADD CONSTRAINT matches_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: notifications notifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: reviews reviews_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reviews
    ADD CONSTRAINT reviews_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.tutoring_sessions(id) ON DELETE CASCADE;


--
-- Name: student_classes student_classes_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_classes
    ADD CONSTRAINT student_classes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: student_classes student_classes_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.student_classes
    ADD CONSTRAINT student_classes_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.students(id) ON DELETE CASCADE;


--
-- Name: students students_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.students
    ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tutor_classes tutor_classes_class_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_classes
    ADD CONSTRAINT tutor_classes_class_id_fkey FOREIGN KEY (class_id) REFERENCES public.classes(id) ON DELETE CASCADE;


--
-- Name: tutor_classes tutor_classes_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutor_classes
    ADD CONSTRAINT tutor_classes_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.tutors(id) ON DELETE CASCADE;


--
-- Name: tutoring_sessions tutoring_sessions_student_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutoring_sessions
    ADD CONSTRAINT tutoring_sessions_student_id_fkey FOREIGN KEY (student_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tutoring_sessions tutoring_sessions_tutor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutoring_sessions
    ADD CONSTRAINT tutoring_sessions_tutor_id_fkey FOREIGN KEY (tutor_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: tutors tutors_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tutors
    ADD CONSTRAINT tutors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_availabilities user_availabilities_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_availabilities
    ADD CONSTRAINT user_availabilities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: user_embeddings user_embeddings_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_embeddings
    ADD CONSTRAINT user_embeddings_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict kVlPYplHLICPAxr16AD42cdXS0KsNdOt7qGlGD48B3zUITKlKnJLvXdywlb5dMK

