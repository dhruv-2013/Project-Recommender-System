import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProjectManagement } from '@/components/admin/ProjectManagement';
import { ApplicationManagement } from '@/components/admin/ApplicationManagement';
import { MarksManagement } from '@/components/admin/MarksManagement';
import { AnnouncementManagement } from '@/components/admin/AnnouncementManagement';
import { SubmissionManagement } from '@/components/admin/SubmissionManagement';
import { Briefcase, FileCheck, GraduationCap, Bell, LogOut, Users, Activity, Home, FileDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { GlowingEffect } from '@/components/ui/glowing-effect';

const Admin = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    publishedProjects: 0,
    totalApplications: 0,
    pendingApplications: 0,
    approvedApplications: 0,
    totalTeams: 0,
  });
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (!profile || profile.role !== 'admin') {
        toast({
          title: 'Access Denied',
          description: "You don't have admin privileges.",
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setUser(user);
      setProfile(profile);
      await fetchStats();
      setLoading(false);
    };

    checkUser();
  }, [navigate, toast]);

  const fetchStats = async () => {
    try {
      const { count: totalProjects } = await supabase.from('projects').select('*', { count: 'exact', head: true });
      const { count: publishedProjects } = await supabase
        .from('projects')
        .select('*', { count: 'exact', head: true })
        .eq('published', true);

      const { count: totalApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true });

      const { count: pendingApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'pending');

      const { count: approvedApplications } = await supabase
        .from('applications')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'approved');

      const { count: totalTeams } = await supabase
        .from('teams')
        .select('*', { count: 'exact', head: true });

      setStats({
        totalProjects: totalProjects || 0,
        publishedProjects: publishedProjects || 0,
        totalApplications: totalApplications || 0,
        pendingApplications: pendingApplications || 0,
        approvedApplications: approvedApplications || 0,
        totalTeams: totalTeams || 0,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-[#040509] via-[#070b11] to-[#05070c] text-white">
        <div className="space-y-4 text-center">
          <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-sky-400 border-t-transparent" />
          <p className="text-white/60">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#040509] via-[#070b11] to-[#05070c] py-10 text-white">
      <div className="sticky top-0 z-40 border-b border-white/10 bg-black/60 backdrop-blur-xl">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <div 
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => navigate('/')}
              >
                <Home className="h-6 w-6 text-white group-hover:text-sky-400 transition-colors" />
                <h1 className="text-3xl font-bold text-white group-hover:text-sky-400 transition-colors">
                  Admin Dashboard
                </h1>
              </div>
              <p className="text-sm text-white/60">
                Manage projects, applications, and announcements
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="border-white/20 bg-transparent text-white/80">
                <Activity className="mr-1 h-3 w-3" />
                Admin
              </Badge>
              <Button onClick={handleSignOut} variant="ghost" className="gap-2 bg-transparent text-white hover:bg-white/10 hover:text-white">
                <LogOut className="h-4 w-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-10">
        <div className="mb-10 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/70 text-white/80 shadow-[0_25px_65px_-40px_rgba(56,189,248,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/50">
            <GlowingEffect blur={20} spread={28} movementDuration={1} className="opacity-50" disabled={false} />
            <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Total Projects</CardTitle>
              <div className="rounded-lg bg-sky-500/20 p-2 transition-colors">
                <Briefcase className="h-4 w-4 text-sky-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-white">{stats.totalProjects}</div>
              <p className="mt-1 text-xs text-white/55">{stats.publishedProjects} published</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/70 text-white/80 shadow-[0_25px_65px_-40px_rgba(56,189,248,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/50">
            <GlowingEffect blur={20} spread={28} movementDuration={1} className="opacity-50" disabled={false} />
            <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Applications</CardTitle>
              <div className="rounded-lg bg-emerald-500/20 p-2 transition-colors">
                <FileCheck className="h-4 w-4 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-white">{stats.totalApplications}</div>
              <p className="mt-1 text-xs text-white/55">
                <span className="font-semibold text-amber-300">{stats.pendingApplications}</span> pending
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/70 text-white/80 shadow-[0_25px_65px_-40px_rgba(56,189,248,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/50">
            <GlowingEffect blur={20} spread={28} movementDuration={1} className="opacity-50" disabled={false} />
            <CardHeader className="relative z-10 flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-white/70">Approved Teams</CardTitle>
              <div className="rounded-lg bg-emerald-500/20 p-2 transition-colors">
                <Users className="h-4 w-4 text-emerald-400" />
              </div>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-3xl font-bold text-white">{stats.approvedApplications}</div>
              <p className="mt-1 text-xs text-white/55">{stats.totalTeams} total teams</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="projects" className="space-y-8">
          <TabsList className="grid h-14 w-full grid-cols-5 rounded-full border border-white/10 bg-black/30 p-1">
            <TabsTrigger
              value="projects"
              className="gap-2 rounded-full text-white/70 transition-all data-[state=active]:bg-sky-300/90 data-[state=active]:text-black"
            >
              <Briefcase className="h-4 w-4" />
              <span className="hidden sm:inline">Projects</span>
            </TabsTrigger>
            <TabsTrigger
              value="applications"
              className="gap-2 rounded-full text-white/70 transition-all data-[state=active]:bg-sky-300/90 data-[state=active]:text-black"
            >
              <FileCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Applications</span>
              {stats.pendingApplications > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs bg-amber-500/20 text-amber-200">
                  {stats.pendingApplications}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="marks"
              className="gap-2 rounded-full text-white/70 transition-all data-[state=active]:bg-sky-300/90 data-[state=active]:text-black"
            >
              <GraduationCap className="h-4 w-4" />
              <span className="hidden sm:inline">Marks</span>
            </TabsTrigger>
            <TabsTrigger
              value="submissions"
              className="gap-2 rounded-full text-white/70 transition-all data-[state=active]:bg-sky-300/90 data-[state=active]:text-black"
            >
              <FileDown className="h-4 w-4" />
              <span className="hidden sm:inline">Submissions</span>
            </TabsTrigger>
            <TabsTrigger
              value="announcements"
              className="gap-2 rounded-full text-white/70 transition-all data-[state=active]:bg-sky-300/90 data-[state=active]:text-black"
            >
              <Bell className="h-4 w-4" />
              <span className="hidden sm:inline">Announcements</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-6">
            <ProjectManagement />
          </TabsContent>

          <TabsContent value="applications" className="space-y-6">
            <ApplicationManagement />
          </TabsContent>

          <TabsContent value="marks" className="space-y-6">
            <MarksManagement />
          </TabsContent>

          <TabsContent value="submissions" className="space-y-6">
            <SubmissionManagement />
          </TabsContent>

          <TabsContent value="announcements" className="space-y-6">
            <AnnouncementManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;