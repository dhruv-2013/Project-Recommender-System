import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Mail, Crown, Trash2, Code, Zap, UserPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
  const [inviteOpenForTeamId, setInviteOpenForTeamId] = useState<string | null>(null);
  const [inviteEmails, setInviteEmails] = useState<string>("");
  const [inviteLoading, setInviteLoading] = useState<boolean>(false);

  useEffect(() => {
    if (userId) {
      fetchMyTeams();
    }
  }, [userId]);

  const fetchMyTeams = async () => {
    try {
      setLoading(true);

      // Get teams where user is a member
      const { data: teamMembers, error: membersError } = await supabase
        .from("team_members")
        .select("id, team_id, role, joined_at")
        .eq("user_id", userId);

      if (membersError) throw membersError;
      if (!teamMembers || teamMembers.length === 0) {
        setTeams([]);
        setLoading(false);
        return;
      }

      const teamIds = teamMembers.map((tm: any) => tm.team_id);

      // Fetch team details
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .in("id", teamIds);

      if (teamsError) throw teamsError;

      // For each team, get all members and their skills
      const teamsWithDetails = await Promise.all(
        (teamsData || []).map(async (team: any) => {
          const myMembership = teamMembers.find((tm: any) => tm.team_id === team.id);

          // Get all members
          const { data: allMembers } = await supabase
            .from("team_members")
            .select("id, user_id, role, joined_at")
            .eq("team_id", team.id);

          // Fetch profile and skills for each member
          const membersWithProfiles = await Promise.all(
            (allMembers || []).map(async (member: any) => {
              const { data: profile } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("user_id", member.user_id)
                .single();

              // Try to get skills from student_profiles first (where dummy data is stored)
              const { data: studentProfile } = await supabase
                .from("student_profiles")
                .select("skills")
                .eq("user_id", member.user_id)
                .single();

              // Fallback to user_skills table if student_profiles doesn't have skills
              let skillsArray: string[] = [];
              if (studentProfile && Array.isArray(studentProfile.skills) && studentProfile.skills.length > 0) {
                skillsArray = studentProfile.skills;
              } else {
                const { data: userSkills } = await supabase
                  .from("user_skills")
                  .select("skill_name")
                  .eq("user_id", member.user_id);
                skillsArray = userSkills?.map((s: any) => s.skill_name) || [];
              }

              return {
                ...member,
                profiles: profile || { full_name: "Unknown User", email: "N/A" },
                skills: skillsArray
              };
            })
          );

          // Calculate team skills - count occurrences of each skill
          const skillsMap = new Map();
          membersWithProfiles.forEach(member => {
            if (Array.isArray(member.skills)) {
              member.skills.forEach((skillName: string) => {
                const existing = skillsMap.get(skillName);
                if (existing) {
                  existing.count += 1;
                } else {
                  skillsMap.set(skillName, { count: 1 });
                }
              });
            }
          });

          const teamSkills = Array.from(skillsMap.entries())
            .map(([name, data]: [string, any]) => ({
              name,
              count: data.count,
            }))
            .sort((a, b) => b.count - a.count);

          return {
            ...team,
            myRole: myMembership?.role || "member",
            members: membersWithProfiles,
            teamSkills: teamSkills,
          };
        })
      );

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

  const handleInviteMembers = async (teamId: string) => {
    try {
      setInviteLoading(true);
      const emails = inviteEmails
        .split(/[,\n]/)
        .map(e => e.trim())
        .filter(e => e.length > 0);

      if (emails.length === 0) {
        toast.error("Please enter at least one email");
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Not authenticated");
        return;
      }

      const invitations = emails.map(email => ({ team_id: teamId, email, invited_by: user.id }));
      const { error } = await supabase.from("team_invitations").insert(invitations);
      if (error) throw error;

      toast.success(`Invited ${emails.length} member${emails.length > 1 ? 's' : ''}`);
      setInviteEmails("");
      setInviteOpenForTeamId(null);
      onTeamUpdated?.();
    } catch (error: any) {
      console.error("Error inviting members:", error);
      toast.error("Failed to send invitations");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleDeleteTeam = async (teamId: string, teamName: string) => {
    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamId);

      if (error) throw error;

      toast.success(`Deleted team: ${teamName}`);
      fetchMyTeams();
      onTeamUpdated?.();
    } catch (error: any) {
      console.error("Error deleting team:", error);
      toast.error("Failed to delete team");
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
          <CardDescription>Teams you're a member of with combined skills</CardDescription>
        </CardHeader>
      </Card>

      {teams.map((team) => (
        <Card key={team.id} className="hover-lift border-2">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="flex items-center gap-2 text-2xl">
                  {team.name}
                  {team.myRole === 'creator' && (
                    <Badge variant="default" className="text-sm">
                      <Crown className="w-3 h-3 mr-1" />
                      Creator
                    </Badge>
                  )}
                </CardTitle>
                {team.description && (
                  <CardDescription className="mt-2 text-base">{team.description}</CardDescription>
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
                        Are you sure you want to leave "{team.name}"?
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
              {team.myRole === 'creator' && (
                <div className="flex gap-2">
                  <Dialog open={inviteOpenForTeamId === team.id} onOpenChange={(open) => {
                    if (!open) { setInviteOpenForTeamId(null); setInviteEmails(""); }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="gap-2" onClick={() => setInviteOpenForTeamId(team.id)}>
                        <UserPlus className="w-4 h-4" />
                        Invite Members
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Invite members to "{team.name}"</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-2">
                        <Label htmlFor="emails">Emails</Label>
                        <Textarea
                          id="emails"
                          placeholder="Enter email addresses separated by commas or new lines"
                          value={inviteEmails}
                          onChange={(e) => setInviteEmails(e.target.value)}
                        />
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => { setInviteOpenForTeamId(null); setInviteEmails(""); }}>Cancel</Button>
                        <Button disabled={inviteLoading} onClick={() => handleInviteMembers(team.id)}>
                          {inviteLoading ? 'Sending...' : 'Send Invites'}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm" className="gap-2">
                        <Trash2 className="w-4 h-4" />
                        Delete Team
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete this team?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will permanently delete the team and remove all members.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteTeam(team.id, team.name)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
            </div>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-6">
              {/* 🔥 TEAM SKILLS SECTION */}
              {team.teamSkills && team.teamSkills.length > 0 && (
                <div className="bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-pink-500/10 rounded-lg p-6 border-2 border-blue-500/20">
                  <div className="flex items-center gap-2 mb-4">
                    <Zap className="w-6 h-6 text-yellow-500" />
                    <h4 className="font-bold text-xl">Team Skillset</h4>
                    <Badge variant="secondary" className="ml-2">
                      {team.teamSkills.length} skills
                    </Badge>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {team.teamSkills.map((skill: any) => (
                      <Badge 
                        key={skill.name} 
                        variant="default"
                        className="text-base px-4 py-2 bg-blue-600 hover:bg-blue-700"
                      >
                        <Code className="w-4 h-4 mr-2" />
                        {skill.name}
                        {skill.count > 1 && (
                          <span className="ml-2 bg-white/20 px-2 py-0.5 rounded">
                            ×{skill.count}
                          </span>
                        )}
                      </Badge>
                    ))}
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-3">
                    💡 Combined skills from all {team.members?.length || 0} team members
                  </p>
                </div>
              )}

              {/* Team Members Section */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5" />
                  Team Members ({team.members?.length || 0})
                </h4>
                <div className="space-y-2">
                  {team.members && team.members.length > 0 ? (
                    team.members.map((member: any) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 bg-muted rounded-lg border"
                      >
                        <div className="flex-1">
                          <div className="font-medium flex items-center gap-2 text-base">
                            {member.profiles?.full_name || "Anonymous"}
                            {member.role === 'creator' && (
                              <Crown className="w-4 h-4 text-yellow-500" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3" />
                            {member.profiles?.email || "No email"}
                          </div>
                          
                          {/* Member's individual skills */}
                          {member.skills && Array.isArray(member.skills) && member.skills.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {member.skills.map((skillName: string) => (
                                <Badge 
                                  key={skillName} 
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {skillName}
                                </Badge>
                              ))}
                            </div>
                          )}
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
                                    Remove {member.profiles?.full_name || "this member"}?
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