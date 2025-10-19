-- Fix team_members policies to allow insertion during team creation
DROP POLICY IF EXISTS "Team creators can manage members" ON public.team_members;
DROP POLICY IF EXISTS "Users can view team members" ON public.team_members;

-- Allow inserting team members when creating a team or when you're the creator
CREATE POLICY "Users can insert team members"
ON public.team_members
FOR INSERT
TO authenticated
WITH CHECK (
  -- Allow if inserting yourself
  user_id = auth.uid()
  -- OR if you're the creator of the team
  OR public.is_team_creator(auth.uid(), team_id)
);

-- Allow viewing team members if you're in the team or created it
CREATE POLICY "Users can view team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (
  public.is_team_creator(auth.uid(), team_id) 
  OR user_id = auth.uid()
);

-- Allow deleting team members if you're the creator
CREATE POLICY "Team creators can delete members"
ON public.team_members
FOR DELETE
TO authenticated
USING (public.is_team_creator(auth.uid(), team_id));