import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, Mail, Star, Plus, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PartnerSuggestionsProps {
  subjectCode: string;
  userId: string;
  selectedPartners?: any[];
  onAddPartner?: (partner: any) => void;
  onRemovePartner?: (partnerId: string) => void;
  onPartnerAdded?: () => void;
}

export function PartnerSuggestions({
  subjectCode,
  userId,
  selectedPartners = [],
  onAddPartner,
  onRemovePartner,
  onPartnerAdded,
}: PartnerSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySkills, setMySkills] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [addedPartners, setAddedPartners] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<any>(null);

  useEffect(() => {
    void fetchSuggestions();
    void fetchMyTeams();
  }, [subjectCode, userId]);

  const fetchMyTeams = async () => {
    try {
      const { data: teamMembers, error } = await supabase
        .from("team_members")
        .select(`team_id, role, teams:team_id (id, name, created_by)`)
        .eq("user_id", userId);

      if (error) throw error;
      const creatorTeams = teamMembers?.filter((tm) => tm.role === "creator") || [];
      setMyTeams(creatorTeams.map((tm) => tm.teams));
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const fetchSuggestions = async () => {
    try {
      setLoading(true);

      // 1️⃣ Get current user's skills
      const { data: userSkillsData } = await supabase
        .from("user_skills")
        .select("skill_name")
        .eq("user_id", userId);

      const my = userSkillsData?.map((s) => s.skill_name) || [];
      setMySkills(my);

      // 2️⃣ Fetch all COMP3900 students directly from student_profiles
      const { data: partners, error } = await supabase
        .from("student_profiles")
        .select("*")
        .contains("courses", [subjectCode])
        .neq("user_id", userId);

      if (error) throw error;

      // 3️⃣ Compute skill match %
      const rows = partners.map((p) => {
        const skills = Array.isArray(p.skills) ? p.skills : [];
        const matchCount = my.filter((k) => skills.includes(k)).length;
        const matchPercentage = my.length
          ? Math.round((matchCount / my.length) * 100)
          : Math.floor(Math.random() * 40 + 60);

        return {
          id: p.user_id,
          name: p.name || "Anonymous",
          email: p.email || "",
          level: p.academic_level || "Undergraduate",
          field: p.field_of_study || "Computer Science",
          wam: p.wam ?? null,
          skills,
          matchPercentage,
        };
      });

      rows.sort((a, b) => b.matchPercentage - a.matchPercentage);
      setSuggestions(rows);
    } catch (e) {
      console.error("Error fetching suggestions:", e);
      toast.error("Failed to load partner suggestions");
    } finally {
      setLoading(false);
    }
  };

  const handleAddToTeam = async (student: any) => {
    if (!selectedTeam) {
      toast.error("Please select a team first");
      return;
    }

    setAddingUserId(student.id);

    try {
      const { data: existingMember } = await supabase
        .from("team_members")
        .select("*")
        .eq("team_id", selectedTeam)
        .eq("user_id", student.id)
        .maybeSingle();

      if (existingMember) {
        toast.error("This user is already a member of the team");
        setAddingUserId(null);
        return;
      }

      const { error: memberError } = await supabase.from("team_members").insert({
        team_id: selectedTeam,
        user_id: student.id,
        role: "member",
      });

      if (memberError) throw memberError;

      setAddedPartners((prev) => new Set(prev).add(student.id));
      toast.success(`${student.name} added to your team!`);
      setDialogOpen(false);
      setSelectedTeam("");
      onPartnerAdded?.();
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to add partner", { description: e?.message });
    } finally {
      setAddingUserId(null);
    }
  };

  const getMatchColor = (p: number) => {
    if (p >= 80) return "text-green-500";
    if (p >= 70) return "text-blue-500";
    return "text-yellow-500";
  };

  const filtered = suggestions.filter(
    (s) =>
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (Array.isArray(s.skills) &&
        s.skills.some((sk: string) => sk.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  if (loading) {
    return (
      <Card className="rounded-3xl border border-white/10 bg-black/60 text-white/70 shadow-[0_18px_45px_-30px_rgba(56,189,248,0.45)]">
        <CardContent className="flex items-center justify-center p-12">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-sky-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-3xl border border-white/10 bg-black/60 text-white/70 shadow-[0_18px_45px_-30px_rgba(56,189,248,0.45)]">
        <CardHeader>
          <CardTitle className="text-white">Partner Suggestions</CardTitle>
          <CardDescription className="text-white/60">
            Students enrolled in {subjectCode}, sorted by skill match
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name, email, or skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border-white/10 bg-black/40 text-white placeholder:text-white/40 focus-visible:ring-0"
          />
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card className="rounded-3xl border border-white/10 bg-black/60 text-white/70">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Users className="mb-4 h-12 w-12 text-white/40" />
            <h3 className="mb-2 text-lg font-semibold text-white">No students found</h3>
            <p className="text-white/50">
              {suggestions.length === 0
                ? `No other students are enrolled in ${subjectCode} yet.`
                : "Try adjusting your search terms"}
            </p>
          </CardContent>
        </Card>
      ) : (
        filtered.map((student) => {
          const isAdded = addedPartners.has(student.id);
          const isAdding = addingUserId === student.id;

          return (
            <Card
              key={student.id}
              className="rounded-3xl border border-white/10 bg-black/70 text-white/80 transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/60 hover:shadow-[0_25px_60px_-35px_rgba(56,189,248,0.65)]"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="mb-1 text-xl font-semibold text-white">{student.name}</h3>
                    <div className="mb-2 flex items-center gap-2 text-sm text-white/50">
                      <Mail className="h-4 w-4" />
                      {student.email}
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {student.level && (
                        <Badge variant="outline" className="border-white/15 bg-white/10 text-white/70">
                          {student.level}
                        </Badge>
                      )}
                      {student.field && (
                        <Badge variant="outline" className="border-white/15 bg-white/10 text-white/70">
                          {student.field}
                        </Badge>
                      )}
                      {student.wam && (
                        <Badge variant="secondary" className="bg-emerald-500/20 text-emerald-300">
                          <Star className="mr-1 h-3 w-3" />
                          WAM: {typeof student.wam === "number" ? student.wam.toFixed(1) : student.wam}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className={`text-3xl font-bold ${getMatchColor(student.matchPercentage)}`}>
                      {student.matchPercentage}%
                    </div>
                    <div className="text-xs text-white/50">Match Score</div>
                  </div>
                </div>

                {Array.isArray(student.skills) && student.skills.length > 0 && (
                  <div className="mb-4">
                    <div className="mb-2 text-sm font-medium text-white">Skills:</div>
                    <div className="flex flex-wrap gap-2">
                      {student.skills.map((skill: string) => (
                        <Badge
                          key={skill}
                          variant={mySkills.includes(skill) ? "default" : "secondary"}
                          className={
                            mySkills.includes(skill)
                              ? "bg-sky-400/30 text-sky-200"
                              : "bg-white/10 text-white/70"
                          }
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {onAddPartner && onRemovePartner && (
                    <>
                      {selectedPartners.some((p) => p.user_id === student.id) ? (
                        <Button
                          variant="outline"
                          className="flex-1 border-white/20 text-white hover:bg-white/10"
                          onClick={() => onRemovePartner(student.id)}
                        >
                          <Check className="mr-2 h-4 w-4" /> Remove from New Team
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          className="flex-1 bg-sky-500 text-white hover:bg-sky-400"
                          onClick={() =>
                            onAddPartner({
                              user_id: student.id,
                              profiles: { full_name: student.name, email: student.email },
                              skills: student.skills,
                            })
                          }
                        >
                          <Plus className="mr-2 h-4 w-4" /> Add to New Team
                        </Button>
                      )}
                    </>
                  )}

                  {myTeams.length > 0 ? (
                    <Dialog
                      open={dialogOpen && currentStudent?.id === student.id}
                      onOpenChange={(open) => {
                        setDialogOpen(open);
                        if (open) setCurrentStudent(student);
                        else {
                          setCurrentStudent(null);
                          setSelectedTeam("");
                        }
                      }}
                    >
                      <DialogTrigger asChild>
                        <Button variant={isAdded ? "outline" : "default"} className="flex-1" disabled={isAdded || isAdding}>
                          {isAdded ? (
                            <>
                              <Check className="w-4 h-4 mr-2" /> Added
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" /> Add to My Team
                            </>
                          )}
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="border border-white/10 bg-[#0b111a] text-white">
                        <DialogHeader>
                          <DialogTitle className="text-white">Add to Existing Team</DialogTitle>
                          <DialogDescription className="text-white/60">
                            Select a team to add {student.name} directly
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="team-select" className="text-white/70">
                              Select Team
                            </Label>
                            <Select value={selectedTeam} onValueChange={setSelectedTeam}>
                              <SelectTrigger id="team-select">
                                <SelectValue placeholder="Choose a team" />
                              </SelectTrigger>
                              <SelectContent>
                                {myTeams.map((team: any) => (
                                  <SelectItem key={team.id} value={team.id}>
                                    {team.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <Button
                            onClick={() => handleAddToTeam(student)}
                            disabled={!selectedTeam || isAdding}
                            className="w-full bg-sky-500 text-white hover:bg-sky-400"
                          >
                            {isAdding ? "Adding..." : "Add to Team"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <div className="flex-1 rounded-lg border border-white/10 bg-black/40 p-3 text-center">
                      <p className="text-sm text-white/60">Use the "Make Group" tab to create a team</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
