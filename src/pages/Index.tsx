import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import StudentProfileForm from "@/components/StudentProfileForm";
import ProjectRecommendations from "@/components/ProjectRecommendations";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const navigate = useNavigate();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Check user role and redirect if needed
        if (session?.user) {
          setTimeout(() => {
            checkUserRoleAndProfile(session.user.id);
          }, 0);
        } else {
          setStudentProfile(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      if (session?.user) {
        checkUserRoleAndProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const checkUserRoleAndProfile = async (userId: string) => {
    try {
      // Check user role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();

      if (!profile || !profile.role) {
        navigate('/role-selection');
        return;
      }

      if (profile.role === 'admin') {
        navigate('/admin');
        return;
      }

      // Fetch student profile for students
      const { data: studentProfile, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching student profile:', error);
        return;
      }

      setStudentProfile(studentProfile);
    } catch (error) {
      console.error('Error checking user role and profile:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleProfileCreated = (profile: any) => {
    setStudentProfile(profile);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-400" />
          <p className="text-white/70">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="pt-16">
          <HeroSection />
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl font-bold text-white">Ready to Find Your Perfect Project?</h2>
              <p className="text-white/70 text-lg">
                Sign up or sign in to create your student profile and get AI-powered project recommendations tailored to your skills and interests.
              </p>
              <Button 
                onClick={() => navigate('/auth')}
                size="lg"
                className="bg-white/10 text-white border border-white/20 hover:bg-white/20 text-lg px-8 py-3"
              >
                Get Started
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header user={user} onSignOut={handleSignOut} />
      
      {!studentProfile ? (
        <main className="pt-16">
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="max-w-2xl mx-auto space-y-6 mb-16">
              <h2 className="text-3xl font-bold text-white">Welcome, {user.user_metadata?.full_name || user.email}!</h2>
              <p className="text-white/70 text-lg">
                Let's create your student profile to get personalized project recommendations.
              </p>
            </div>
          </div>
          <StudentProfileForm onProfileCreated={handleProfileCreated} />
        </main>
      ) : (
        <main className="pt-16">
          <div className="container mx-auto px-4 py-8 text-center">
            <div className="max-w-2xl mx-auto space-y-4">
              <h2 className="text-2xl font-bold text-white">Welcome back, {studentProfile.name}!</h2>
              <p className="text-white/70">
                Here are your personalized project recommendations based on your profile.
              </p>
            </div>
          </div>
          <ProjectRecommendations userId={user.id} studentProfile={studentProfile} />
        </main>
      )}
    </div>
  );
};

export default Index;