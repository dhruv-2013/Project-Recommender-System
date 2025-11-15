import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
    { label: "Term 1", code: "2025-T1", subjects: t1Subjects },
    { label: "Term 2", code: "2025-T2", subjects: t2Subjects },
    { label: "Term 3", code: "2025-T3", subjects: t3Subjects },
  ].filter((section) => section.subjects.length > 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#050709] via-[#080c14] to-[#0b1220] text-white">
      <Header user={user} profile={profile} onSignOut={onSignOut} />

      <main className="mx-auto max-w-6xl px-4 pt-24 pb-20">
        <section className="space-y-6 text-center">
          <Badge variant="outline" className="mx-auto w-fit border-white/20 bg-white/10 text-white/80">
            Choose Your Stream
          </Badge>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold md:text-5xl">Select Your Subject</h1>
            <p className="mx-auto max-w-3xl text-base text-white/60 md:text-lg">
              Pick the subject that aligns with your pathway. Each one unlocks a curated set of
              projects, announcements, and teaming tools tailored to that cohort.
            </p>
          </div>
        </section>

        <section className="mt-16">
          {termSections.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-12 text-center backdrop-blur-md">
              <h2 className="text-2xl font-semibold text-white">No subjects published yet</h2>
              <p className="mt-3 text-sm text-white/60">
                Check back soon—new opportunities are released regularly.
              </p>
            </div>
          ) : (
            <div className="space-y-14">
              {termSections.map((section) => (
                <div key={section.code} className="space-y-6">
                  <div className="flex flex-col gap-3 text-center md:flex-row md:items-center md:justify-between md:text-left">
                    <div>
                      <h2 className="text-3xl font-semibold">{section.label}</h2>
                    </div>
                    <Badge variant="outline" className="mx-auto w-fit border-white/15 bg-white/10 text-white/70 md:mx-0">
                      {section.code}
                    </Badge>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    {section.subjects.map((subject) => (
                      <button
                        key={subject.code}
                        onClick={() => handleSubjectSelect(subject.code)}
                        className="group relative w-full rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:border-primary/60 hover:shadow-[0_25px_50px_-12px_rgba(56,189,248,0.35)]"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-primary">
                              <BookOpen className="h-6 w-6" />
                            </div>
                            <div>
                              <p className="text-sm uppercase tracking-wide text-white/50">{subject.code}</p>
                              <h3 className="text-lg font-semibold text-white">{subject.name}</h3>
                            </div>
                          </div>
                          <ArrowRight className="mt-2 h-5 w-5 text-white/50 transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                        </div>
                        {subject.description && (
                          <p className="mt-4 text-sm leading-relaxed text-white/70">
                            {subject.description}
                          </p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}