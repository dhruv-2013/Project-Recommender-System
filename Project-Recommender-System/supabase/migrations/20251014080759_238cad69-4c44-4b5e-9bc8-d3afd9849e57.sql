-- Completely recreate the teams RLS policies
DROP POLICY IF EXISTS "Students can create teams" ON public.teams;
DROP POLICY IF EXISTS "Students can view teams they belong to" ON public.teams;
DROP POLICY IF EXISTS "Team creators can update their teams" ON public.teams;

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Create INSERT policy for authenticated users
CREATE POLICY "Students can create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = created_by);

-- Create SELECT policy using security definer function
CREATE POLICY "Students can view teams they belong to"
ON public.teams
FOR SELECT
TO authenticated
USING (public.is_team_member(auth.uid(), id));

-- Create UPDATE policy
CREATE POLICY "Team creators can update their teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (auth.uid() = created_by);