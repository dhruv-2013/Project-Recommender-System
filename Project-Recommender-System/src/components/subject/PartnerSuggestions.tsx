import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Mail, Loader2 } from "lucide-react";

interface PartnerSuggestionsProps {
  subjectCode: string;
  userId: string;
  selectedPartners?: any[];
  onAddPartner?: (partner: any) => void;
  onRemovePartner?: (partnerId: string) => void;
}

export function PartnerSuggestions({ subjectCode, userId, selectedPartners = [], onAddPartner, onRemovePartner }: PartnerSuggestionsProps) {
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySkills, setMySkills] = useState<string[]>([]);
  const [inviting, setInviting] = useState<string | null>(null);
  const [myTeamId, setMyTeamId] = useState<string | null>(null);

  useEffect(() => {
    fetchMyTeam();
  }, [userId]);

  const fetchMyTeam = async () => {
    try {
      // Check if user has a team
      const { data: teamMember } = await supabase
        .from("team_members")
        .select("team_id")
        .eq("user_id", userId)
        .maybeSingle();
      
      if (teamMember) {
        setMyTeamId(teamMember.team_id);
      }
    } catch (error) {
      console.error("Error fetching team:", error);
    }
  };

  useEffect(() => {
    fetchPartnersAndSkills();
  }, [userId, subjectCode]);

  const fetchPartnersAndSkills = async () => {
    try {
      // Fetch my skills
      const { data: mySkillsData } = await supabase
        .from("user_skills")
        .select("skill_name")
        .eq("user_id", userId);
      
      setMySkills(mySkillsData?.map(s => s.skill_name) || []);

      // Fetch all students enrolled in this subject (excluding yourself)
      const { data: enrolledStudents, error: enrollError } = await supabase
        .from("student_subjects")
        .select("user_id")
        .eq("subject_code", subjectCode)
        .neq("user_id", userId);

      if (enrollError) throw enrollError;

      if (!enrolledStudents || enrolledStudents.length === 0) {
        setPartners([]);
        setLoading(false);
        return;
      }

      const userIds = enrolledStudents.map(s => s.user_id);

      // Fetch profiles for these users
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, field_of_study, academic_level")
        .in("user_id", userIds);

      if (profilesError) throw profilesError;

      // Fetch skills for each user
      const partnersWithSkills = await Promise.all(
        (profilesData || []).map(async (profile) => {
          const { data: skillsData } = await supabase
            .from("user_skills")
            .select("skill_name, level")
            .eq("user_id", profile.user_id);

          const userSkillNames = skillsData?.map(s => s.skill_name) || [];
          
          // Calculate match percentage
          const matchingSkills = mySkills.filter(skill => userSkillNames.includes(skill));
          const matchPercentage = mySkills.length > 0 
            ? Math.round((matchingSkills.length / mySkills.length) * 100)
            : 0;

          return {
            user_id: profile.user_id,
            profiles: {
              full_name: profile.full_name,
              email: profile.email,
            },
            student_profiles: {
              academic_level: profile.academic_level,
              field_of_study: profile.field_of_study,
            },
            skills: userSkillNames,
            matchPercentage,
          };
        })
      );

      // Sort by match percentage
      const sorted = partnersWithSkills.sort((a, b) => b.matchPercentage - a.matchPercentage);
      setPartners(sorted);

    } catch (error) {
      console.error("Error fetching partners:", error);
      toast.error("Failed to load partner suggestions");
    } finally {
      setLoading(false);
    }
  };

  const inviteToTeam = async (partnerId: string, partnerEmail: string) => {
    if (!myTeamId) {
      toast.error("You need to create a team first");
      return;
    }

    setInviting(partnerId);
    try {
      // Create a team invitation
      const { error } = await supabase
        .from("team_invitations")
        .insert({
          team_id: myTeamId,
          email: partnerEmail,
          invited_by: userId,
          status: "pending"
        });

      if (error) throw error;

      toast.success("Invitation sent successfully!");
    } catch (error: any) {
      console.error("Error inviting partner:", error);
      toast.error(error.message || "Failed to send invitation");
    } finally {
      setInviting(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (partners.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No Partners Found</h3>
          <p className="text-muted-foreground">
            No other students are enrolled in {subjectCode} yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Partner Suggestions ({partners.length})</CardTitle>
          <CardDescription>
            Students enrolled in {subjectCode}, sorted by skill match
          </CardDescription>
        </CardHeader>
      </Card>

      {partners.map((student) => (
        <Card key={student.user_id} className="hover-lift">
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold mb-1">
                  {student.profiles?.full_name || "Anonymous"}
                </h3>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  {student.profiles?.email}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {student.matchPercentage}%
                </div>
                <div className="text-xs text-muted-foreground">Skill Match</div>
              </div>
            </div>

            {student.student_profiles && (
              <div className="space-y-2 mb-4">
                {student.student_profiles.academic_level && (
                  <div className="text-sm">
                    <span className="font-medium">Level:</span>{" "}
                    {student.student_profiles.academic_level}
                  </div>
                )}
                {student.student_profiles.field_of_study && (
                  <div className="text-sm">
                    <span className="font-medium">Field:</span>{" "}
                    {student.student_profiles.field_of_study}
                  </div>
                )}
              </div>
            )}

            {student.skills.length > 0 ? (
              <div className="mb-4">
                <div className="text-sm font-medium mb-2">Skills:</div>
                <div className="flex flex-wrap gap-2">
                  {student.skills.map((skill: string) => (
                    <Badge
                      key={skill}
                      variant={mySkills.includes(skill) ? "default" : "secondary"}
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mb-4 text-sm text-muted-foreground italic">
                No skills added yet
              </div>
            )}

            <div className="mt-4 pt-4 border-t flex gap-2">
              {onAddPartner && onRemovePartner ? (
                // For CreateGroup - show Add/Remove
                selectedPartners.some(p => p.user_id === student.user_id) ? (
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => onRemovePartner(student.user_id)}
                  >
                    Remove from Team
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => onAddPartner(student)}
                  >
                    Add to Team
                  </Button>
                )
              ) : (
                // For standalone view - show Invite
                myTeamId ? (
                  <Button 
                    size="sm" 
                    className="w-full"
                    onClick={() => inviteToTeam(student.user_id, student.profiles?.email)}
                    disabled={inviting === student.user_id}
                  >
                    {inviting === student.user_id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Inviting...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Invite to Team
                      </>
                    )}
                  </Button>
                ) : (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-full"
                    disabled
                  >
                    Create a team first
                  </Button>
                )
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}