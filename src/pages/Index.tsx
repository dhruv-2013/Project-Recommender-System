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
  const [profile, setProfile] = useState<any>(null);
  const [showAuthOptions, setShowAuthOptions] = useState(false);
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
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!userProfile || !userProfile.role) {
        navigate('/role-selection');
        return;
      }

      setProfile(userProfile);

      // Fetch student profile for students (skip for admins)
      if (userProfile.role === 'student') {
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
      }
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
          <HeroSection onGetStarted={() => setShowAuthOptions(true)} />
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl font-bold text-white">Ready to Find Your Perfect Project?</h2>
              <p className="text-white/70 text-lg">
                Sign up or sign in to create your student profile and get AI-powered project recommendations tailored to your skills and interests.
              </p>
              <Button 
                onClick={() => setShowAuthOptions(true)}
                size="lg"
                className="bg-white/10 text-white border border-white/20 hover:bg-white/20 text-lg px-8 py-3"
              >
                Get Started
              </Button>
            </div>
          </div>
        </main>
        
        {showAuthOptions && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-black/40 backdrop-blur-md border border-white/20 rounded-xl p-8 max-w-2xl w-full">
              <h2 className="text-3xl font-bold text-white mb-8 text-center">Choose Your Access</h2>
              <div className="grid md:grid-cols-2 gap-6">
                <button
                  onClick={() => navigate('/auth?role=student')}
                  className="group relative p-8 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl transition-all duration-300"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-4">🎓</div>
                    <h3 className="text-xl font-semibold text-white mb-2">Student Sign In</h3>
                    <p className="text-white/60 text-sm">Access projects and team features</p>
                  </div>
                </button>
                
                <button
                  onClick={() => navigate('/auth?role=admin')}
                  className="group relative p-8 bg-white/5 hover:bg-white/10 border border-white/20 rounded-xl transition-all duration-300"
                >
                  <div className="text-center">
                    <div className="text-4xl mb-4">👨‍💼</div>
                    <h3 className="text-xl font-semibold text-white mb-2">Admin Sign In</h3>
                    <p className="text-white/60 text-sm">Manage projects and approve teams</p>
                  </div>
                </button>
              </div>
              
              <button
                onClick={() => setShowAuthOptions(false)}
                className="mt-6 w-full py-3 text-white/60 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Show different content for admins
  if (profile?.role === 'admin') {
    return (
      <div className="min-h-screen">
        <Header user={user} profile={profile} onSignOut={handleSignOut} />
        <main className="pt-16">
          <div className="container mx-auto px-4 py-16 text-center">
            <div className="max-w-2xl mx-auto space-y-6">
              <h2 className="text-3xl font-bold text-white">Welcome, Admin!</h2>
              <p className="text-white/70 text-lg">
                Manage your projects, applications, and team approvals from the Admin Dashboard.
              </p>
              <Button 
                onClick={() => navigate('/admin')}
                size="lg"
                className="bg-white/10 text-white border border-white/20 hover:bg-white/20 text-lg px-8 py-3"
              >
                Go to Admin Dashboard
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header user={user} profile={profile} onSignOut={handleSignOut} />
      
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
              <p className="text-white/90 font-medium">
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