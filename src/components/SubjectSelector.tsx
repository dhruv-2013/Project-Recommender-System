import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BookOpen, ArrowLeft } from "lucide-react";
import Header from "@/components/Header";

interface SubjectSelectorProps {
  userId: string;
  onSignOut: () => void;
  user?: any;
  profile?: any;
}

export function SubjectSelector({ userId, onSignOut, user, profile }: SubjectSelectorProps) {
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

  const handleSubjectSelect = (subjectCode: string) => {
    navigate(`/subject/${subjectCode}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Filter subjects by term
  const t1Subjects = subjects.filter(s => s.term === "2025-T1");
  const t2Subjects = subjects.filter(s => s.term === "2025-T2");
  const t3Subjects = subjects.filter(s => s.term === "2025-T3");

  return (
    <div className="min-h-screen">
      <Header user={user} profile={profile} onSignOut={onSignOut} />
      
      {/* Back Button - Top Right */}
      <div className="fixed top-20 right-6 z-40">
        <Button
          onClick={onSignOut}
          size="lg"
          className="bg-white text-primary hover:bg-white/90 flex items-center gap-2 px-6 py-3 font-semibold shadow-lg"
        >
          <ArrowLeft className="h-5 w-5" />
          Back to Welcome
        </Button>
      </div>
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-4">Select Your Subject</h1>
            <p className="text-white/80 text-xl">Choose a subject to view available projects</p>
          </div>

          <div className="max-w-7xl mx-auto space-y-12">
            {/* Term 1 Subjects */}
            {t1Subjects.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Term 1 (2025-T1)</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {t1Subjects.map((subject) => (
                    <Card 
                      key={subject.code} 
                      className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg"
                      onClick={() => handleSubjectSelect(subject.code)}
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
            )}

            {/* Term 2 Subjects */}
            {t2Subjects.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Term 2 (2025-T2)</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {t2Subjects.map((subject) => (
                    <Card 
                      key={subject.code} 
                      className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg"
                      onClick={() => handleSubjectSelect(subject.code)}
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
            )}

            {/* Term 3 Subjects */}
            {t3Subjects.length > 0 && (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">Term 3 (2025-T3)</h2>
                <div className="grid md:grid-cols-3 gap-6">
                  {t3Subjects.map((subject) => (
                    <Card 
                      key={subject.code} 
                      className="cursor-pointer hover:border-primary/50 transition-all hover:shadow-lg"
                      onClick={() => handleSubjectSelect(subject.code)}
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
            )}
          </div>
        </div>
      </main>
    </div>
  );
}