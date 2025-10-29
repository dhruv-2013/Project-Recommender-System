// src/components/subject/TeamProjectRecommendations.tsx
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
      const { error } = await supabase
        .from("applications")
        .insert({
          project_id: projectId,
          applicant_type: "team",
          applicant_id: selectedTeam,
          status: "pending"
        });

      if (error) throw error;

      toast.success("Team application submitted successfully!");
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
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
          <p className="text-muted-foreground">
            Create a team first to get project recommendations based on your team's combined skills!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-6 h-6 text-primary" />
            Team Project Recommendations
          </CardTitle>
          <CardDescription>
            Get personalized project recommendations based on your team's combined skillset
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Select Your Team</label>
              <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a team" />
                </SelectTrigger>
                <SelectContent>
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
        <Card>
          <CardContent className="flex items-center justify-center p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4" />
              <p className="text-muted-foreground">Analyzing team skills and matching projects...</p>
            </div>
          </CardContent>
        </Card>
      ) : recommendations.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No matching projects found</h3>
            <p className="text-muted-foreground">
              No projects match your team's current skillset. Try adding more team members with diverse skills!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card className="bg-gradient-to-r from-blue-500/5 to-purple-500/5 border-blue-500/20">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                <CardTitle className="text-lg">
                  Found {recommendations.length} Matching Projects
                </CardTitle>
              </div>
              <CardDescription>
                Projects are ranked by how well they match your team's skills
              </CardDescription>
            </CardHeader>
          </Card>

          {recommendations.map((project, index) => (
            <Card key={project.id} className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <h3 className="text-xl font-semibold">{project.title}</h3>
                    </div>
                    <p className="text-muted-foreground mb-3">{project.description}</p>
                  </div>
                  <div className="ml-4 text-right">
                    <div className={`text-3xl font-bold ${getMatchColor(project.matchScore)}`}>
                      {project.matchScore}%
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Star className="w-3 h-3 fill-current" />
                      Match Score
                    </div>
                  </div>
                </div>

                {/* Project Info */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {project.team_size_min}-{project.team_size_max} members
                    </span>
                    {project.sizeCompatible ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        Size mismatch
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>{project.estimated_duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span>{project.difficulty_level}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span>{project.category}</span>
                  </div>
                </div>

                {/* Skills Breakdown */}
                <div className="space-y-3 mb-4">
                  {project.matchedRequired.length > 0 && (
                    <div>
                      <div className="text-sm font-medium mb-2 flex items-center gap-2">
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
                      <div className="text-sm font-medium mb-2 flex items-center gap-2">
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
                      <div className="text-sm font-medium mb-2 flex items-center gap-2">
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
                <div className="flex gap-3 pt-4 border-t">
                  <Button
                    onClick={() => handleApplyAsTeam(project.id)}
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
                  <Button variant="outline" className="flex-1">
                    View Details
                  </Button>
                </div>

                {!project.sizeCompatible && (
                  <div className="mt-3 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                    <p className="text-xs text-orange-700 dark:text-orange-300">
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