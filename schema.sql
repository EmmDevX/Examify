-- Run this once to set up your database:
-- psql -d jambquiz -f schema.sql

CREATE TYPE IF NOT EXISTS user_role AS ENUM ('student', 'admin');
CREATE TYPE IF NOT EXISTS quiz_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE IF NOT EXISTS attempt_status AS ENUM ('in_progress', 'completed');

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  avatar TEXT,
  role user_role NOT NULL DEFAULT 'student',
  school TEXT,
  state TEXT,
  target_score INTEGER,
  courses TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subjects (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS quizzes (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  subject_id INTEGER REFERENCES subjects(id),
  duration_minutes INTEGER NOT NULL DEFAULT 30,
  total_questions INTEGER NOT NULL DEFAULT 0,
  status quiz_status NOT NULL DEFAULT 'draft',
  scheduled_at TIMESTAMPTZ,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS questions (
  id SERIAL PRIMARY KEY,
  quiz_id INTEGER REFERENCES quizzes(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_option CHAR(1) NOT NULL CHECK (correct_option IN ('a','b','c','d')),
  explanation TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attempts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  quiz_id INTEGER REFERENCES quizzes(id),
  status attempt_status NOT NULL DEFAULT 'in_progress',
  score INTEGER,
  total_questions INTEGER,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS answers (
  id SERIAL PRIMARY KEY,
  attempt_id INTEGER REFERENCES attempts(id) ON DELETE CASCADE,
  question_id INTEGER REFERENCES questions(id),
  selected_option CHAR(1) CHECK (selected_option IN ('a','b','c','d')),
  is_correct BOOLEAN
);

-- Seed subjects
INSERT INTO subjects (name, code) VALUES
  ('Public Speaking Essentials', 'GEL 102'),
  ('Mathematics', 'MTH'),
  ('Physics', 'PHY'),
  ('Chemistry', 'CHM'),
  ('Biology', 'BIO'),
  ('Government', 'GOV'),
  ('Economics', 'ECO'),
  ('Literature in English', 'LIT'),
  ('Geography', 'GEO'),
  ('Christian Religious Studies', 'CRS'),
  ('Islamic Religious Studies', 'IRS'),
  ('Commerce', 'COM'),
  ('Accounting', 'ACC'),
  ('Agricultural Science', 'AGR'),
  ('Computer Studies', 'CST')
ON CONFLICT (code) DO NOTHING;

-- To make a user admin, run AFTER they register:
-- UPDATE users SET role = 'admin' WHERE email = 'techhub248@gmail.com';
