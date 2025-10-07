-- Add WAM and courses columns to student_profiles table
ALTER TABLE public.student_profiles
ADD COLUMN wam numeric CHECK (wam >= 0 AND wam <= 100),
ADD COLUMN courses text[] NOT NULL DEFAULT '{}'::text[];