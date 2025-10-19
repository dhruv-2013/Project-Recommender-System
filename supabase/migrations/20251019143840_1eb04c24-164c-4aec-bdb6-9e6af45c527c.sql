-- Create a security definer function to check if user created a team
CREATE OR REPLACE FUNCTION public.is_team_creator(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.teams
    WHERE id = _team_id
      AND created_by = _user_id
  )
$$;

-- Drop existing team_members policies that cause recursion
DROP POLICY IF EXISTS "Team creators can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members of their teams" ON public.team_members;

-- Create new non-recursive policies for team_members
CREATE POLICY "Team creators can manage members"
ON public.team_members
FOR ALL
TO authenticated
USING (public.is_team_creator(auth.uid(), team_id));

CREATE POLICY "Users can view team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  public.is_team_creator(auth.uid(), team_id) 
  OR user_id = auth.uid()
);