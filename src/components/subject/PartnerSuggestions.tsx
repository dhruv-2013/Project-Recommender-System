import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Users, Mail, Star, Plus, Check, RefreshCw } from "lucide-react";
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

const isUuid = (v: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);

// ---- Mock data generator ----
const generateMockStudents = (count: number = 25) => {
  const first = ["Alice","Bob","Charlie","Diana","Eve","Frank","Grace","Henry","Iris","Jack","Kelly","Leo","Maya","Noah","Olivia","Peter","Quinn","Rachel","Sam","Tara","Uma","Victor","Wendy","Xavier","Yara","Zoe","Aaron","Beth","Chris","Dana"];
  const last = ["Smith","Johnson","Williams","Brown","Jones","Garcia","Miller","Davis","Rodriguez","Martinez","Wilson","Anderson","Taylor","Thomas","Moore","Jackson","Martin","Lee","Thompson","White"];
  const levels = ["Undergraduate","Graduate","Masters","PhD"];
  const fields = ["Computer Science","Software Engineering","Data Science","Information Systems","Cybersecurity","AI & Machine Learning","Game Development","Mobile Development"];
  const skillSets = [
    ["Python","React","Node.js","MongoDB","AWS"],
    ["Java","Spring Boot","PostgreSQL","Docker","Kubernetes"],
    ["JavaScript","TypeScript","Vue.js","GraphQL","Firebase"],
    ["C++","Unity","Game Design","3D Modeling","Blender"],
    ["Python","TensorFlow","Machine Learning","Data Analysis","R"],
    ["React Native","Swift","Kotlin","Mobile UI/UX","Flutter"],
    ["HTML","CSS","Figma","Adobe XD","Responsive Design"],
    ["Go","Rust","System Design","Microservices","Redis"],
  ];

  return Array.from({ length: count }, (_, i) => {
    const f = first[i % first.length];
    const l = last[Math.floor(Math.random() * last.length)];
    const skills = skillSets[i % skillSets.length];
    return {
      id: `mock-student-${i + 1}`,
      name: `${f} ${l}`,
      email: `${f.toLowerCase()}.${l.toLowerCase()}@university.edu`,
      level: levels[Math.floor(Math.random() * levels.length)],
      field: fields[Math.floor(Math.random() * fields.length)],
      wam: parseFloat((Math.random() * 25 + 65).toFixed(1)),
      skills,
      matchPercentage: Math.floor(Math.random() * 40 + 60),
    };
  });
};

