-- Create subjects table for managing student subjects per term
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student_subjects junction table (max 3 per term)
CREATE TABLE public.student_subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  subject_code TEXT NOT NULL,
  term TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, subject_code, term)
);

-- Enable Row Level Security
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_subjects ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subjects
CREATE POLICY "Everyone can view subjects"
  ON public.subjects
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage subjects"
  ON public.subjects
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role = 'admin'::user_role
  ));

-- RLS Policies for student_subjects
CREATE POLICY "Users can view their own subjects"
  ON public.student_subjects
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own subject enrollments"
  ON public.student_subjects
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subject enrollments"
  ON public.student_subjects
  FOR DELETE
  USING (auth.uid() = user_id);

-- Insert some default subjects
INSERT INTO public.subjects (code, name, description) VALUES
  ('COMP3900', 'Computer Science Project', 'Major team-based software engineering project'),
  ('COMP4920', 'Professional Issues and Ethics', 'Capstone project course'),
  ('SENG2011', 'Software Engineering Workshop', 'Practical software development'),
  ('COMP9900', 'IT Project', 'Postgraduate team project');

-- Create function to check subject limit per term
CREATE OR REPLACE FUNCTION check_subject_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (
    SELECT COUNT(*)
    FROM public.student_subjects
    WHERE user_id = NEW.user_id AND term = NEW.term
  ) >= 3 THEN
    RAISE EXCEPTION 'Students can only enroll in maximum 3 subjects per term';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for subject limit
CREATE TRIGGER enforce_subject_limit
  BEFORE INSERT ON public.student_subjects
  FOR EACH ROW
  EXECUTE FUNCTION check_subject_limit();