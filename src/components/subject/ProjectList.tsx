import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Briefcase, Clock, Users, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface ProjectListProps {
  subjectCode: string;
  userId: string;
}

export function ProjectList({ subjectCode, userId }: ProjectListProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userSkills, setUserSkills] = useState<string[]>([]);
  const [myCreatorTeams, setMyCreatorTeams] = useState<any[]>([]);
  const [teamDialogForProjectId, setTeamDialogForProjectId] = useState<string | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [teamAnswer1, setTeamAnswer1] = useState<string>("");
  const [teamAnswer2, setTeamAnswer2] = useState<string>("");

  useEffect(() => {
    fetchProjects();
    fetchMyCreatorTeams();
  }, [subjectCode, userId]);

  const fetchProjects = async () => {
    try {
      // Fetch user skills
      const { data: skillsData } = await supabase
        .from("user_skills")
        .select("skill_name")
        .eq("user_id", userId);

      const skills = skillsData?.map(s => s.skill_name) || [];
      setUserSkills(skills);

      // Fetch published projects
      const { data: projectsData, error } = await supabase
        .from("projects")
        .select("*")
        .eq("published", true)
        .eq("archived", false)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Calculate skill match for each project
      const projectsWithMatch = projectsData?.map(project => {
        const requiredSkills = project.required_skills || [];
        const preferredSkills = project.preferred_skills || [];
        const allProjectSkills = [...requiredSkills, ...preferredSkills];
        
        const matchedSkills = skills.filter(skill => allProjectSkills.includes(skill));
        const matchPercentage = allProjectSkills.length > 0
          ? Math.round((matchedSkills.length / allProjectSkills.length) * 100)
          : 0;

        return {
          ...project,
          matchPercentage,
          matchedSkills
        };
      }) || [];

      // Sort by match percentage
      projectsWithMatch.sort((a, b) => b.matchPercentage - a.matchPercentage);
      setProjects(projectsWithMatch);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const fetchMyCreatorTeams = async () => {
    try {
      const { data: teamMembers } = await supabase
        .from("team_members")
        .select("team_id, role, teams:team_id (id, name)")
        .eq("user_id", userId);
      const creatorTeams = (teamMembers || []).filter((tm: any) => tm.role === "creator").map((tm: any) => tm.teams);
      setMyCreatorTeams(creatorTeams);
    } catch (e) {
      // ignore
    }
  };

  const handleApply = async (projectId: string) => {
    try {
      const { error } = await supabase
        .from("applications")
        .insert({
          project_id: projectId,
          applicant_id: userId,
          applicant_type: "individual",
          status: "pending"
        });

      if (error) throw error;

      toast.success("Application submitted successfully!");
    } catch (error: any) {
      console.error("Error applying:", error);
      toast.error(error.message || "Failed to submit application");
    }
  };

  const handleApplyAsTeam = async (projectId: string) => {
    try {
      if (!selectedTeamId) {
        toast.error("Please select a team");
        return;
      }
      if (!teamAnswer1.trim() || !teamAnswer2.trim()) {
        toast.error("Please answer both questions");
        return;
      }

      const { data: app, error: appError } = await supabase
        .from("applications")
        .insert({
          project_id: projectId,
          applicant_id: selectedTeamId,
          applicant_type: "team",
          status: "pending",
        })
        .select()
        .single();
      if (appError) throw appError;

      // Save team answers in a separate table
      const { error: respError } = await supabase
        .from("application_responses" as any)
        .insert({
          application_id: app.id,
          q1: teamAnswer1.trim(),
          q2: teamAnswer2.trim(),
          subject_code: subjectCode,
        });
      if (respError) throw respError;

      toast.success("Team application submitted!");
      setTeamDialogForProjectId(null);
      setSelectedTeamId("");
      setTeamAnswer1("");
      setTeamAnswer2("");
    } catch (e: any) {
      toast.error(e?.message || "Failed to submit team application");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    );
  }

  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No projects available</h3>
          <p className="text-muted-foreground">
            Check back later for new project opportunities.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Available Projects</CardTitle>
          <CardDescription>
            Projects you can apply for in {subjectCode}
          </CardDescription>
        </CardHeader>
      </Card>

      {projects.map((project) => (
        <Card key={project.id} className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
                <p className="text-muted-foreground mb-4">{project.description}</p>
              </div>
              <div className="ml-4 text-right">
                <div className="text-2xl font-bold text-primary">
                  {project.matchPercentage}%
                </div>
                <div className="text-xs text-muted-foreground">Match</div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-center gap-2 text-sm">
                <Users className="h-4 w-4 text-muted-foreground" />
                <span>{project.team_size_min}-{project.team_size_max} members</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>{project.estimated_duration}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
                <span>{project.difficulty_level}</span>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {project.required_skills && project.required_skills.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Required Skills:</div>
                  <div className="flex flex-wrap gap-2">
                    {project.required_skills.map((skill: string) => (
                      <Badge
                        key={skill}
                        variant={userSkills.includes(skill) ? "default" : "secondary"}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {project.preferred_skills && project.preferred_skills.length > 0 && (
                <div>
                  <div className="text-sm font-medium mb-2">Preferred Skills:</div>
                  <div className="flex flex-wrap gap-2">
                    {project.preferred_skills.map((skill: string) => (
                      <Badge
                        key={skill}
                        variant={userSkills.includes(skill) ? "default" : "outline"}
                      >
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => handleApply(project.id)}
                className="flex-1"
              >
                Apply as Individual
              </Button>
              <Dialog open={teamDialogForProjectId === project.id} onOpenChange={(open) => {
                if (!open) {
                  setTeamDialogForProjectId(null);
                  setSelectedTeamId("");
                  setTeamAnswer1("");
                  setTeamAnswer2("");
                }
              }}>
                <DialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      if (!selectedTeamId && myCreatorTeams.length > 0) {
                        setSelectedTeamId(myCreatorTeams[0].id);
                      }
                      setTeamDialogForProjectId(project.id);
                    }}
                    disabled={myCreatorTeams.length === 0}
                  >
                    Apply as Team
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Select your team</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {myCreatorTeams.length === 0 ? (
                      <p className="text-sm text-muted-foreground">You must be a team creator to apply as a team.</p>
                    ) : (
                      <>
                        <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                          <SelectTrigger>
                            <SelectValue placeholder="Choose a team" />
                          </SelectTrigger>
                          <SelectContent>
                            {myCreatorTeams.map((t: any) => (
                              <SelectItem value={t.id} key={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="space-y-2">
                          <Label>Why is your team a good fit for this project?</Label>
                          <Textarea
                            placeholder="Describe relevant experience and strengths"
                            value={teamAnswer1}
                            onChange={(e) => setTeamAnswer1(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Outline your proposed approach or plan</Label>
                          <Textarea
                            placeholder="Briefly outline how you plan to execute"
                            value={teamAnswer2}
                            onChange={(e) => setTeamAnswer2(e.target.value)}
                            rows={3}
                          />
                        </div>
                        <Button onClick={() => handleApplyAsTeam(project.id)} disabled={!selectedTeamId || !teamAnswer1.trim() || !teamAnswer2.trim()}>Submit Application</Button>
                      </>
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
