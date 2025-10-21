import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Mail, Crown, Trash2, Code } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface MyTeamsProps {
  userId: string;
  onTeamUpdated?: () => void;
}

export function MyTeams({ userId, onTeamUpdated }: MyTeamsProps) {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      console.log("MyTeams - userId:", userId);
      fetchMyTeams();
    }
  }, [userId]);

  const fetchMyTeams = async () => {
    try {
      setLoading(true);
      console.log("Fetching teams for user:", userId);

      // Get teams where user is a member
      const { data: teamMembers, error: membersError } = await supabase
        .from("team_members")
        .select("id, team_id, role, joined_at")
        .eq("user_id", userId);

      console.log("Team members result:", { teamMembers, membersError });

      if (membersError) {
        console.error("Error fetching team members:", membersError);
        throw membersError;
      }

      if (!teamMembers || teamMembers.length === 0) {
        console.log("No team memberships found");
        setTeams([]);
        setLoading(false);
        return;
      }

      // Get team IDs
      const teamIds = teamMembers.map((tm: any) => tm.team_id);
      console.log("Team IDs:", teamIds);

      // Fetch team details
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .in("id", teamIds);

      console.log("Teams data result:", { teamsData, teamsError });

      if (teamsError) {
        console.error("Error fetching teams:", teamsError);
        throw teamsError;
      }

      // For each team, get all members and their skills
      const teamsWithDetails = await Promise.all(
        (teamsData || []).map(async (team: any) => {
          // Find this user's role in the team
          const myMembership = teamMembers.find((tm: any) => tm.team_id === team.id);

          // Get all members of this team
          const { data: allMembers } = await supabase
            .from("team_members")
            .select("id, user_id, role, joined_at")
            .eq("team_id", team.id);

          // Fetch profile for each member
          const membersWithProfiles = await Promise.all(
            (allMembers || []).map(async (member: any) => {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("user_id", member.user_id)
                .single();

              return {
                ...member,
                profiles: profile || { full_name: "Unknown User", email: "N/A" }
              };
            })
          );

          // Get all skills for team members
          const memberUserIds = membersWithProfiles.map(m => m.user_id);
          let teamSkills: string[] = [];

          if (memberUserIds.length > 0) {
            const { data: skillsData } = await supabase
              .from("user_skills")
              .select("skill_name")
              .in("user_id", memberUserIds);

            if (skillsData) {
              const uniqueSkills = new Set(skillsData.map(s => s.skill_name));
              teamSkills = Array.from(uniqueSkills);
            }
          }

          return {
            ...team,
            myRole: myMembership?.role || "member",
            members: membersWithProfiles,
            teamSkills: teamSkills,
          };
        })
      );

      console.log("Teams with details:", teamsWithDetails);
      setTeams(teamsWithDetails);
    } catch (error) {
      console.error("Error in fetchMyTeams:", error);
      toast.error("Failed to load teams");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (teamId: string, memberId: string, memberName: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("id", memberId);

      if (error) throw error;

      toast.success(`Removed ${memberName} from team`);
      fetchMyTeams();
      onTeamUpdated?.();
    } catch (error: any) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  const handleLeaveTeam = async (teamId: string, teamName: string) => {
    try {
      const { error } = await supabase
        .from("team_members")
        .delete()
        .eq("team_id", teamId)
        .eq("user_id", userId);

      if (error) throw error;

      toast.success(`Left team: ${teamName}`);
      fetchMyTeams();
      onTeamUpdated?.();
    } catch (error: any) {
      console.error("Error leaving team:", error);
      toast.error("Failed to leave team");
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
          <p className="text-muted-foreground">
            Create a team in the "Make Group" tab to get started
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>My Teams ({teams.length})</CardTitle>
          <CardDescription>Teams you're a member of</CardDescription>
        </CardHeader>
      </Card>

      {teams.map((team) => (
        <Card key={team.id} className="hover-lift">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2">
                  {team.name}
                  {team.myRole === 'creator' && (
                    <Badge variant="default">
                      <Crown className="w-3 h-3 mr-1" />
                      Creator
                    </Badge>
                  )}
                </CardTitle>
                {team.description && (
                  <CardDescription className="mt-2">{team.description}</CardDescription>
                )}
              </div>
              {team.myRole !== 'creator' && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      Leave Team
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Leave Team?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to leave "{team.name}"? You'll need to be re-invited to join again.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleLeaveTeam(team.id, team.name)}>
                        Leave
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Team Skills */}
              {team.teamSkills && team.teamSkills.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Code className="w-4 h-4" />
                    Team Skills ({team.teamSkills.length})
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {team.teamSkills.map((skill: string) => (
                      <Badge key={skill} variant="default">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Team Members */}
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Team Members ({team.members?.length || 0})
                </h4>
                <div className="space-y-2">
                  {team.members && team.members.length > 0 ? (
                    team.members.map((member: any) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {member.profiles?.full_name || "Anonymous"}
                              {member.role === 'creator' && (
                                <Crown className="w-4 h-4 text-yellow-500" />
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              {member.profiles?.email || "No email"}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={member.role === 'creator' ? 'default' : 'secondary'}>
                            {member.role}
                          </Badge>
                          {team.myRole === 'creator' && member.role !== 'creator' && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <Trash2 className="w-4 h-4 text-destructive" />
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Remove Member?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to remove {member.profiles?.full_name || "this member"} from the team?
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction 
                                    onClick={() => handleRemoveMember(team.id, member.id, member.profiles?.full_name || "member")}
                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                  >
                                    Remove
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No members yet</p>
                  )}
                </div>
              </div>

              {team.created_at && (
                <div className="text-xs text-muted-foreground">
                  Created {new Date(team.created_at).toLocaleDateString()}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}