-- Create user profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  avatar_url TEXT,
  academic_level TEXT,
  field_of_study TEXT,
  university TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create student profiles table for project matching data
CREATE TABLE public.student_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  academic_level TEXT NOT NULL,
  field_of_study TEXT NOT NULL,
  university TEXT NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  interests TEXT[] NOT NULL DEFAULT '{}',
  experience_level TEXT NOT NULL,
  preferred_team_size TEXT NOT NULL,
  time_commitment TEXT NOT NULL,
  preferred_project_duration TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create projects table
CREATE TABLE public.projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty_level TEXT NOT NULL,
  estimated_duration TEXT NOT NULL,
  required_skills TEXT[] NOT NULL DEFAULT '{}',
  preferred_skills TEXT[] NOT NULL DEFAULT '{}',
  team_size_min INTEGER NOT NULL DEFAULT 1,
  team_size_max INTEGER NOT NULL DEFAULT 1,
  learning_outcomes TEXT[] NOT NULL DEFAULT '{}',
  industry_relevance TEXT,
  mentorship_available BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create project recommendations table
CREATE TABLE public.project_recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  match_score DECIMAL(3,2) NOT NULL CHECK (match_score >= 0 AND match_score <= 1),
  reasoning TEXT,
  skill_match_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, project_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for student profiles
CREATE POLICY "Users can view their own student profile" ON public.student_profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own student profile" ON public.student_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own student profile" ON public.student_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create policies for projects (public read, admin write for now)
CREATE POLICY "Anyone can view projects" ON public.projects FOR SELECT USING (true);

-- Create policies for recommendations
CREATE POLICY "Users can view their own recommendations" ON public.project_recommendations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own recommendations" ON public.project_recommendations FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_student_profiles_updated_at BEFORE UPDATE ON public.student_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to automatically create profile when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name', NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample projects for demonstration
INSERT INTO public.projects (title, description, category, difficulty_level, estimated_duration, required_skills, preferred_skills, team_size_min, team_size_max, learning_outcomes, industry_relevance, mentorship_available) VALUES
('AI-Powered Study Assistant', 'Build an intelligent tutoring system that adapts to individual learning styles and provides personalized study recommendations using machine learning algorithms.', 'AI/Machine Learning', 'Advanced', '12-16 weeks', ARRAY['Python', 'Machine Learning', 'Natural Language Processing'], ARRAY['TensorFlow', 'PyTorch', 'API Development'], 3, 5, ARRAY['Advanced ML implementation', 'User experience design', 'Educational technology'], 'EdTech', true),

('Sustainable Campus Energy Monitor', 'Develop an IoT-based system to monitor and optimize energy consumption across university buildings, with real-time analytics and sustainability recommendations.', 'IoT/Hardware', 'Intermediate', '10-14 weeks', ARRAY['Arduino', 'Sensors', 'Data Analysis'], ARRAY['Raspberry Pi', 'Cloud Platforms', 'Mobile App Development'], 2, 4, ARRAY['IoT system design', 'Environmental impact analysis', 'Data visualization'], 'Green Technology', true),

('Blockchain Voting System', 'Create a secure, transparent digital voting platform using blockchain technology to ensure election integrity and voter privacy.', 'Blockchain', 'Advanced', '14-18 weeks', ARRAY['Blockchain', 'Cryptography', 'Smart Contracts'], ARRAY['Solidity', 'Web3', 'Security Testing'], 2, 3, ARRAY['Blockchain development', 'Cybersecurity principles', 'Democratic technology'], 'Civic Technology', false),

('Mental Health Chatbot', 'Design and develop an empathetic AI chatbot that provides mental health support and resources to students, with crisis detection capabilities.', 'AI/Healthcare', 'Intermediate', '8-12 weeks', ARRAY['Natural Language Processing', 'Psychology', 'Web Development'], ARRAY['React', 'Node.js', 'Healthcare APIs'], 3, 4, ARRAY['Ethical AI development', 'Healthcare technology', 'User empathy design'], 'Healthcare Technology', true),

('AR Campus Navigation', 'Build an augmented reality mobile application that helps students navigate campus buildings with interactive 3D directions and location-based information.', 'AR/Mobile', 'Advanced', '12-16 weeks', ARRAY['Unity', 'C#', 'Mobile Development'], ARRAY['ARCore', 'ARKit', 'UI/UX Design'], 2, 4, ARRAY['AR development', 'Mobile app design', 'Spatial computing'], 'Mobile Technology', false),

('Social Media Analytics Dashboard', 'Develop a comprehensive analytics platform that tracks social media trends, sentiment analysis, and engagement metrics across multiple platforms.', 'Data Science', 'Intermediate', '8-12 weeks', ARRAY['Data Analysis', 'API Integration', 'Visualization'], ARRAY['Python', 'Tableau', 'Social Media APIs'], 2, 3, ARRAY['Data science methods', 'API development', 'Business intelligence'], 'Marketing Technology', false),

('Smart Home Security System', 'Create an intelligent home security system with facial recognition, anomaly detection, and mobile alerts using computer vision and IoT sensors.', 'IoT/Security', 'Advanced', '14-18 weeks', ARRAY['Computer Vision', 'IoT', 'Mobile Development'], ARRAY['OpenCV', 'Raspberry Pi', 'Cloud Services'], 3, 5, ARRAY['Computer vision applications', 'IoT security', 'Real-time systems'], 'Home Technology', true),

('E-Learning Gamification Platform', 'Build an engaging educational platform that uses game mechanics to motivate learning, with progress tracking and adaptive difficulty.', 'Education/Gaming', 'Intermediate', '10-14 weeks', ARRAY['Web Development', 'Game Design', 'Database Design'], ARRAY['React', 'Node.js', 'Game Engines'], 3, 4, ARRAY['Educational technology', 'User engagement design', 'Learning analytics'], 'EdTech', true);