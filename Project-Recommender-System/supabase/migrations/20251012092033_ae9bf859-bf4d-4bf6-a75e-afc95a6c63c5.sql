-- Add foreign key from student_subjects to profiles
ALTER TABLE public.student_subjects
ADD CONSTRAINT student_subjects_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;