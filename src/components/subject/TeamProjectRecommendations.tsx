// src/components/subject/TeamProjectRecommendations.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Briefcase, Clock, Users, TrendingUp, Star, Zap, Target, CheckCircle } from "lucide-react";

interface TeamProjectRecommendationsProps {
  subjectCode: string;
  userId: string;
}

export function TeamProjectRecommendations({ subjectCode, userId }: TeamProjectRecommendationsProps) {
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [projects, setProjects] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamDialogForProjectId, setTeamDialogForProjectId] = useState<string | null>(null);
  const [teamAnswer1, setTeamAnswer1] = useState("");
  const [teamAnswer2, setTeamAnswer2] = useState("");

  useEffect(() => {
    fetchUserTeams();
    fetchProjects();
  }, [userId]);

  useEffect(() => {
    if (selectedTeam) {
      generateRecommendations();
    }
  }, [selectedTeam]);

  const fetchUserTeams = async () => {
    try {
      const { data: teamMembers, error } = await supabase
        .from("team_members")
        .select(`
          team_id,
          teams (
            id,
            name,
            description
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;

      const userTeams = teamMembers?.map((tm: any) => tm.teams).filter(Boolean) || [];
      setTeams(userTeams);

      if (userTeams.length > 0) {
        setSelectedTeam(userTeams[0].id);
      }
    } catch (error) {
      console.error("Error fetching teams:", error);
      toast.error("Failed to load teams");
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("published", true)
        .eq("archived", false);

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error("Error fetching projects:", error);
      toast.error("Failed to load projects");
    }
  };

  const generateRecommendations = async () => {
    if (!selectedTeam) return;

    setLoading(true);
    try {
      // Get team members and their skills
      const { data: teamMembers, error: membersError } = await supabase
        .from("team_members")
        .select("user_id")
        .eq("team_id", selectedTeam);

      if (membersError) throw membersError;

      // Fetch skills for all team members
      const teamSkillsSet = new Set<string>();
      
      for (const member of teamMembers || []) {
        // Try student_profiles first
        const { data: studentProfile } = await supabase
          .from("student_profiles")
          .select("skills")
          .eq("user_id", member.user_id)
          .single();

        if (studentProfile?.skills && Array.isArray(studentProfile.skills)) {
          studentProfile.skills.forEach((skill: string) => teamSkillsSet.add(skill.toLowerCase()));
        } else {
          // Fallback to user_skills
          const { data: userSkills } = await supabase
            .from("user_skills")
            .select("skill_name")
            .eq("user_id", member.user_id);

          userSkills?.forEach((s: any) => teamSkillsSet.add(s.skill_name.toLowerCase()));
        }
      }

      const teamSkills = Array.from(teamSkillsSet);

      // Calculate match score for each project
      const projectScores = projects.map((project) => {
        const requiredSkills = (project.required_skills || []).map((s: string) => s.toLowerCase());
        const preferredSkills = (project.preferred_skills || []).map((s: string) => s.toLowerCase());

        // Count matching skills
        const matchedRequired = requiredSkills.filter((skill: string) => 
          teamSkills.some(ts => ts.includes(skill) || skill.includes(ts))
        );
        const matchedPreferred = preferredSkills.filter((skill: string) => 
          teamSkills.some(ts => ts.includes(skill) || skill.includes(ts))
        );

        // Calculate scores
        const requiredScore = requiredSkills.length > 0 
          ? (matchedRequired.length / requiredSkills.length) * 70 
          : 50;
        const preferredScore = preferredSkills.length > 0 
          ? (matchedPreferred.length / preferredSkills.length) * 30 
          : 0;
        
        const totalScore = Math.round(requiredScore + preferredScore);

        // Check team size compatibility
        const teamSize = teamMembers?.length || 1;
        const sizeCompatible = teamSize >= project.team_size_min && teamSize <= project.team_size_max;

        return {
          ...project,
          matchScore: totalScore,
          matchedRequired,
          matchedPreferred,
          missingRequired: requiredSkills.filter((s: string) => !matchedRequired.includes(s)),
          sizeCompatible,
          teamSize
        };
      });

      // Sort by match score and filter out very low matches
      const sortedProjects = projectScores
        .filter(p => p.matchScore >= 30)
        .sort((a, b) => b.matchScore - a.matchScore);

      setRecommendations(sortedProjects);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      toast.error("Failed to generate recommendations");
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAsTeam = async (projectId: string) => {
    try {
      if (!selectedTeam) {
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
          applicant_id: selectedTeam,
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

      toast.success("Team application submitted successfully!");
      setTeamDialogForProjectId(null);
      setTeamAnswer1("");
      setTeamAnswer2("");
    } catch (error: any) {
      console.error("Error applying:", error);
      toast.error(error.message || "Failed to submit application");
    }
  };

  const getMatchColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-blue-500";
    if (score >= 40) return "text-yellow-500";
    return "text-orange-500";
  };

  const getMatchBadgeColor = (score: number) => {
    if (score >= 80) return "bg-green-600 hover:bg-green-700";
    if (score >= 60) return "bg-blue-600 hover:bg-blue-700";
    if (score >= 40) return "bg-yellow-600 hover:bg-yellow-700";
    return "bg-orange-600 hover:bg-orange-700";
  };

  if (teams.length === 0) {
    return (
      <Card className="rounded-3xl border border-white/10 bg-black/70 text-white/70">
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <Users className="mb-4 h-12 w-12 text-white/40" />
          <h3 className="mb-2 text-lg font-semibold text-white">No teams yet</h3>
          <p className="text-white/55">
            Create a team first to get project recommendations based on your team's combined skills!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-3xl border border-white/10 bg-black/70 text-white/75">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Target className="h-6 w-6 text-sky-400" />
            Team Project Recommendations
          </CardTitle>
          <CardDescription className="text-white/55">
            Get personalized project recommendations based on your team's combined skillset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/70">Select Your Team</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger className="rounded-xl border-white/15 bg-black/40 text-white focus-visible:ring-0">
                  <SelectValue placeholder="Choose a team" />
                </SelectTrigger>
                <SelectContent className="border border-white/10 bg-[#0b111a] text-white">
                  {teams.map((team: any) => (
                    <SelectItem key={team.id} value={team.id}>
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card className="rounded-3xl border border-white/10 bg-black/70 text-white/70">
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-sky-400" />
              <p className="text-white/55">Analyzing team skills and matching projects...</p>
            </div>
          </CardContent>
        </Card>
      ) : recommendations.length === 0 ? (
        <Card className="rounded-3xl border border-white/10 bg-black/70 text-white/70">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Briefcase className="mb-4 h-12 w-12 text-white/40" />
            <h3 className="mb-2 text-lg font-semibold text-white">No matching projects found</h3>
            <p className="text-white/55">
              No projects match your team's current skillset. Try adding more team members with diverse skills!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="rounded-3xl border border-white/12 bg-black/70 text-white/75 shadow-[0_20px_60px_-40px_rgba(56,189,248,0.45)]">
            <CardHeader>
              <div className="flex items-center gap-2 text-white">
                <Zap className="h-5 w-5 text-amber-300" />
                <CardTitle className="text-lg">
                  Found {recommendations.length} Matching Projects
                </CardTitle>
              </div>
              <CardDescription className="text-white/60">
                Projects are ranked by how well they match your team's skills
              </CardDescription>
            </CardHeader>
          </Card>

          {recommendations.map((project, index) => (
            <Card
              key={project.id}
              className="rounded-3xl border border-white/12 bg-black/75 text-white/80 shadow-[0_25px_65px_-40px_rgba(56,189,248,0.55)] transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/50"
            >
              <CardContent className="p-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-3">
                      <Badge variant="outline" className="border-white/20 text-xs text-white/70">
                        #{index + 1}
                      </Badge>
                      <h3 className="text-xl font-semibold text-white">{project.title}</h3>
                    </div>
                    <p className="mb-3 text-white/60">{project.description}</p>
                  </div>
                  <div className="ml-4 text-right">
                    <div className={`text-3xl font-bold ${getMatchColor(project.matchScore)}`}>
                      {project.matchScore}%
                    </div>
                    <div className="flex items-center gap-1 text-xs text-white/50">
                      <Star className="w-3 h-3 fill-current" />
                      Match Score
                    </div>
                  </div>
                </div>

                {/* Project Info */}
                <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-4">
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Users className="h-4 w-4 text-white/40" />
                    <span>
                      {project.team_size_min}-{project.team_size_max} members
                    </span>
                    {project.sizeCompatible ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Badge variant="destructive" className="bg-orange-500/20 text-orange-200">
                        Size mismatch
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Clock className="h-4 w-4 text-white/40" />
                    <span>{project.estimated_duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <TrendingUp className="h-4 w-4 text-white/40" />
                    <span>{project.difficulty_level}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-white/60">
                    <Briefcase className="h-4 w-4 text-white/40" />
                    <span>{project.category}</span>
                  </div>
                </div>

                {/* Skills Breakdown */}
                <div className="mb-4 space-y-3">
                  {project.matchedRequired.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        Matched Required Skills ({project.matchedRequired.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {project.matchedRequired.map((skill: string) => (
                          <Badge key={skill} variant="default" className="bg-green-600">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {project.missingRequired.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                        <TrendingUp className="w-4 h-4 text-orange-500" />
                        Missing Required Skills ({project.missingRequired.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {project.missingRequired.map((skill: string) => (
                          <Badge key={skill} variant="outline" className="border-orange-500 text-orange-500">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {project.matchedPreferred.length > 0 && (
                    <div>
                      <div className="mb-2 flex items-center gap-2 text-sm font-medium text-white">
                        <Star className="w-4 h-4 text-blue-500" />
                        Matched Preferred Skills ({project.matchedPreferred.length})
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {project.matchedPreferred.map((skill: string) => (
                          <Badge key={skill} variant="secondary" className="bg-blue-600 text-white">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 border-t border-white/10 pt-4">
                  <Dialog 
                    open={teamDialogForProjectId === project.id} 
                    onOpenChange={(open) => {
                      if (!open) { 
                        setTeamDialogForProjectId(null); 
                        setTeamAnswer1("");
                        setTeamAnswer2("");
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button
                        onClick={() => {
                          if (!selectedTeam && teams.length > 0) {
                            setSelectedTeam(teams[0].id);
                          }
                          setTeamDialogForProjectId(project.id);
                        }}
                        className={`flex-1 ${getMatchBadgeColor(project.matchScore)}`}
                        disabled={!project.sizeCompatible}
                      >
                        {project.sizeCompatible ? (
                          <>
                            <Users className="w-4 h-4 mr-2" />
                            Apply as Team
                          </>
                        ) : (
                          <>Team size incompatible</>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="border border-white/10 bg-[#0b111a] text-white">
                      <DialogHeader>
                        <DialogTitle className="text-white">Apply as Team</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label className="text-white/70">Select Team</Label>
                          <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                            <SelectTrigger className="border-white/15 bg-black/40 text-white">
                              <SelectValue placeholder="Choose a team" />
                            </SelectTrigger>
                            <SelectContent className="border border-white/10 bg-[#0b111a] text-white">
                              {teams.map((t: any) => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/70">Why is your team a good fit for this project?</Label>
                          <Textarea
                            placeholder="Describe relevant experience and strengths"
                            value={teamAnswer1}
                            onChange={(e) => setTeamAnswer1(e.target.value)}
                            rows={3}
                            className="border-white/15 bg-black/40 text-white placeholder:text-white/40"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-white/70">Outline your proposed approach or plan</Label>
                          <Textarea
                            placeholder="Briefly outline how you plan to execute"
                            value={teamAnswer2}
                            onChange={(e) => setTeamAnswer2(e.target.value)}
                            rows={3}
                            className="border-white/15 bg-black/40 text-white placeholder:text-white/40"
                          />
                        </div>
                        <Button 
                          onClick={() => handleApplyAsTeam(project.id)} 
                          disabled={!selectedTeam || !teamAnswer1.trim() || !teamAnswer2.trim()}
                          className="w-full bg-sky-500 text-white hover:bg-sky-400"
                        >
                          Submit Application
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>

                {!project.sizeCompatible && (
                  <div className="mt-3 rounded-lg border border-orange-500/25 bg-orange-500/10 p-3">
                    <p className="text-xs text-orange-200">
                      ⚠️ Your team has {project.teamSize} members, but this project requires {project.team_size_min}-{project.team_size_max} members.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}