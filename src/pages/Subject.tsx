import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft } from "lucide-react";
import { PartnerSuggestions } from "@/components/subject/PartnerSuggestions";
import { CreateGroup } from "@/components/subject/CreateGroup";
import { MyTeams } from "@/components/subject/MyTeams";
import { TeamProjectRecommendations } from "@/components/subject/TeamProjectRecommendations";
import { StudentAnnouncements } from "@/components/StudentAnnouncements";
import { StudentMarks } from "@/components/StudentMarks";
import { Badge } from "@/components/ui/badge";
import { GlowingEffect } from "@/components/ui/glowing-effect";

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
      <div className="min-h-screen bg-gradient-to-b from-[#040509] via-[#070b11] to-[#05070c] py-12 text-white">
      <div className="mx-auto w-full max-w-6xl px-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6 flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.02] px-4 py-2 text-white/80 transition hover:bg-white/[0.06] hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[linear-gradient(140deg,rgba(15,76,129,0.35),rgba(2,6,12,0.7)_45%,rgba(92,33,146,0.25))] p-10 backdrop-blur-2xl">
          <GlowingEffect
            blur={24}
            spread={32}
            movementDuration={1.2}
            glow
            className="opacity-60"
            disabled={false}
          />
          <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
                <Badge variant="outline" className="border-white/20 bg-white/10 text-white/80 backdrop-blur">
                  {subject.term || "Current term"}
                </Badge>
                <span>Subject Code: <span className="font-semibold text-white">{subject.code}</span></span>
              </div>
              <h1 className="text-4xl font-semibold leading-tight md:text-5xl">
                {subject.name}
              </h1>
              {subject.description && (
                <p className="max-w-2xl text-base text-white/70">
                  {subject.description}
                </p>
              )}
              <div className="grid gap-4 text-sm text-white/70 md:grid-cols-3">
                <div className="rounded-2xl border border-white/15 bg-black/30 p-5 shadow-[0_18px_35px_-20px_rgba(56,189,248,0.45)]">
                  <p className="text-xs uppercase tracking-wide text-white/40">Teams</p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    Real-time collaboration tools
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-black/30 p-5">
                  <p className="text-xs uppercase tracking-wide text-white/40">Announcements</p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    Stay updated instantly
                  </p>
                </div>
                <div className="rounded-2xl border border-white/15 bg-black/30 p-5">
                  <p className="text-xs uppercase tracking-wide text-white/40">Marks</p>
                  <p className="mt-2 text-xl font-semibold text-white">
                    Released grades & feedback
                  </p>
                </div>
              </div>
            </div>

            <div className="shrink-0 rounded-3xl border border-white/15 bg-black/35 p-6 text-sm text-white/70 shadow-[0_20px_40px_-30px_rgba(125,211,252,0.6)]">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-white/50">Quick Actions</h3>
              <ul className="mt-4 space-y-3">
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-sky-400" /> Build your partner shortlist
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" /> Form or join a project team
                </li>
                <li className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-300" /> Review announcements & milestones
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mt-14 rounded-3xl border border-white/10 bg-black/40 p-8 backdrop-blur-xl">
          <Tabs defaultValue="partners" className="space-y-8">
            <TabsList className="grid w-full grid-cols-6 rounded-full border border-white/10 bg-black/30 p-1">
              <TabsTrigger value="partners" className="rounded-full text-white/70 data-[state=active]:bg-sky-300/90 data-[state=active]:text-black">
                Partners
              </TabsTrigger>
              <TabsTrigger value="group" className="rounded-full text-white/70 data-[state=active]:bg-sky-300/90 data-[state=active]:text-black">
                Make Group
              </TabsTrigger>
              <TabsTrigger value="myteams" className="rounded-full text-white/70 data-[state=active]:bg-sky-300/90 data-[state=active]:text-black">
                My Teams
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="rounded-full text-white/70 data-[state=active]:bg-sky-300/90 data-[state=active]:text-black">
                Recommendations
              </TabsTrigger>
              <TabsTrigger value="marks" className="rounded-full text-white/70 data-[state=active]:bg-sky-300/90 data-[state=active]:text-black">
                Marks
              </TabsTrigger>
              <TabsTrigger value="announcements" className="rounded-full text-white/70 data-[state=active]:bg-sky-300/90 data-[state=active]:text-black">
                Announcements
              </TabsTrigger>
            </TabsList>

            <TabsContent value="partners" className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur">
              <PartnerSuggestions
                key={`partners-${refreshKey}`}
                subjectCode={subjectCode!}
                userId={user.id}
                selectedPartners={selectedPartners}
                onAddPartner={(partner) => setSelectedPartners([...selectedPartners, partner])}
                onRemovePartner={(partnerId) =>
                  setSelectedPartners(selectedPartners.filter((p) => p.user_id !== partnerId))
                }
              />
            </TabsContent>

            <TabsContent value="group" className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur">
              <CreateGroup
                subjectCode={subjectCode!}
                userId={user.id}
                selectedPartners={selectedPartners}
                onRemovePartner={(partnerId) =>
                  setSelectedPartners(selectedPartners.filter((p) => p.user_id !== partnerId))
                }
                onTeamCreated={() => {
                  handleTeamUpdate();
                  setSelectedPartners([]);
                }}
              />
            </TabsContent>

            <TabsContent value="myteams" className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur">
              <MyTeams
                key={`myteams-${refreshKey}`}
                userId={user.id}
                onTeamUpdated={handleTeamUpdate}
              />
            </TabsContent>

            <TabsContent value="recommendations" className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur">
              <TeamProjectRecommendations subjectCode={subjectCode!} userId={user.id} />
            </TabsContent>

            <TabsContent value="marks" className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur">
              <StudentMarks />
            </TabsContent>

            <TabsContent value="announcements" className="rounded-3xl border border-white/10 bg-black/60 p-6 backdrop-blur">
              <StudentAnnouncements limit={10} />
            </TabsContent>
          </Tabs>
        </section>
      </div>
    </div>
  );
}