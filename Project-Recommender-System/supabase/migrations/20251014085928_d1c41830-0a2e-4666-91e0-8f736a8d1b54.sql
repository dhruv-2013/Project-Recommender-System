-- First, drop ALL existing policies on teams table
DROP POLICY IF EXISTS "Students can create teams" ON public.teams;
DROP POLICY IF EXISTS "Students can view teams they belong to" ON public.teams;
DROP POLICY IF EXISTS "Team creators can update their teams" ON public.teams;

-- Drop the trigger that was causing issues
DROP TRIGGER IF EXISTS ensure_team_creator_trigger ON public.teams;
DROP FUNCTION IF EXISTS public.ensure_team_creator();

-- Create simple, working policies
-- Allow authenticated users to insert teams (created_by will be set by them)
CREATE POLICY "Authenticated users can create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (created_by = auth.uid());

-- Allow users to view teams they created or are members of
CREATE POLICY "Users can view their teams"
ON public.teams
FOR SELECT
TO authenticated
USING (
  created_by = auth.uid() 
  OR is_team_member(auth.uid(), id)
);

-- Allow team creators to update their teams
CREATE POLICY "Creators can update their teams"
ON public.teams
FOR UPDATE
TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());