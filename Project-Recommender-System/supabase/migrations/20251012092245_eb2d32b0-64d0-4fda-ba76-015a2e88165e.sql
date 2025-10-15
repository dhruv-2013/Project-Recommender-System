-- Fix infinite recursion in team_members policies
-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can view team members of their teams" ON public.team_members;

-- Create a new policy that doesn't cause recursion
-- Users can view members of teams they belong to by checking the teams table
CREATE POLICY "Users can view team members of their teams"
ON public.team_members
FOR SELECT
USING (
  team_id IN (
    SELECT id FROM public.teams 
    WHERE created_by = auth.uid()
  )
  OR user_id = auth.uid()
);