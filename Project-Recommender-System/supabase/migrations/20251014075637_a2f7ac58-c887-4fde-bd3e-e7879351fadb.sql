-- Create a security definer function to check team membership
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.team_members
    WHERE user_id = _user_id
      AND team_id = _team_id
  )
$$;

-- Drop the problematic policy
DROP POLICY IF EXISTS "Students can view teams they belong to" ON public.teams;

-- Create new policy using the security definer function
CREATE POLICY "Students can view teams they belong to"
ON public.teams
FOR SELECT
USING (public.is_team_member(auth.uid(), id));