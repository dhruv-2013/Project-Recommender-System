import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, Plus, X, ArrowLeft } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface SubjectSelectorProps {
  userId: string;
}

export function SubjectSelector({ userId }: SubjectSelectorProps) {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [enrolledSubjects, setEnrolledSubjects] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTerm, setSelectedTerm] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [userId]);

  const fetchData = async () => {
    try {
      // Fetch all available subjects
      const { data: subjectsData } = await supabase
        .from("subjects")
        .select("*")
        .order("code");

      setSubjects(subjectsData || []);

      // Fetch user's enrolled subjects
      const { data: enrolledData } = await supabase
        .from("student_subjects")
        .select(`
          *,
          subjects(code, name)
        `)
        .eq("user_id", userId);

      setEnrolledSubjects(enrolledData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!selectedSubject || !selectedTerm) {
      toast.error("Please select both subject and term");
      return;
    }

    try {
      const { error } = await supabase
        .from("student_subjects")
        .insert({
          user_id: userId,
          subject_code: selectedSubject,
          term: selectedTerm
        });

      if (error) throw error;

      toast.success("Enrolled in subject successfully!");
      navigate(`/subject/${selectedSubject}`);
      setSelectedSubject("");
      setSelectedTerm("");
      fetchData();
    } catch (error: any) {
      console.error("Error enrolling:", error);
      if (error.message?.includes("maximum 3 subjects")) {
        toast.error("You can only enroll in maximum 3 subjects per term");
      } else if (error.message?.includes("duplicate")) {
        toast.error("You are already enrolled in this subject for this term");
      } else {
        toast.error(error.message || "Failed to enroll in subject");
      }
    }
  };

  const handleUnenroll = async (enrollmentId: string) => {
    try {
      const { error } = await supabase
        .from("student_subjects")
        .delete()
        .eq("id", enrollmentId);

      if (error) throw error;

      toast.success("Unenrolled from subject");
      fetchData();
    } catch (error: any) {
      console.error("Error unenrolling:", error);
      toast.error(error.message || "Failed to unenroll");
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

  return (
    <div className="space-y-6">
      <Button 
        variant="ghost" 
        onClick={() => navigate("/")}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Home
      </Button>
      
      <Card>
        <CardHeader>
          <CardTitle>My Subjects</CardTitle>
          <CardDescription>
            Enroll in up to 3 subjects per term
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {enrolledSubjects.length > 0 ? (
            <div className="grid gap-4">
              {enrolledSubjects.map((enrollment) => (
                <Card key={enrollment.id} className="relative overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-5 w-5 text-primary" />
                          <h3 className="font-semibold">
                            {enrollment.subjects?.code}
                          </h3>
                          <Badge variant="secondary">{enrollment.term}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          {enrollment.subjects?.name}
                        </p>
                        <Button
                          onClick={() => navigate(`/subject/${enrollment.subject_code}`)}
                          size="sm"
                        >
                          View Subject
                        </Button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleUnenroll(enrollment.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>You haven't enrolled in any subjects yet</p>
            </div>
          )}

          <div className="border-t pt-6">
            <h4 className="font-semibold mb-4">Enroll in a Subject</h4>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.code} value={subject.code}>
                        {subject.code} - {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Term</Label>
                <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2025-T1">2025 Term 1</SelectItem>
                    <SelectItem value="2025-T2">2025 Term 2</SelectItem>
                    <SelectItem value="2025-T3">2025 Term 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleEnroll} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Enroll in Subject
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
