-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Students can create teams" ON public.teams;

-- Create policy that works for BOTH anon and authenticated roles
CREATE POLICY "Students can create teams"
ON public.teams
FOR INSERT
TO anon, authenticated
WITH CHECK (true);