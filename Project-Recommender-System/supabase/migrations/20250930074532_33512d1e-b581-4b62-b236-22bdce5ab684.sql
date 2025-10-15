-- Fix infinite recursion in profiles RLS policy
-- First, drop the problematic policy
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Create a security definer function to check if user has admin role
CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE user_id = _user_id
      AND role = 'admin'::user_role
  )
$$;

-- Create new policy using the security definer function
CREATE POLICY "Admins can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin(auth.uid()));

-- Also create a more permissive policy for profiles to be viewable by other users when needed
CREATE POLICY "Public profile info can be viewed by authenticated users"
ON public.profiles
FOR SELECT
USING (auth.role() = 'authenticated');