import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Mail, GraduationCap, Award } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Header from "@/components/Header";

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [studentProfile, setStudentProfile] = useState<any>(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }
      setUser(user);
      
      // Fetch profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      
      setProfile(profileData);

      // Fetch student profile if exists
      const { data: studentData } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();
      
      setStudentProfile(studentData);
      setLoading(false);
    };

    checkUser();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header user={user} profile={profile} onSignOut={handleSignOut} />
      
      <div className="container mx-auto px-6 pt-24 pb-12">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-6 text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">My Profile</h1>
            <p className="text-white/70">View and manage your account information</p>
          </div>

          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Account Information
              </CardTitle>
              <CardDescription className="text-white/70">
                Your basic account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-white/70">Full Name</Label>
                <Input 
                  value={profile?.full_name || ''} 
                  disabled 
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input 
                  value={user?.email || ''} 
                  disabled 
                  className="bg-white/5 border-white/10 text-white"
                />
              </div>
              <div>
                <Label className="text-white/70">Role</Label>
                <Input 
                  value={profile?.role || ''} 
                  disabled 
                  className="bg-white/5 border-white/10 text-white capitalize"
                />
              </div>
            </CardContent>
          </Card>

          {studentProfile && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <GraduationCap className="w-5 h-5" />
                  Student Information
                </CardTitle>
                <CardDescription className="text-white/70">
                  Your academic profile
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-white/70">Academic Level</Label>
                    <Input 
                      value={studentProfile.academic_level || ''} 
                      disabled 
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/70">Field of Study</Label>
                    <Input 
                      value={studentProfile.field_of_study || ''} 
                      disabled 
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-white/70 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      WAM
                    </Label>
                    <Input 
                      value={studentProfile.wam || ''} 
                      disabled 
                      className="bg-white/5 border-white/10 text-white"
                    />
                  </div>
                </div>

                {studentProfile.skills && studentProfile.skills.length > 0 && (
                  <div>
                    <Label className="text-white/70">Skills</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {studentProfile.skills.map((skill: string, idx: number) => (
                        <span 
                          key={idx}
                          className="px-3 py-1 bg-white/10 text-white rounded-full text-sm border border-white/20"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {studentProfile.interests && studentProfile.interests.length > 0 && (
                  <div>
                    <Label className="text-white/70">Interests</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {studentProfile.interests.map((interest: string, idx: number) => (
                        <span 
                          key={idx}
                          className="px-3 py-1 bg-white/10 text-white rounded-full text-sm border border-white/20"
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {studentProfile.completed_courses && studentProfile.completed_courses.length > 0 && (
                  <div>
                    <Label className="text-white/70">Completed Courses</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {studentProfile.completed_courses.map((course: string, idx: number) => (
                        <span 
                          key={idx}
                          className="px-3 py-1 bg-white/10 text-white rounded-full text-sm border border-white/20"
                        >
                          {course}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;