export function PartnerSuggestions({ subjectCode, userId, selectedPartners = [], onAddPartner, onRemovePartner, onPartnerAdded }: PartnerSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [mySkills, setMySkills] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [useMockData, setUseMockData] = useState(false);
  const [myTeams, setMyTeams] = useState<any[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [addingUserId, setAddingUserId] = useState<string | null>(null);
  const [addedPartners, setAddedPartners] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentStudent, setCurrentStudent] = useState<any>(null);

  useEffect(() => {
    void fetchSuggestions();
    void fetchMyTeams();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectCode, userId]);

  const fetchMyTeams = async () => {
    try {
      const { data: teamMembers, error } = await supabase
        .from("team_members")
        .select(`
          team_id,
          role,
          teams:team_id (
            id,
            name,
            created_by
          )
        `)
        .eq("user_id", userId);

      if (error) throw error;

      // Only show teams where the user is the creator
      const creatorTeams = teamMembers?.filter(tm => tm.role === 'creator') || [];
      setMyTeams(creatorTeams.map(tm => tm.teams));
    } catch (error) {
      console.error("Error fetching teams:", error);
    }
  };

  const fetchSuggestions = async () => {
    try {
      setLoading(true);
      
      // Your skills
      const { data: userSkillsData } = await supabase
        .from("user_skills")
        .select("skill_name")
        .eq("user_id", userId);
      
      const my = userSkillsData?.map((s) => s.skill_name) || [];
      setMySkills(my);

      // Peers in the same subject
      const { data: peers } = await supabase
        .from("student_subjects")
        .select(`
          user_id,
          profiles:user_id (full_name, email),
          student_profiles:user_id (academic_level, field_of_study, wam)
        `)
        .eq("subject_code", subjectCode)
        .neq("user_id", userId);

      if (peers && peers.length > 0) {
        setUseMockData(false);
        const rows = await Promise.all(
          peers.map(async (p: any) => {
            const { data: theirSkills } = await supabase
              .from("user_skills")
              .select("skill_name")
              .eq("user_id", p.user_id);
            
            const skills = theirSkills?.map((x) => x.skill_name) || [];
            const matchCount = my.filter((k) => skills.includes(k)).length;
            const matchPercentage = my.length
              ? Math.round((matchCount / my.length) * 100)
              : Math.floor(Math.random() * 40 + 60);

            return {
              id: p.user_id,
              name: p.profiles?.full_name || "Anonymous",
              email: p.profiles?.email || "",
              level: p.student_profiles?.academic_level || "Undergraduate",
              field: p.student_profiles?.field_of_study || "Computer Science",
              wam: p.student_profiles?.wam ?? null,
              skills,
              matchPercentage,
            };
          })
        );
        rows.sort((a, b) => b.matchPercentage - a.matchPercentage);
        setSuggestions(rows);
      } else {
        setUseMockData(true);
        const mocks = generateMockStudents(25).sort((a, b) => b.matchPercentage - a.matchPercentage);
        setSuggestions(mocks);
        toast.info("Showing sample students for testing. Create real users to see actual data.");
      }
    } catch (e) {
      console.error(e);
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

    // Mock student - just add to local state
    if (!isUuid(student.id)) {
      setAddedPartners(prev => new Set(prev).add(student.id));
      toast.success(`${student.name} added to team (mock data)`);
      setDialogOpen(false);
      setSelectedTeam("");
      onPartnerAdded?.();
      return;
    }

    setAddingUserId(student.id);

    try {
      // Check if user is already a member
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

      // Directly add to team (for testing - no invitation needed)
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: selectedTeam,
          user_id: student.id,
          role: "member"
        });

      if (memberError) throw memberError;

      setAddedPartners(prev => new Set(prev).add(student.id));
      toast.success(`${student.name} added to your team!`);
      setDialogOpen(false);
      setSelectedTeam("");
      onPartnerAdded?.(); // Notify parent to refresh
    } catch (e: any) {
      console.error(e);
      toast.error("Failed to add partner", { description: e?.message });
    } finally {
      setAddingUserId(null);
    }
  };

  const refreshMocks = () => {
    const mocks = generateMockStudents(25).sort((a, b) => b.matchPercentage - a.matchPercentage);
    setSuggestions(mocks);
    setAddedPartners(new Set());
    toast.success("New mock students generated");
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
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Partner Suggestions
                {useMockData && <Badge variant="secondary" className="text-xs">Mock Data</Badge>}
              </CardTitle>
              <CardDescription>Students enrolled in {subjectCode}, sorted by skill match</CardDescription>
            </div>
            {useMockData && (
              <Button variant="outline" size="sm" onClick={refreshMocks}>
                <RefreshCw className="w-4 h-4 mr-2" />
                New Random Students
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <Input
            placeholder="Search by name, email, or skills..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full"
          />
        </CardContent>
      </Card>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No matches found</h3>
            <p className="text-muted-foreground">Try adjusting your search terms</p>
          </CardContent>
        </Card>
      ) : (
        filtered.map((student) => {
          const isAdded = addedPartners.has(student.id);
          const isAdding = addingUserId === student.id;

          return (
            <Card key={student.id} className="hover-lift">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-1">{student.name}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                      <Mail className="h-4 w-4" />
                      {student.email}
                    </div>
                    <div className="flex gap-2 text-sm flex-wrap">
                      {student.level && <Badge variant="outline">{student.level}</Badge>}
                      {student.field && <Badge variant="outline">{student.field}</Badge>}
                      {student.wam && (
                        <Badge variant="secondary">
                          <Star className="h-3 w-3 mr-1" />
                          WAM: {typeof student.wam === "number" ? student.wam.toFixed(1) : student.wam}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <div className={`text-3xl font-bold ${getMatchColor(student.matchPercentage)}`}>
                      {student.matchPercentage}%
                    </div>
                    <div className="text-xs text-muted-foreground">Match Score</div>
                  </div>
                </div>

                {Array.isArray(student.skills) && student.skills.length > 0 && (
                  <div className="mb-4">
                    <div className="text-sm font-medium mb-2">Skills:</div>
                    <div className="flex flex-wrap gap-2">
                      {student.skills.map((skill: string) => (
                        <Badge key={skill} variant={mySkills.includes(skill) ? "default" : "secondary"}>
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  {onAddPartner && onRemovePartner ? (
                    // New flow: Add to selection for creating new team
                    <>
                      {selectedPartners.some(p => p.user_id === student.id) ? (
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => onRemovePartner(student.id)}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Remove from Team
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          className="flex-1"
                          onClick={() => {
                            // Only allow adding real students with UUIDs
                            if (useMockData) {
                              toast.error("Please create real users using the test data generator to form teams");
                              return;
                            }
                            onAddPartner({ 
                              user_id: student.id, 
                              profiles: { full_name: student.name, email: student.email }, 
                              skills: student.skills 
                            });
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add to Team
                        </Button>
                      )}
                    </>
                  ) : myTeams.length > 0 ? (
                    // Old flow: Add directly to existing team
                    <Dialog open={dialogOpen && currentStudent?.id === student.id} onOpenChange={(open) => {
                      setDialogOpen(open);
                      if (open) setCurrentStudent(student);
                      else {
                        setCurrentStudent(null);
                        setSelectedTeam("");
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button
                          variant={isAdded ? "outline" : "default"}
                          className="flex-1"
                          disabled={isAdded || isAdding}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-4 h-4 mr-2" />
                              Added
                            </>
                          ) : (
                            <>
                              <Plus className="w-4 h-4 mr-2" />
                              Add to Team
                            </>
                          )}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add to Team</DialogTitle>
                          <DialogDescription>
                            Select a team to add {student.name} directly
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="team-select">Select Team</Label>
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
                            className="w-full"
                          >
                            {isAdding ? "Adding..." : "Add to Team"}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  ) : (
                    <div className="flex-1 text-center p-3 bg-muted rounded-lg">
                      <p className="text-sm text-muted-foreground">
                        Use the "Make Group" tab to create a team
                      </p>
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