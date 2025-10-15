-- Create admin user role and update profiles table
-- First check if role column exists, if not add it
DO $$ 
BEGIN
    -- Add role column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'student';
    END IF;
    
    -- Create enum type for user roles if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('student', 'admin', 'staff');
        ALTER TABLE public.profiles ALTER COLUMN role TYPE user_role USING role::user_role;
        ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'student'::user_role;
    END IF;
END $$;

-- Update RLS policies for admin access
-- Allow admins to view all profiles
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Allow admins to view all projects 
CREATE POLICY "Admins can manage projects" ON public.projects
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Allow admins to view all applications
CREATE POLICY "Admins can view all applications" ON public.applications
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Allow admins to update applications 
CREATE POLICY "Admins can update applications" ON public.applications
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Allow admins to manage marks
CREATE POLICY "Admins can manage marks" ON public.marks
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Allow admins to create announcements
CREATE POLICY "Admins can create announcements" ON public.announcements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.user_id = auth.uid() AND p.role = 'admin'
        )
    );

-- Insert a default admin user (replace with actual admin email)
-- You can update this later with the actual admin email
INSERT INTO public.profiles (user_id, full_name, email, role) 
SELECT 
    auth.uid(),
    'Admin User',
    auth.email(),
    'admin'::user_role
WHERE auth.uid() IS NOT NULL
ON CONFLICT (user_id) DO UPDATE SET role = 'admin'::user_role;