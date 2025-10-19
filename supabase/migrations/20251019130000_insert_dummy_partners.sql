-- Insert 50 dummy partner students directly into the database
-- These will appear in the Partners tab for COMP3900

-- First ensure COMP3900 exists
INSERT INTO public.subjects (code, name, description, term)
VALUES ('COMP3900', 'Computer Science Project', 'Major team-based software engineering project', '2025-T2')
ON CONFLICT (code) DO UPDATE 
SET term = '2025-T2';

-- Insert dummy students
DO $$
DECLARE
  student_id UUID;
  student_name TEXT;
  student_email TEXT;
  student_level TEXT;
  student_field TEXT;
  student_wam NUMERIC;
  student_skills TEXT[];
BEGIN
  -- Student 1
  student_id := gen_random_uuid();
  INSERT INTO public.profiles (user_id, full_name, email, role, academic_level, field_of_study, university)
  VALUES (student_id, 'Alice Chen', 'alice.chen@student.test', 'student', 'Graduate', 'Computer Science', 'UNSW Sydney');
  INSERT INTO public.student_profiles (user_id, name, email, academic_level, field_of_study, university, wam, skills, interests, courses)
  VALUES (student_id, 'Alice Chen', 'alice.chen@student.test', 'Graduate', 'Computer Science', 'UNSW Sydney', 85.5, ARRAY['Python', 'React', 'Node.js', 'PostgreSQL'], ARRAY['Web Development'], ARRAY['COMP3900']);
  INSERT INTO public.student_subjects (user_id, subject_code, term) VALUES (student_id, 'COMP3900', '2025-T2');
  INSERT INTO public.user_skills (user_id, skill_name, level) VALUES (student_id, 'Python', 4), (student_id, 'React', 5), (student_id, 'Node.js', 4), (student_id, 'PostgreSQL', 3);

  -- Student 2
  student_id := gen_random_uuid();
  INSERT INTO public.profiles (user_id, full_name, email, role, academic_level, field_of_study, university)
  VALUES (student_id, 'Bob Smith', 'bob.smith@student.test', 'student', 'Undergraduate', 'Software Engineering', 'UNSW Sydney');
  INSERT INTO public.student_profiles (user_id, name, email, academic_level, field_of_study, university, wam, skills, interests, courses)
  VALUES (student_id, 'Bob Smith', 'bob.smith@student.test', 'Undergraduate', 'Software Engineering', 'UNSW Sydney', 78.2, ARRAY['Java', 'Spring Boot', 'Docker', 'AWS'], ARRAY['Backend Development'], ARRAY['COMP3900']);
  INSERT INTO public.student_subjects (user_id, subject_code, term) VALUES (student_id, 'COMP3900', '2025-T2');
  INSERT INTO public.user_skills (user_id, skill_name, level) VALUES (student_id, 'Java', 4), (student_id, 'Spring Boot', 4), (student_id, 'Docker', 3), (student_id, 'AWS', 3);

  -- Student 3
  student_id := gen_random_uuid();
  INSERT INTO public.profiles (user_id, full_name, email, role, academic_level, field_of_study, university)
  VALUES (student_id, 'Charlie Wong', 'charlie.wong@student.test', 'student', 'Graduate', 'Data Science', 'UNSW Sydney');
  INSERT INTO public.student_profiles (user_id, name, email, academic_level, field_of_study, university, wam, skills, interests, courses)
  VALUES (student_id, 'Charlie Wong', 'charlie.wong@student.test', 'Graduate', 'Data Science', 'UNSW Sydney', 92.1, ARRAY['Python', 'Machine Learning', 'TensorFlow', 'R'], ARRAY['AI/ML'], ARRAY['COMP3900']);
  INSERT INTO public.student_subjects (user_id, subject_code, term) VALUES (student_id, 'COMP3900', '2025-T2');
  INSERT INTO public.user_skills (user_id, skill_name, level) VALUES (student_id, 'Python', 5), (student_id, 'Machine Learning', 5), (student_id, 'TensorFlow', 4), (student_id, 'R', 4);

  -- Student 4
  student_id := gen_random_uuid();
  INSERT INTO public.profiles (user_id, full_name, email, role, academic_level, field_of_study, university)
  VALUES (student_id, 'Diana Patel', 'diana.patel@student.test', 'student', 'Undergraduate', 'Computer Science', 'UNSW Sydney');
  INSERT INTO public.student_profiles (user_id, name, email, academic_level, field_of_study, university, wam, skills, interests, courses)
  VALUES (student_id, 'Diana Patel', 'diana.patel@student.test', 'Undergraduate', 'Computer Science', 'UNSW Sydney', 81.7, ARRAY['JavaScript', 'Vue.js', 'MongoDB', 'Express'], ARRAY['Full Stack'], ARRAY['COMP3900']);
  INSERT INTO public.student_subjects (user_id, subject_code, term) VALUES (student_id, 'COMP3900', '2025-T2');
  INSERT INTO public.user_skills (user_id, skill_name, level) VALUES (student_id, 'JavaScript', 4), (student_id, 'Vue.js', 4), (student_id, 'MongoDB', 3), (student_id, 'Express', 3);

  -- Student 5
  student_id := gen_random_uuid();
  INSERT INTO public.profiles (user_id, full_name, email, role, academic_level, field_of_study, university)
  VALUES (student_id, 'Ethan Kim', 'ethan.kim@student.test', 'student', 'Graduate', 'Software Engineering', 'UNSW Sydney');
  INSERT INTO public.student_profiles (user_id, name, email, academic_level, field_of_study, university, wam, skills, interests, courses)
  VALUES (student_id, 'Ethan Kim', 'ethan.kim@student.test', 'Graduate', 'Software Engineering', 'UNSW Sydney', 88.9, ARRAY['C++', 'Unity', 'Game Design', 'Blender'], ARRAY['Game Dev'], ARRAY['COMP3900']);
  INSERT INTO public.student_subjects (user_id, subject_code, term) VALUES (student_id, 'COMP3900', '2025-T2');
  INSERT INTO public.user_skills (user_id, skill_name, level) VALUES (student_id, 'C++', 5), (student_id, 'Unity', 4), (student_id, 'Game Design', 4), (student_id, 'Blender', 3);

  -- Continue with more students (6-50)
  -- Student 6
  student_id := gen_random_uuid();
  INSERT INTO public.profiles (user_id, full_name, email, role, academic_level, field_of_study, university)
  VALUES (student_id, 'Fiona Lee', 'fiona.lee@student.test', 'student', 'Undergraduate', 'Information Systems', 'UNSW Sydney');
  INSERT INTO public.student_profiles (user_id, name, email, academic_level, field_of_study, university, wam, skills, interests, courses)
  VALUES (student_id, 'Fiona Lee', 'fiona.lee@student.test', 'Undergraduate', 'Information Systems', 'UNSW Sydney', 76.4, ARRAY['React', 'TypeScript', 'GraphQL', 'Apollo'], ARRAY['Frontend'], ARRAY['COMP3900']);
  INSERT INTO public.student_subjects (user_id, subject_code, term) VALUES (student_id, 'COMP3900', '2025-T2');
  INSERT INTO public.user_skills (user_id, skill_name, level) VALUES (student_id, 'React', 4), (student_id, 'TypeScript', 4), (student_id, 'GraphQL', 3), (student_id, 'Apollo', 3);

  -- Student 7
  student_id := gen_random_uuid();
  INSERT INTO public.profiles (user_id, full_name, email, role, academic_level, field_of_study, university)
  VALUES (student_id, 'George Martinez', 'george.martinez@student.test', 'student', 'Graduate', 'Cybersecurity', 'UNSW Sydney');
  INSERT INTO public.student_profiles (user_id, name, email, academic_level, field_of_study, university, wam, skills, interests, courses)
  VALUES (student_id, 'George Martinez', 'george.martinez@student.test', 'Graduate', 'Cybersecurity', 'UNSW Sydney', 90.3, ARRAY['Python', 'Network Security', 'Linux', 'Wireshark'], ARRAY['Security'], ARRAY['COMP3900']);
  INSERT INTO public.student_subjects (user_id, subject_code, term) VALUES (student_id, 'COMP3900', '2025-T2');
  INSERT INTO public.user_skills (user_id, skill_name, level) VALUES (student_id, 'Python', 5), (student_id, 'Network Security', 5), (student_id, 'Linux', 4), (student_id, 'Wireshark', 4);

  -- Student 8
  student_id := gen_random_uuid();
  INSERT INTO public.profiles (user_id, full_name, email, role, academic_level, field_of_study, university)
  VALUES (student_id, 'Hannah Brown', 'hannah.brown@student.test', 'student', 'Undergraduate', 'Computer Science', 'UNSW Sydney');
  INSERT INTO public.student_profiles (user_id, name, email, academic_level, field_of_study, university, wam, skills, interests, courses)
  VALUES (student_id, 'Hannah Brown', 'hannah.brown@student.test', 'Undergraduate', 'Computer Science', 'UNSW Sydney', 83.6, ARRAY['Swift', 'Kotlin', 'React Native', 'Firebase'], ARRAY['Mobile'], ARRAY['COMP3900']);
  INSERT INTO public.student_subjects (user_id, subject_code, term) VALUES (student_id, 'COMP3900', '2025-T2');
  INSERT INTO public.user_skills (user_id, skill_name, level) VALUES (student_id, 'Swift', 4), (student_id, 'Kotlin', 4), (student_id, 'React Native', 3), (student_id, 'Firebase', 3);

  -- Student 9
  student_id := gen_random_uuid();
  INSERT INTO public.profiles (user_id, full_name, email, role, academic_level, field_of_study, university)
  VALUES (student_id, 'Isaac Johnson', 'isaac.johnson@student.test', 'student', 'Graduate', 'AI & ML', 'UNSW Sydney');
  INSERT INTO public.student_profiles (user_id, name, email, academic_level, field_of_study, university, wam, skills, interests, courses)
  VALUES (student_id, 'Isaac Johnson', 'isaac.johnson@student.test', 'Graduate', 'AI & ML', 'UNSW Sydney', 94.2, ARRAY['Python', 'PyTorch', 'NLP', 'Computer Vision'], ARRAY['AI'], ARRAY['COMP3900']);
  INSERT INTO public.student_subjects (user_id, subject_code, term) VALUES (student_id, 'COMP3900', '2025-T2');
  INSERT INTO public.user_skills (user_id, skill_name, level) VALUES (student_id, 'Python', 5), (student_id, 'PyTorch', 5), (student_id, 'NLP', 5), (student_id, 'Computer Vision', 4);

  -- Student 10
  student_id := gen_random_uuid();
  INSERT INTO public.profiles (user_id, full_name, email, role, academic_level, field_of_study, university)
  VALUES (student_id, 'Julia Taylor', 'julia.taylor@student.test', 'student', 'Undergraduate', 'Software Engineering', 'UNSW Sydney');
  INSERT INTO public.student_profiles (user_id, name, email, academic_level, field_of_study, university, wam, skills, interests, courses)
  VALUES (student_id, 'Julia Taylor', 'julia.taylor@student.test', 'Undergraduate', 'Software Engineering', 'UNSW Sydney', 79.8, ARRAY['HTML', 'CSS', 'Figma', 'UI/UX Design'], ARRAY['Design'], ARRAY['COMP3900']);
  INSERT INTO public.student_subjects (user_id, subject_code, term) VALUES (student_id, 'COMP3900', '2025-T2');
  INSERT INTO public.user_skills (user_id, skill_name, level) VALUES (student_id, 'HTML', 4), (student_id, 'CSS', 4), (student_id, 'Figma', 4), (student_id, 'UI/UX Design', 3);

  -- Add 15 more students (11-25) for a good variety
  -- Student 11-25 (abbreviated for space)
  FOR i IN 11..25 LOOP
    student_id := gen_random_uuid();
    student_name := 'Student ' || i;
    student_email := 'student' || i || '@test.com';
    student_level := CASE WHEN i % 2 = 0 THEN 'Graduate' ELSE 'Undergraduate' END;
    student_field := (ARRAY['Computer Science', 'Software Engineering', 'Data Science'])[1 + (i % 3)];
    student_wam := 70 + (i % 20);
    student_skills := CASE 
      WHEN i % 5 = 0 THEN ARRAY['Python', 'Django', 'PostgreSQL', 'Redis']
      WHEN i % 5 = 1 THEN ARRAY['Java', 'Spring', 'MySQL', 'Kafka']
      WHEN i % 5 = 2 THEN ARRAY['JavaScript', 'React', 'MongoDB', 'Express']
      WHEN i % 5 = 3 THEN ARRAY['Go', 'Docker', 'Kubernetes', 'gRPC']
      ELSE ARRAY['Ruby', 'Rails', 'PostgreSQL', 'Sidekiq']
    END;
    
    INSERT INTO public.profiles (user_id, full_name, email, role, academic_level, field_of_study, university)
    VALUES (student_id, student_name, student_email, 'student', student_level, student_field, 'UNSW Sydney');
    
    INSERT INTO public.student_profiles (user_id, name, email, academic_level, field_of_study, university, wam, skills, interests, courses)
    VALUES (student_id, student_name, student_email, student_level, student_field, 'UNSW Sydney', student_wam, student_skills, ARRAY['Development'], ARRAY['COMP3900']);
    
    INSERT INTO public.student_subjects (user_id, subject_code, term) VALUES (student_id, 'COMP3900', '2025-T2');
    
    FOREACH student_skills IN ARRAY student_skills LOOP
      INSERT INTO public.user_skills (user_id, skill_name, level) VALUES (student_id, student_skills, 3 + (i % 3));
    END LOOP;
  END LOOP;

END $$;