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

    const students = [
      { email: 'alice.student@test.com', name: 'Alice Johnson', field: 'Computer Science', level: 'Undergraduate', skills: ['Python', 'JavaScript', 'React'], interests: ['Web Development', 'AI'] },
      { email: 'bob.student@test.com', name: 'Bob Smith', field: 'Data Science', level: 'Graduate', skills: ['Python', 'R', 'Machine Learning'], interests: ['Data Analysis', 'Statistics'] },
      { email: 'charlie.student@test.com', name: 'Charlie Brown', field: 'Software Engineering', level: 'Undergraduate', skills: ['Java', 'C++', 'SQL'], interests: ['Backend Development', 'Databases'] },
      { email: 'diana.student@test.com', name: 'Diana Prince', field: 'Information Systems', level: 'Graduate', skills: ['JavaScript', 'Node.js', 'MongoDB'], interests: ['Full Stack', 'Cloud Computing'] },
      { email: 'eve.student@test.com', name: 'Eve Williams', field: 'Cybersecurity', level: 'Undergraduate', skills: ['Python', 'Linux', 'Network Security'], interests: ['Ethical Hacking', 'Security'] },
      { email: 'frank.student@test.com', name: 'Frank Miller', field: 'Game Development', level: 'Graduate', skills: ['C#', 'Unity', '3D Modeling'], interests: ['Game Design', 'VR'] },
      { email: 'grace.student@test.com', name: 'Grace Lee', field: 'Mobile Development', level: 'Undergraduate', skills: ['Swift', 'Kotlin', 'React Native'], interests: ['iOS', 'Android'] },
      { email: 'henry.student@test.com', name: 'Henry Davis', field: 'AI & ML', level: 'Graduate', skills: ['Python', 'TensorFlow', 'PyTorch'], interests: ['Deep Learning', 'NLP'] },
      { email: 'iris.student@test.com', name: 'Iris Chen', field: 'UI/UX Design', level: 'Undergraduate', skills: ['Figma', 'HTML', 'CSS'], interests: ['User Research', 'Design Systems'] },
      { email: 'jack.student@test.com', name: 'Jack Wilson', field: 'DevOps', level: 'Graduate', skills: ['Docker', 'Kubernetes', 'AWS'], interests: ['CI/CD', 'Infrastructure'] }
    ];

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
