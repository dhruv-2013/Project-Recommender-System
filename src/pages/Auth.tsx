import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Brain, Users, Target } from "lucide-react";

const Auth = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [searchParams] = useSearchParams();
  const roleFromUrl = searchParams.get('role') as 'student' | 'admin' | null;
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check if user is already logged in
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: roleFromUrl || 'student'
          },
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) throw error;

      // Update profile with role after signup
      if (roleFromUrl && data.user) {
        await supabase
          .from('profiles')
          .update({ role: roleFromUrl })
          .eq('user_id', data.user.id);
      }

      toast({
        title: "Account created successfully!",
        description: "You can now sign in to your account.",
      });
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

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check if user has a role assigned
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user?.id)
        .maybeSingle();

      // If role is specified in URL, update profile role
      if (roleFromUrl && user) {
        await supabase
          .from('profiles')
          .update({ role: roleFromUrl })
          .eq('user_id', user.id);
      }

      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });

      const finalRole = roleFromUrl || profile?.role;
      if (finalRole === 'admin') {
        navigate("/admin");
      } else if (finalRole === 'student') {
        navigate("/");
      } else {
        navigate("/role-selection");
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
      <div className="w-full max-w-md">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/')}
          className="mb-4"
        >
          ← Back to Home
        </Button>
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="relative">
              <Brain className="h-8 w-8 text-primary animate-pulse" />
              <div className="absolute -top-1 -right-1 h-3 w-3 bg-accent rounded-full animate-ping" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            TeamUp
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered project recommendations for students
          </p>
        </div>

        <Card className="shadow-lg border-muted/20 backdrop-blur-sm bg-background/80">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">
              {roleFromUrl === 'admin' ? '👨‍💼 Admin' : '🎓 Student'} Access
            </CardTitle>
            <CardDescription className="text-center">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your.email@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input
                      id="signin-password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                    variant="gradient"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="your.email@university.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Choose a strong password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loading}
                    variant="gradient"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Why TeamUp?
                  </span>
                </div>
              </div>
              
              <div className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Brain className="h-4 w-4 text-primary" />
                  <span>AI-powered skill analysis</span>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Users className="h-4 w-4 text-primary" />
                  <span>Perfect team complementarity</span>
                </div>
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Target className="h-4 w-4 text-primary" />
                  <span>Personalized recommendations</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;