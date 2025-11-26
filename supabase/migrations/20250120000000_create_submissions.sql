-- Create submissions table
CREATE TABLE IF NOT EXISTS public.submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  submitted_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  team_acknowledgment BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket for submissions (file size limit handled in application)
INSERT INTO storage.buckets (id, name, public)
VALUES ('submissions', 'submissions', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on submissions table
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for submissions
-- Team members can view submissions for their teams
CREATE POLICY "Team members can view their team submissions" ON public.submissions
  FOR SELECT USING (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- Team members can insert submissions for their teams
CREATE POLICY "Team members can submit for their teams" ON public.submissions
  FOR INSERT WITH CHECK (
    team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    ) AND
    submitted_by = auth.uid()
  );

-- Admins can view all submissions
CREATE POLICY "Admins can view all submissions" ON public.submissions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Admins can manage all submissions
CREATE POLICY "Admins can manage all submissions" ON public.submissions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Storage policies for submissions bucket
-- Team members can upload to their team's folder
CREATE POLICY "Team members can upload submissions" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'submissions' AND
    (storage.foldername(name))[1] IN (
      SELECT team_id::text FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- Team members can view their team's submissions
CREATE POLICY "Team members can view team submissions" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'submissions' AND
    (
      (storage.foldername(name))[1] IN (
        SELECT team_id::text FROM public.team_members WHERE user_id = auth.uid()
      )
      OR
      EXISTS (
        SELECT 1 FROM public.profiles p 
        WHERE p.user_id = auth.uid() AND p.role = 'admin'
      )
    )
  );

-- Admins can manage all submissions in storage
CREATE POLICY "Admins can manage all submissions in storage" ON storage.objects
  FOR ALL USING (
    bucket_id = 'submissions' AND
    EXISTS (
      SELECT 1 FROM public.profiles p 
      WHERE p.user_id = auth.uid() AND p.role = 'admin'
    )
  );

-- Create trigger for updated_at
CREATE TRIGGER update_submissions_updated_at
  BEFORE UPDATE ON public.submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_submissions_team_id ON public.submissions(team_id);
CREATE INDEX IF NOT EXISTS idx_submissions_project_id ON public.submissions(project_id);
CREATE INDEX IF NOT EXISTS idx_submissions_subject_id ON public.submissions(subject_id);

