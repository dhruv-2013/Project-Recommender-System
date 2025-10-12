import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BookOpen, ArrowLeft } from "lucide-react";

interface SubjectSelectorProps {
  userId: string;
  onSignOut: () => void;
}

export function SubjectSelector({ userId, onSignOut }: SubjectSelectorProps) {
  const navigate = useNavigate();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubjects();
  }, [userId]);

  const fetchSubjects = async () => {
    try {
      const { data: subjectsData } = await supabase
        .from("subjects")
        .select("*")
        .order("code");

      setSubjects(subjectsData || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load subjects");
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectSelect = async (subjectCode: string, term: string) => {
    try {
      // Enroll user in the selected subject
      const { error } = await supabase
        .from("student_subjects")
        .insert({
          user_id: userId,
          subject_code: subjectCode,
          term: term
        });

      if (error) {
        if (error.message?.includes("duplicate")) {
          // Already enrolled, just navigate
          navigate(`/subject/${subjectCode}`);
          return;
        }
        throw error;
      }

      toast.success("Enrolled in subject successfully!");
      navigate(`/subject/${subjectCode}`);
    } catch (error: any) {
      console.error("Error enrolling:", error);
      if (error.message?.includes("maximum 3 subjects")) {
        toast.error("You can only enroll in maximum 3 subjects per term");
      } else {
        toast.error(error.message || "Failed to enroll in subject");
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter subjects by term
  const t2Subjects = subjects.filter(s => s.term === "2025-T2");
  const t3Subjects = subjects.filter(s => s.term === "2025-T3");

  return (
    <div className="min-h-screen p-6 flex flex-col">
      <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-8">
          <Button
            onClick={onSignOut}
            className="bg-white text-primary hover:bg-white/90 flex items-center gap-2 px-6 py-2"
          >
            <ArrowLeft className="h-5 w-5" />
            Back to Welcome
          </Button>
        </div>

        {/* Page Title */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-4">Select Your Subject</h1>
          <p className="text-white/80 text-xl">Choose a subject to view available projects</p>
        </div>

        <div className="space-y-12">
          {/* Term 2 Subjects */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Term 2 (2025-T2)</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {t2Subjects.map((subject) => (
                <Card 
                  key={subject.code} 
                  className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg"
                  onClick={() => handleSubjectSelect(subject.code, "2025-T2")}
                >
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <CardTitle>{subject.code}</CardTitle>
                    </div>
                    <CardDescription className="text-base font-semibold text-foreground">
                      {subject.name}
                    </CardDescription>
                  </CardHeader>
                  {subject.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{subject.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>

          {/* Term 3 Subjects */}
          <div>
            <h2 className="text-2xl font-bold text-white mb-6">Term 3 (2025-T3)</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {t3Subjects.map((subject) => (
                <Card 
                  key={subject.code} 
                  className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg"
                  onClick={() => handleSubjectSelect(subject.code, "2025-T3")}
                >
                  <CardHeader>
                    <div className="flex items-center gap-2 mb-2">
                      <BookOpen className="h-5 w-5 text-primary" />
                      <CardTitle>{subject.code}</CardTitle>
                    </div>
                    <CardDescription className="text-base font-semibold text-foreground">
                      {subject.name}
                    </CardDescription>
                  </CardHeader>
                  {subject.description && (
                    <CardContent>
                      <p className="text-sm text-muted-foreground">{subject.description}</p>
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
