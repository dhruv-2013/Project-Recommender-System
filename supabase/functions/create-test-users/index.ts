import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Generate 50 diverse students
    const firstNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Iris', 'Jack', 
                        'Kelly', 'Leo', 'Maya', 'Noah', 'Olivia', 'Peter', 'Quinn', 'Rachel', 'Sam', 'Tara',
                        'Uma', 'Victor', 'Wendy', 'Xavier', 'Yara', 'Zoe', 'Aaron', 'Beth', 'Chris', 'Dana',
                        'Ethan', 'Fiona', 'George', 'Hannah', 'Ian', 'Julia', 'Kevin', 'Laura', 'Mark', 'Nina',
                        'Oscar', 'Paula', 'Quincy', 'Rita', 'Steve', 'Tina', 'Ulysses', 'Vera', 'Will', 'Xena'];
    
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
                       'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Moore', 'Jackson', 'Martin', 'Lee', 'Thompson', 'White',
                       'Harris', 'Clark', 'Lewis', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright', 'Lopez',
                       'Hill', 'Scott', 'Green', 'Adams', 'Baker', 'Nelson', 'Carter', 'Mitchell', 'Perez', 'Roberts',
                       'Turner', 'Phillips', 'Campbell', 'Parker', 'Evans', 'Edwards', 'Collins', 'Stewart', 'Morris', 'Rogers'];
    
    const fields = ['Computer Science', 'Data Science', 'Software Engineering', 'Information Systems', 'Cybersecurity',
                   'Game Development', 'Mobile Development', 'AI & ML', 'UI/UX Design', 'DevOps'];
    
    const levels = ['Undergraduate', 'Graduate'];
    
    const skillSets = [
      ['Python', 'JavaScript', 'React', 'Node.js'],
      ['Java', 'Spring Boot', 'SQL', 'PostgreSQL'],
      ['C++', 'C#', 'Unity', 'Game Design'],
      ['Python', 'TensorFlow', 'Machine Learning', 'Data Analysis'],
      ['React', 'Vue.js', 'Angular', 'TypeScript'],
      ['Docker', 'Kubernetes', 'AWS', 'CI/CD'],
      ['Swift', 'Kotlin', 'React Native', 'Flutter'],
      ['Python', 'R', 'Data Visualization', 'Statistics'],
      ['HTML', 'CSS', 'Figma', 'Adobe XD'],
      ['Linux', 'Network Security', 'Ethical Hacking', 'Penetration Testing'],
      ['MongoDB', 'Redis', 'GraphQL', 'REST API'],
      ['Go', 'Rust', 'System Programming', 'Performance Optimization'],
      ['PHP', 'Laravel', 'MySQL', 'WordPress'],
      ['Ruby', 'Ruby on Rails', 'PostgreSQL', 'Heroku'],
      ['Scala', 'Apache Spark', 'Big Data', 'Hadoop']
    ];
    
    const interestSets = [
      ['Web Development', 'AI', 'Cloud Computing'],
      ['Mobile Apps', 'User Experience', 'Design'],
      ['Data Science', 'Analytics', 'Visualization'],
      ['Cybersecurity', 'Privacy', 'Blockchain'],
      ['Game Development', 'VR', 'AR'],
      ['Machine Learning', 'NLP', 'Computer Vision'],
      ['DevOps', 'Infrastructure', 'Automation'],
      ['Full Stack', 'Microservices', 'Scalability'],
      ['IoT', 'Embedded Systems', 'Robotics'],
      ['Fintech', 'E-commerce', 'SaaS']
    ];

    const students = [];
    for (let i = 0; i < 50; i++) {
      const firstName = firstNames[i % firstNames.length];
      const lastName = lastNames[i % lastNames.length];
      const name = `${firstName} ${lastName}`;
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@test.com`;
      const field = fields[Math.floor(Math.random() * fields.length)];
      const level = levels[Math.floor(Math.random() * levels.length)];
      const skills = skillSets[Math.floor(Math.random() * skillSets.length)];
      const interests = interestSets[Math.floor(Math.random() * interestSets.length)];
      
      students.push({ email, name, field, level, skills, interests });
    }

    const admins = [
      { email: 'admin1@test.com', name: 'Dr. Sarah Connor', field: 'Computer Science', level: 'PhD' },
      { email: 'admin2@test.com', name: 'Prof. John McClane', field: 'Software Engineering', level: 'PhD' },
      { email: 'admin3@test.com', name: 'Dr. Ellen Ripley', field: 'Data Science', level: 'PhD' },
      { email: 'admin4@test.com', name: 'Prof. Tony Stark', field: 'AI & Robotics', level: 'PhD' },
      { email: 'admin5@test.com', name: 'Dr. Bruce Wayne', field: 'Cybersecurity', level: 'PhD' },
      { email: 'admin6@test.com', name: 'Prof. Diana Prince', field: 'Information Systems', level: 'PhD' },
      { email: 'admin7@test.com', name: 'Dr. Peter Parker', field: 'Web Technologies', level: 'PhD' },
      { email: 'admin8@test.com', name: 'Prof. Natasha Romanoff', field: 'Network Security', level: 'PhD' },
      { email: 'admin9@test.com', name: 'Dr. Stephen Strange', field: 'Machine Learning', level: 'PhD' },
      { email: 'admin10@test.com', name: 'Prof. Carol Danvers', field: 'Cloud Computing', level: 'PhD' }
    ];

    const results = { students: [], admins: [], errors: [] };
    const password = 'Test123!';

    // Create students
    for (const student of students) {
      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: student.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: student.name
          }
        });

        if (authError) throw authError;

        // Update profile with role
        await supabaseAdmin
          .from('profiles')
          .update({ 
            role: 'student',
            academic_level: student.level,
            field_of_study: student.field,
            university: 'Test University'
          })
          .eq('user_id', authData.user.id);

        // Create student profile
        await supabaseAdmin
          .from('student_profiles')
          .insert({
            user_id: authData.user.id,
            name: student.name,
            email: student.email,
            academic_level: student.level,
            field_of_study: student.field,
            skills: student.skills,
            interests: student.interests,
          });

        // Enroll in SENG2011
        await supabaseAdmin
          .from('student_subjects')
          .insert({
            user_id: authData.user.id,
            subject_code: 'SENG2011',
            term: '2025-T2'
          });

        // Add user skills
        for (const skill of student.skills) {
          await supabaseAdmin
            .from('user_skills')
            .insert({
              user_id: authData.user.id,
              skill_name: skill,
              level: Math.floor(Math.random() * 3) + 3 // Random level between 3-5
            });
        }

        results.students.push({ email: student.email, created: true });
      } catch (error) {
        results.errors.push({ email: student.email, error: error.message });
      }
    }

    // Create admins
    for (const admin of admins) {
      try {
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: admin.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            full_name: admin.name
          }
        });

        if (authError) throw authError;

        // Update profile with role
        await supabaseAdmin
          .from('profiles')
          .update({ 
            role: 'admin',
            academic_level: admin.level,
            field_of_study: admin.field,
            university: 'Test University'
          })
          .eq('user_id', authData.user.id);

        results.admins.push({ email: admin.email, created: true });
      } catch (error) {
        results.errors.push({ email: admin.email, error: error.message });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Created ${results.students.length} students and ${results.admins.length} admins`,
        password: password,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
