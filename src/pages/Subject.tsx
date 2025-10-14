import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { PartnerSuggestions } from "@/components/subject/PartnerSuggestions";
import { CreateGroup } from "@/components/subject/CreateGroup";
import { ProjectList } from "@/components/subject/ProjectList";

export default function Subject() {
  const { subjectCode } = useParams<{ subjectCode: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<any>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/auth");
        return;
      }
      setUser(user);
      await fetchSubject();
      setLoading(false);
    };

    checkAuth();
  }, [subjectCode, navigate]);

  const fetchSubject = async () => {
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .eq("code", subjectCode)
      .single();

    if (error) {
      console.error("Error fetching subject:", error);
      toast.error("Failed to load subject");
      return;
    }

    setSubject(data);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Subject not found</h2>
          <Button onClick={() => navigate("/")}>Go back home</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-4 !text-white hover:!text-white hover:!bg-white/10 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>
          
          <div className="bg-card rounded-lg border p-6 shadow-card">
            <h1 className="text-3xl font-bold mb-2">{subject.code}</h1>
            <h2 className="text-xl text-muted-foreground mb-2">{subject.name}</h2>
            {subject.description && (
              <p className="text-muted-foreground">{subject.description}</p>
            )}
          </div>
        </div>

        <Tabs defaultValue="partners" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="partners">Partners</TabsTrigger>
            <TabsTrigger value="group">Make Group</TabsTrigger>
            <TabsTrigger value="projects">Project List</TabsTrigger>
          </TabsList>

          <TabsContent value="partners">
            <PartnerSuggestions subjectCode={subjectCode!} userId={user?.id} />
          </TabsContent>

          <TabsContent value="group">
            <CreateGroup subjectCode={subjectCode!} userId={user?.id} />
          </TabsContent>

          <TabsContent value="projects">
            <ProjectList subjectCode={subjectCode!} userId={user?.id} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
