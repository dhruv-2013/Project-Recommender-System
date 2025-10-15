-- Update the handle_new_user function to support admin role detection
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email, role)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data ->> 'full_name', 
    NEW.email,
    -- Set as admin if email contains 'admin' or is in admin list
    CASE 
      WHEN NEW.email ILIKE '%admin%' OR NEW.email IN ('admin@example.com', 'admin@test.com') 
      THEN 'admin'::user_role
      ELSE 'student'::user_role
    END
  );
  RETURN NEW;
END;
$$;

-- Add some sample projects for testing
INSERT INTO public.projects (
  title, 
  description, 
  category, 
  difficulty_level, 
  estimated_duration, 
  required_skills, 
  preferred_skills, 
  learning_outcomes,
  team_size_min,
  team_size_max,
  capacity,
  published
) VALUES 
(
  'AI-Powered Student Analytics Dashboard',
  'Build a comprehensive dashboard that analyzes student performance data using machine learning algorithms. The project involves creating data visualization components, implementing predictive models, and designing an intuitive user interface for educators.',
  'Machine Learning',
  'Advanced',
  '12-16 weeks',
  ARRAY['Python', 'React', 'SQL', 'Machine Learning'],
  ARRAY['TensorFlow', 'D3.js', 'PostgreSQL', 'Docker'],
  ARRAY['Data analysis and visualization', 'ML model implementation', 'Full-stack development'],
  3,
  5,
  2,
  true
),
(
  'Blockchain-Based Supply Chain Tracker',
  'Develop a decentralized application for tracking products through supply chains using blockchain technology. Includes smart contracts, web interface, and mobile app components.',
  'Blockchain',
  'Advanced',
  '14-18 weeks',
  ARRAY['Solidity', 'JavaScript', 'Node.js'],
  ARRAY['Web3.js', 'React Native', 'IPFS'],
  ARRAY['Blockchain development', 'Smart contract programming', 'Decentralized systems'],
  2,
  4,
  1,
  true
),
(
  'Mobile Health Monitoring App',
  'Create a cross-platform mobile application for personal health tracking with real-time data sync, wearable device integration, and health analytics.',
  'Mobile Development',
  'Intermediate',
  '10-12 weeks',
  ARRAY['React Native', 'JavaScript', 'API Integration'],
  ARRAY['Firebase', 'HealthKit', 'Chart.js'],
  ARRAY['Mobile app development', 'Health data integration', 'User experience design'],
  2,
  3,
  3,
  true
),
(
  'Cybersecurity Incident Response System',
  'Build an automated system for detecting, analyzing, and responding to cybersecurity threats in real-time with machine learning-based threat detection.',
  'Cybersecurity',
  'Advanced',
  '16-20 weeks',
  ARRAY['Python', 'Network Security', 'Linux'],
  ARRAY['Wireshark', 'Elasticsearch', 'Docker', 'AWS'],
  ARRAY['Security analysis', 'Incident response', 'Network monitoring'],
  3,
  4,
  1,
  true
),
(
  'E-Learning Platform with AR/VR',
  'Develop an immersive learning platform that incorporates augmented and virtual reality for enhanced educational experiences.',
  'Extended Reality',
  'Advanced',
  '15-18 weeks',
  ARRAY['Unity', 'C#', 'JavaScript'],
  ARRAY['ARCore', 'ARKit', 'WebXR', 'Blender'],
  ARRAY['XR development', '3D modeling', 'Educational technology'],
  4,
  6,
  1,
  true
);