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
import { MyTeams } from "@/components/subject/MyTeams";
import { TeamProjectRecommendations } from "@/components/subject/TeamProjectRecommendations";

export default function Subject() {
  const { subjectCode } = useParams<{ subjectCode: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<any>(null);
  const [user, setUser] = useState<any>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPartners, setSelectedPartners] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, [subjectCode]);

  const checkAuth = async () => {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error("Auth error:", error);
        navigate("/auth");
        return;
      }

      if (!user) {
        navigate("/auth");
        return;
      }

      setUser(user);
      await fetchSubject();
    } catch (error) {
      console.error("Error in checkAuth:", error);
      toast.error("Authentication error");
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubject = async () => {
    try {
      if (!subjectCode) {
        toast.error("No subject code provided");
        navigate("/");
        return;
      }

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
    } catch (error) {
      console.error("Error in fetchSubject:", error);
      toast.error("Failed to load subject");
    }
  };

  const handleTeamUpdate = () => {
    setRefreshKey(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!subject) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Subject not found</h2>
          <Button onClick={() => navigate("/")}>Go back home</Button>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Please sign in</h2>
          <Button onClick={() => navigate("/auth")}>Go to Sign In</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <Button
            variant="default"
            onClick={() => navigate("/")}
            className="mb-4 bg-black text-white hover:bg-black/80 flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
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
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="partners">Partners</TabsTrigger>
            <TabsTrigger value="group">Make Group</TabsTrigger>
            <TabsTrigger value="myteams">My Teams</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            
          </TabsList>

          <TabsContent value="partners">
            <PartnerSuggestions 
              key={`partners-${refreshKey}`}
              subjectCode={subjectCode!} 
              userId={user.id}
              selectedPartners={selectedPartners}
              onAddPartner={(partner) => setSelectedPartners([...selectedPartners, partner])}
              onRemovePartner={(partnerId) => setSelectedPartners(selectedPartners.filter(p => p.user_id !== partnerId))}
            />
          </TabsContent>

          <TabsContent value="group">
            <CreateGroup 
              subjectCode={subjectCode!} 
              userId={user.id}
              selectedPartners={selectedPartners}
              onRemovePartner={(partnerId) => setSelectedPartners(selectedPartners.filter(p => p.user_id !== partnerId))}
              onTeamCreated={() => {
                handleTeamUpdate();
                setSelectedPartners([]);
              }}
            />
          </TabsContent>

          <TabsContent value="myteams">
  <MyTeams 
    key={`myteams-${refreshKey}`} 
    userId={user.id} 
    onTeamUpdated={handleTeamUpdate} 
  />
</TabsContent>

<TabsContent value="recommendations">
  <TeamProjectRecommendations 
    subjectCode={subjectCode!} 
    userId={user.id}
  />
</TabsContent>

<TabsContent value="projects">
  <ProjectList 
    subjectCode={subjectCode!} 
    userId={user.id} 
  />
</TabsContent>
        </Tabs>
      </div>
    </div>
  );
}