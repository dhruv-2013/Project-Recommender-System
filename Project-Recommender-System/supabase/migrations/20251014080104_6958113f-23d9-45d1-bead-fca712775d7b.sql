-- Ensure created_by column is NOT NULL
ALTER TABLE public.teams ALTER COLUMN created_by SET NOT NULL;

-- Drop and recreate the INSERT policy to be more explicit
DROP POLICY IF EXISTS "Students can create teams" ON public.teams;

CREATE POLICY "Students can create teams"
ON public.teams
FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL AND
  auth.uid() = created_by
);