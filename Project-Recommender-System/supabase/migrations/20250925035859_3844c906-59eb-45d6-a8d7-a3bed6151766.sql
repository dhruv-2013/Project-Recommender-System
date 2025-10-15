-- Create user roles enum
CREATE TYPE public.user_role AS ENUM ('admin', 'student');

-- Add role column to profiles table
ALTER TABLE public.profiles ADD COLUMN role public.user_role DEFAULT 'student';

-- Create teams table
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create team members table
CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'creator' or 'member'
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

-- Create team invitations table
CREATE TABLE public.team_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'accepted', 'declined'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Update projects table with more fields
ALTER TABLE public.projects 
ADD COLUMN capacity INTEGER DEFAULT 1,
ADD COLUMN assessor_ids UUID[],
ADD COLUMN published BOOLEAN DEFAULT false,
ADD COLUMN archived BOOLEAN DEFAULT false;

-- Create applications table
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  applicant_type TEXT NOT NULL, -- 'individual' or 'team'
  applicant_id UUID NOT NULL, -- user_id for individual, team_id for team
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'waitlisted', 'rejected'
  admin_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create skills table for detailed skill tracking
CREATE TABLE public.user_skills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_name TEXT NOT NULL,
  level INTEGER CHECK (level >= 1 AND level <= 5),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, skill_name)
);

-- Create marks table
CREATE TABLE public.marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  team_mark DECIMAL(5,2),
  individual_adjustment DECIMAL(5,2) DEFAULT 0,
  final_mark DECIMAL(5,2),
  feedback TEXT,
  released BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create announcements table
CREATE TABLE public.announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create storage bucket for resumes
INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);

-- RLS Policies

-- Teams policies
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students can view teams they belong to" ON public.teams
FOR SELECT USING (
  id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);
CREATE POLICY "Students can create teams" ON public.teams
FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Team creators can update their teams" ON public.teams
FOR UPDATE USING (auth.uid() = created_by);

-- Team members policies
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view team members of their teams" ON public.team_members
FOR SELECT USING (
  team_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
);
CREATE POLICY "Team creators can manage members" ON public.team_members
FOR ALL USING (
  team_id IN (SELECT id FROM public.teams WHERE created_by = auth.uid())
);

-- Team invitations policies
ALTER TABLE public.team_invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view invitations for their email" ON public.team_invitations
FOR SELECT USING (
  email = (SELECT email FROM auth.users WHERE id = auth.uid())
);
CREATE POLICY "Team creators can manage invitations" ON public.team_invitations
FOR ALL USING (
  team_id IN (SELECT id FROM public.teams WHERE created_by = auth.uid())
);

-- Applications policies
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own applications" ON public.applications
FOR SELECT USING (
  (applicant_type = 'individual' AND applicant_id = auth.uid()) OR
  (applicant_type = 'team' AND applicant_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()))
);
CREATE POLICY "Users can create applications" ON public.applications
FOR INSERT WITH CHECK (
  (applicant_type = 'individual' AND applicant_id = auth.uid()) OR
  (applicant_type = 'team' AND applicant_id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid()))
);

-- User skills policies
ALTER TABLE public.user_skills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own skills" ON public.user_skills
FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Anyone can view user skills" ON public.user_skills
FOR SELECT USING (true);

-- Marks policies
ALTER TABLE public.marks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own marks when released" ON public.marks
FOR SELECT USING (auth.uid() = user_id AND released = true);

-- Announcements policies
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Everyone can view announcements" ON public.announcements
FOR SELECT USING (true);

-- Storage policies for resumes
CREATE POLICY "Users can upload their own resume" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'resumes' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own resume" ON storage.objects
FOR SELECT USING (
  bucket_id = 'resumes' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own resume" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'resumes' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Add triggers for timestamp updates
CREATE TRIGGER update_teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_marks_updated_at
  BEFORE UPDATE ON public.marks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();