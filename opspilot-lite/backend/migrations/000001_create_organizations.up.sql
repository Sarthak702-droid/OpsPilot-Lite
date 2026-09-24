CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE TABLE organizations (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, industry text NOT NULL DEFAULT '', currency char(3) NOT NULL DEFAULT 'INR', timezone text NOT NULL DEFAULT 'Asia/Kolkata', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
