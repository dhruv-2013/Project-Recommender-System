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
import { Briefcase, FileCheck, GraduationCap, Bell, LogOut, Users, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/20">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage projects, applications, and announcements
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="bg-primary/10 border-primary/20 text-primary">
                <Activity className="w-3 h-3 mr-1" />
                Admin
              </Badge>
              <Button onClick={handleSignOut} variant="outline" className="gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Projects</CardTitle>
              <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                <Briefcase className="w-4 h-4 text-primary" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalProjects}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.publishedProjects} published</p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 hover:border-accent/50 transition-all duration-300 hover:shadow-lg hover:shadow-accent/20 group">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Applications</CardTitle>
              <div className="p-2 bg-accent/10 rounded-lg group-hover:bg-accent/20 transition-colors">
                <FileCheck className="w-4 h-4 text-accent" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.totalApplications}</div>
              <p className="text-xs text-muted-foreground mt-1">
                <span className="text-orange-500 font-semibold">{stats.pendingApplications}</span> pending
              </p>
            </CardContent>
          </Card>

          <Card className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/20 group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Approved Teams</CardTitle>
              <div className="p-2 bg-green-500/10 rounded-lg group-hover:bg-green-500/20 transition-colors">
                <Users className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stats.approvedApplications}</div>
              <p className="text-xs text-muted-foreground mt-1">{stats.totalTeams} total teams</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="projects" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 h-14 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger
              value="projects"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all gap-2"
            >
              <Briefcase className="w-4 h-4" />
              <span className="hidden sm:inline">Projects</span>
            </TabsTrigger>
            <TabsTrigger
              value="applications"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all gap-2"
            >
              <FileCheck className="w-4 h-4" />
              <span className="hidden sm:inline">Applications</span>
              {stats.pendingApplications > 0 && (
                <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs">
                  {stats.pendingApplications}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="marks"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all gap-2"
            >
              <GraduationCap className="w-4 h-4" />
              <span className="hidden sm:inline">Marks</span>
            </TabsTrigger>
            <TabsTrigger
              value="announcements"
              className="data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg transition-all gap-2"
            >
              <Bell className="w-4 h-4" />
              <span className="hidden sm:inline">Announcements</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="projects" className="space-y-6 animate-fade-in">
            <ProjectManagement />
          </TabsContent>

          <TabsContent value="applications" className="space-y-6 animate-fade-in">
            <ApplicationManagement />
          </TabsContent>

          <TabsContent value="marks" className="space-y-6 animate-fade-in">
            <MarksManagement />
          </TabsContent>

          <TabsContent value="announcements" className="space-y-6 animate-fade-in">
            <AnnouncementManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Admin;