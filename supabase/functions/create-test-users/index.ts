// supabase/functions/seed_partners/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

Deno.serve(async () => {
  const url = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, serviceKey);

  const partners = [
    { name: 'Ava Johnson', email: 'ava.johnson@student.unsw.edu.au', level: 'Undergraduate', field: 'Computer Science', wam: 84.2, skills: ['React','TypeScript','UI/UX'], interests: ['Frontend','Design'] },
    { name: 'Liam Patel', email: 'liam.patel@student.unsw.edu.au', level: 'Graduate', field: 'Software Engineering', wam: 87.6, skills: ['Node.js','Express','PostgreSQL'], interests: ['Backend','Databases'] },
    { name: 'Emily Nguyen', email: 'emily.nguyen@student.unsw.edu.au', level: 'Graduate', field: 'Data Science', wam: 91.5, skills: ['Python','Pandas','Scikit-learn'], interests: ['ML','Data Analysis'] },
    { name: 'Noah Zhang', email: 'noah.zhang@student.unsw.edu.au', level: 'Graduate', field: 'Software Engineering', wam: 88.1, skills: ['Docker','AWS','Kubernetes'], interests: ['DevOps','Cloud'] },
    { name: 'Mia Thompson', email: 'mia.thompson@student.unsw.edu.au', level: 'Graduate', field: 'AI & ML', wam: 93.4, skills: ['TensorFlow','PyTorch','NLP'], interests: ['Deep Learning','AI Research'] },
    { name: 'Ethan Lee', email: 'ethan.lee@student.unsw.edu.au', level: 'Undergraduate', field: 'Software Engineering', wam: 80.5, skills: ['Flutter','Dart','Firebase'], interests: ['Mobile','App Design'] },
    { name: 'Chloe Wang', email: 'chloe.wang@student.unsw.edu.au', level: 'Graduate', field: 'Cybersecurity', wam: 89.7, skills: ['Linux','Networking','Ethical Hacking'], interests: ['Security','Pentesting'] },
    { name: 'Oliver Brown', email: 'oliver.brown@student.unsw.edu.au', level: 'Graduate', field: 'Information Systems', wam: 85.9, skills: ['React','Node.js','MongoDB'], interests: ['Full Stack','Web Dev'] },
    { name: 'Harper Kim', email: 'harper.kim@student.unsw.edu.au', level: 'Graduate', field: 'Computer Science', wam: 90.2, skills: ['AWS','Terraform','CI/CD'], interests: ['Cloud','Automation'] },
    { name: 'Lucas White', email: 'lucas.white@student.unsw.edu.au', level: 'Undergraduate', field: 'Computer Science', wam: 82.8, skills: ['Unity','C#','3D Modeling'], interests: ['Game Design','Graphics'] },
  ];

  const password = 'Student123!';
  const results = { created: 0, updated: 0, errors: [] as any[] };

  for (const p of partners) {
    // 1) Create or find the auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: p.email,
      password,
      email_confirm: true,
      user_metadata: { full_name: p.name }
    });

    if (createErr && createErr.message?.includes('already registered')) {
      // User exists, fetch id
      const { data: existing } = await admin.auth.admin.listUsers({ page: 1, perPage: 1, email: p.email });
      const user = existing?.users?.[0];
      if (!user) { results.errors.push({ email: p.email, error: 'could not fetch existing user' }); continue; }

      // 2) Upsert profile
      const { error: upErr1 } = await admin.from('profiles').upsert({
        user_id: user.id, full_name: p.name, email: p.email, role: 'student',
        academic_level: p.level, field_of_study: p.field, university: 'UNSW Sydney'
      }, { onConflict: 'user_id' });

      // 3) Upsert student_profiles
      const { error: upErr2 } = await admin.from('student_profiles').upsert({
        user_id: user.id, name: p.name, email: p.email, academic_level: p.level,
        field_of_study: p.field, university: 'UNSW Sydney', wam: p.wam,
        skills: p.skills, interests: p.interests, courses: ['COMP3900']
      }, { onConflict: 'user_id' });

      if (upErr1 || upErr2) results.errors.push({ email: p.email, error: upErr1?.message || upErr2?.message });
      else results.updated++;
      continue;
    }

    if (createErr) { results.errors.push({ email: p.email, error: createErr.message }); continue; }

    const userId = created!.user!.id;

    // 2) Upsert profile
    const { error: profErr } = await admin.from('profiles').upsert({
      user_id: userId, full_name: p.name, email: p.email, role: 'student',
      academic_level: p.level, field_of_study: p.field, university: 'UNSW Sydney'
    }, { onConflict: 'user_id' });

    // 3) Upsert student_profiles
    const { error: spErr } = await admin.from('student_profiles').upsert({
      user_id: userId, name: p.name, email: p.email, academic_level: p.level,
      field_of_study: p.field, university: 'UNSW Sydney', wam: p.wam,
      skills: p.skills, interests: p.interests, courses: ['COMP3900']
    }, { onConflict: 'user_id' });

    if (profErr || spErr) results.errors.push({ email: p.email, error: profErr?.message || spErr?.message });
    else results.created++;
  }

  return new Response(JSON.stringify(results), { headers: { 'Content-Type': 'application/json' } });
});
