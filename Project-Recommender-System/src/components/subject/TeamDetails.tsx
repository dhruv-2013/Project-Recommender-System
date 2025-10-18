import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp } from "lucide-react";
import { toast } from "sonner";

interface TeamDetailsProps {
  subjectCode: string;
  userId: string;
}

export function TeamDetails({ subjectCode, userId }: TeamDetailsProps) {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamDetails();
  }, [userId, subjectCode]);

  const fetchTeamDetails = async () => {
    try {
      console.log("Fetching team details for user:", userId);
      
      // Fetch all teams where user is a member
      const { data: memberData, error: memberError } = await supabase
        .from("team_members")
        .select(`
          *,
          teams:team_id (
            id,
            name,
            description,
            created_by
          )
        `)
        .eq("user_id", userId);

      console.log("Member data:", memberData);
      console.log("Member error:", memberError);

      if (memberError) throw memberError;

      if (memberData && memberData.length > 0) {
        // Fetch members and calculate skills for each team
        const teamsWithDetails = await Promise.all(
          memberData.map(async (teamMember) => {
            const teamId = teamMember.teams.id;

            // Fetch all team members
            const { data: membersData, error: membersError } = await supabase
              .from("team_members")
              .select("user_id, role, joined_at")
              .eq("team_id", teamId);

            console.log("Team ID:", teamId);
            console.log("Members data for team:", membersData);

            if (membersError) {
              console.error("Error fetching team members:", membersError);
              return null;
            }

            // Fetch profiles and skills for each member
            const membersWithProfiles = await Promise.all(
              (membersData || []).map(async (member) => {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("user_id, full_name, email, field_of_study")
                  .eq("user_id", member.user_id)
                  .maybeSingle();
                
                // Fetch actual technical skills for this member
                const { data: skills } = await supabase
                  .from("user_skills")
                  .select("skill_name, level")
                  .eq("user_id", member.user_id);
                
                console.log(`Skills for ${profile?.full_name}:`, skills);
                
                return {
                  id: member.user_id,
                  user_id: member.user_id,
                  role: member.role,
                  joined_at: member.joined_at,
                  profiles: profile,
                  skills: skills || [],
                };
              })
            );

            // Calculate team strength using actual technical skills
            const memberCount = membersWithProfiles.length;
            const uniqueSkills = new Set<string>();
            
            // Collect all unique skills from all members
            membersWithProfiles.forEach((member) => {
              member.skills.forEach((skill: any) => {
                uniqueSkills.add(skill.skill_name);
              });
            });

            const skillsArray = Array.from(uniqueSkills);

            const strength = {
              memberCount,
              skillCount: skillsArray.length || 0,
              skills: skillsArray,
              completeness: Math.min(100, (memberCount / 4) * 100),
            };

            console.log("Team strength calculated:", strength);

            return {
              ...teamMember.teams,
              members: membersWithProfiles,
              strength,
            };
          })
        );

        const validTeams = teamsWithDetails.filter(Boolean);
        console.log("Final teams with details:", validTeams);
        setTeams(validTeams);
      } else {
        setTeams([]);
      }
    } catch (error: any) {
      console.error("Error fetching teams:", error);
      toast.error("Failed to load team details");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!teams || teams.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Team Yet</h3>
          <p className="text-muted-foreground mb-4">
            Create a team in the "Make Group" tab to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {teams.map((team) => (
        <Card key={team.id}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {team.name}
            </CardTitle>
            {team.description && (
              <p className="text-sm text-muted-foreground">{team.description}</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Team Strength */}
            <div className="bg-muted p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="h-4 w-4" />
                <h4 className="font-semibold">Team Strength</h4>
              </div>
              <div className="grid grid-cols-3 gap-4 mb-3">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{team.strength.memberCount}</div>
                  <div className="text-xs text-muted-foreground">Members</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{team.strength.skillCount}</div>
                  <div className="text-xs text-muted-foreground">Skills</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{Math.round(team.strength.completeness)}%</div>
                  <div className="text-xs text-muted-foreground">Complete</div>
                </div>
              </div>
              {team.strength.skills.length > 0 ? (
                <div>
                  <div className="text-xs font-medium mb-2">Team Skillset:</div>
                  <div className="flex flex-wrap gap-1">
                    {team.strength.skills.map((skill: string) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground italic">
                  No skills added yet. Team members should add their skills to their profiles.
                </div>
              )}
            </div>

            {/* Team Members */}
            <div>
              <h4 className="font-semibold mb-2">Team Members ({team.members.length})</h4>
              <div className="space-y-2">
                {team.members.map((member: any) => (
                  <div key={member.id} className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-sm">{member.profiles?.full_name || "Unknown"}</p>
                        <p className="text-xs text-muted-foreground">{member.profiles?.email}</p>
                        {member.profiles?.field_of_study && (
                          <p className="text-xs text-muted-foreground">{member.profiles.field_of_study}</p>
                        )}
                      </div>
                      {member.role === "creator" && (
                        <Badge variant="default" className="text-xs">Creator</Badge>
                      )}
                    </div>
                    {member.skills && member.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {member.skills.map((skill: any) => (
                          <Badge key={skill.skill_name} variant="outline" className="text-xs">
                            {skill.skill_name} {skill.level && `(L${skill.level})`}
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic mt-2">
                        No skills added yet
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}