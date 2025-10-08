import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Users, Mail } from "lucide-react";

interface PartnerSuggestionsProps {
  subjectCode: string;
  userId: string;
}

export function PartnerSuggestions({ subjectCode, userId }: PartnerSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySkills, setMySkills] = useState<string[]>([]);

  useEffect(() => {
    fetchSuggestions();
  }, [subjectCode, userId]);

  const fetchSuggestions = async () => {
    try {
      // Fetch current user's skills
      const { data: userSkillsData } = await supabase
        .from("user_skills")
        .select("skill_name")
        .eq("user_id", userId);

      const skills = userSkillsData?.map(s => s.skill_name) || [];
      setMySkills(skills);

      // Fetch other students in the same subject
      const { data: otherStudents } = await supabase
        .from("student_subjects")
        .select(`
          user_id,
          profiles!inner(full_name, email),
          student_profiles!inner(*)
        `)
        .eq("subject_code", subjectCode)
        .neq("user_id", userId);

      if (otherStudents) {
        // Calculate skill matches
        const studentsWithMatch = await Promise.all(
          otherStudents.map(async (student: any) => {
            const { data: studentSkills } = await supabase
              .from("user_skills")
              .select("skill_name")
              .eq("user_id", student.user_id);

            const theirSkills = studentSkills?.map(s => s.skill_name) || [];
            const matchCount = skills.filter(skill => theirSkills.includes(skill)).length;
            const matchPercentage = skills.length > 0 
              ? Math.round((matchCount / skills.length) * 100)
              : 0;

            return {
              ...student,
              skills: theirSkills,
              matchPercentage,
              matchCount
            };
          })
        );

        // Sort by match percentage
        studentsWithMatch.sort((a, b) => b.matchPercentage - a.matchPercentage);
        setSuggestions(studentsWithMatch);
      }
    } catch (error) {
      console.error("Error fetching suggestions:", error);
      toast.error("Failed to load partner suggestions");
    } finally {
      setLoading(false);
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

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center p-12 text-center">
          <Users className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No partners found</h3>
          <p className="text-muted-foreground">
            No other students are enrolled in this subject yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Partner Suggestions</CardTitle>
          <CardDescription>
            Students enrolled in {subjectCode}, sorted by skill match
          </CardDescription>
        </CardHeader>
      </Card>

      {suggestions.map((student) => (
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
                <div className="text-sm">
                  <span className="font-medium">Level:</span>{" "}
                  {student.student_profiles.academic_level}
                </div>
                <div className="text-sm">
                  <span className="font-medium">Field:</span>{" "}
                  {student.student_profiles.field_of_study}
                </div>
              </div>
            )}

            {student.skills.length > 0 && (
              <div>
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
            )}

            <div className="mt-4 pt-4 border-t">
              <Button size="sm" className="w-full">
                Send Team Invitation
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
