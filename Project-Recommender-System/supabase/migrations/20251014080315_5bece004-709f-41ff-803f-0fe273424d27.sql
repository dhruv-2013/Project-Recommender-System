-- Drop and recreate the INSERT policy with proper USING clause
DROP POLICY IF EXISTS "Students can create teams" ON public.teams;

CREATE POLICY "Students can create teams"
ON public.teams
FOR INSERT
TO public
WITH CHECK (
  auth.uid() = created_by
);