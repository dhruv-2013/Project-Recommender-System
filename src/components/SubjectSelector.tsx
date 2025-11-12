import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BookOpen, ArrowRight } from "lucide-react";
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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading curated subjects…</p>
        </div>
      </div>
    );
  }

  const t1Subjects = subjects.filter((s) => s.term === "2025-T1");
  const t2Subjects = subjects.filter((s) => s.term === "2025-T2");
  const t3Subjects = subjects.filter((s) => s.term === "2025-T3");

  const termSections = [
    { label: "Term 1", code: "2025-T1", description: "Kickstart the academic year with foundational builds.", subjects: t1Subjects },
    { label: "Term 2", code: "2025-T2", description: "Double down on real-world collaboration.", subjects: t2Subjects },
    { label: "Term 3", code: "2025-T3", description: "Deliver capstone-ready innovation.", subjects: t3Subjects },
  ].filter((section) => section.subjects.length > 0);

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} profile={profile} onSignOut={onSignOut} />

      <main className="container mx-auto px-4 py-10">
        <section className="rounded-xl border bg-card/70 p-6 shadow-sm">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <Badge variant="outline" className="w-fit border-primary/30 text-primary">
                Subjects
              </Badge>
              <h1 className="text-3xl font-semibold text-foreground">Select your subject</h1>
              <p className="text-sm text-muted-foreground max-w-xl">
                Choose a subject to explore available projects, form teams, and stay up to date with announcements.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-12 space-y-10">
          {termSections.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No subjects are published yet. Check back soon for new offerings.
              </CardContent>
            </Card>
          ) : (
            termSections.map((section) => (
              <div key={section.code} className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-foreground">{section.label}</h2>
                    {section.description && (
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    )}
                  </div>
                  <Badge variant="outline" className="border-muted-foreground/20 text-muted-foreground">
                    {section.code}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {section.subjects.map((subject) => (
                    <Card
                      key={subject.code}
                      className="cursor-pointer transition hover:shadow-md"
                      onClick={() => handleSubjectSelect(subject.code)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          <CardTitle className="text-base font-semibold">{subject.code}</CardTitle>
                        </div>
                        <CardDescription className="text-sm text-muted-foreground">
                          {subject.name}
                        </CardDescription>
                      </CardHeader>
                      {subject.description && (
                        <CardContent>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {subject.description}
                          </p>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            ))
          )}
        </section>
      </main>
    </div>
  );
}