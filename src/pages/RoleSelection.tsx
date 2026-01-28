import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { User, GraduationCap, Shield, Brain } from "lucide-react";

const RoleSelection = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleRoleSelection = async (role: "student" | "admin") => {
    setLoading(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error",
          description: "Please sign in first.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Update user role in profiles table
      const { error } = await supabase
        .from('profiles')
        .upsert({
          user_id: user.id,
          full_name: user.user_metadata?.full_name || '',
          email: user.email || '',
          role: role,
        });

      if (error) throw error;

      toast({
        title: "Role Selected!",
        description: `You are now registered as a ${role}.`,
      });

      // Navigate based on role
      if (role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Brain className="h-10 w-10 text-primary animate-pulse" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Welcome to TeamUp
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">
            Choose your role to get started
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-muted/20 backdrop-blur-sm bg-background/80">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto p-4 bg-primary/10 rounded-full group-hover:bg-primary/20 transition-colors">
                <GraduationCap className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-2xl">Student</CardTitle>
              <CardDescription className="text-base">
                Find and apply for projects that match your skills
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                  <span>Create your profile with skills and interests</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                  <span>Browse and filter available projects</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                  <span>Form teams and apply for projects</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                  <span>Track your application status</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 bg-primary rounded-full" />
                  <span>View marks and feedback</span>
                </li>
              </ul>
              <Button 
                onClick={() => handleRoleSelection("student")} 
                className="w-full mt-6"
                variant="gradient"
                disabled={loading}
              >
                <User className="mr-2 h-4 w-4" />
                Continue as Student
              </Button>
            </CardContent>
          </Card>

          <Card className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-muted/20 backdrop-blur-sm bg-background/80">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto p-4 bg-accent/10 rounded-full group-hover:bg-accent/20 transition-colors">
                <Shield className="h-8 w-8 text-accent" />
              </div>
              <CardTitle className="text-2xl">Admin/Staff</CardTitle>
              <CardDescription className="text-base">
                Manage projects, applications, and student marks
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 bg-accent rounded-full" />
                  <span>Create and manage projects</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 bg-accent rounded-full" />
                  <span>Review and approve applications</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 bg-accent rounded-full" />
                  <span>Enter marks and feedback</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 bg-accent rounded-full" />
                  <span>Post announcements</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-1.5 w-1.5 bg-accent rounded-full" />
                  <span>Export data and reports</span>
                </li>
              </ul>
              <Button 
                onClick={() => handleRoleSelection("admin")} 
                className="w-full mt-6"
                variant="outline"
                disabled={loading}
              >
                <Shield className="mr-2 h-4 w-4" />
                Continue as Admin
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;