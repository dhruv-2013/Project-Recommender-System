-- Try a simpler approach - allow all authenticated users to insert
DROP POLICY IF EXISTS "Students can create teams" ON public.teams;

CREATE POLICY "Students can create teams"
ON public.teams
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Then add a trigger to ensure created_by matches auth.uid()
CREATE OR REPLACE FUNCTION public.ensure_team_creator()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by != auth.uid() THEN
    RAISE EXCEPTION 'created_by must match authenticated user';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ensure_team_creator_trigger ON public.teams;
CREATE TRIGGER ensure_team_creator_trigger
  BEFORE INSERT ON public.teams
  FOR EACH ROW
  EXECUTE FUNCTION public.ensure_team_creator();