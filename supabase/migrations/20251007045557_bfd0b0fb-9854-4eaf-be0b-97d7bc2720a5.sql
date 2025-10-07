-- Make optional fields nullable in student_profiles
ALTER TABLE public.student_profiles 
  ALTER COLUMN university DROP NOT NULL,
  ALTER COLUMN experience_level DROP NOT NULL,
  ALTER COLUMN preferred_team_size DROP NOT NULL,
  ALTER COLUMN time_commitment DROP NOT NULL,
  ALTER COLUMN preferred_project_duration DROP NOT NULL;