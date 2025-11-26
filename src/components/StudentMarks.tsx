import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Info, Download, FileText } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';
import { toast } from 'sonner';

interface Submission {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  created_at: string;
}

interface Mark {
  id: string;
  project_id: string;
  team_id: string;
  team_mark: number | null;
  individual_adjustment: number | null;
  final_mark: number | null;
  feedback: string | null;
  rubric_scores: Json | null;
  rubric_total: number | null;
  rubric_weights: Json | null;
  released: boolean | null;
  created_at: string | null;
  updated_at: string | null;
  projects?: {
    title: string;
    category: string;
  } | null;
  teams?: {
    name: string;
  } | null;
}

export const StudentMarks = () => {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [loading, setLoading] = useState(true);
  const [submissionsMap, setSubmissionsMap] = useState<Record<string, Submission[]>>({});

  useEffect(() => {
    fetchReleasedMarks();
  }, []);

  const fetchReleasedMarks = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get teams the user is a member of
      const { data: teamMemberships } = await supabase
        .from('team_members')
        .select('team_id')
        .eq('user_id', user.id);

      if (!teamMemberships || teamMemberships.length === 0) {
        setMarks([]);
        setLoading(false);
        return;
      }

      const teamIds = teamMemberships.map(tm => tm.team_id);

      // Fetch released marks for those teams
      const { data: marksData, error } = await supabase
        .from('marks')
        .select(`
          *,
          projects:project_id (title, category),
          teams:team_id (name)
        `)
        .in('team_id', teamIds)
        .eq('released', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching marks:', error);
        return;
      }

      const marksList = (marksData || []) as Mark[];
      setMarks(marksList);

      // Fetch submissions for all team-project combinations
      if (marksList && marksList.length > 0) {
        await fetchSubmissionsForMarks(marksList);
      }
    } catch (error) {
      console.error('Error in fetchReleasedMarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissionsForMarks = async (marksData: Mark[]) => {
    try {
      const submissionsMap: Record<string, Submission[]> = {};

      // Fetch submissions for each unique team-project combination
      for (const mark of marksData) {
        if (!mark.team_id || !mark.project_id) continue;

        const key = `${mark.team_id}-${mark.project_id}`;
        if (submissionsMap[key]) continue; // Already fetched

        const { data: submissions, error } = await supabase
          .from('submissions')
          .select('id, file_path, file_name, file_size, created_at')
          .eq('team_id', mark.team_id)
          .eq('project_id', mark.project_id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching submissions:', error);
          continue;
        }

        if (submissions && submissions.length > 0) {
          submissionsMap[key] = submissions as Submission[];
        }
      }

      setSubmissionsMap(submissionsMap);
    } catch (error) {
      console.error('Error fetching submissions:', error);
    }
  };

  const handleDownloadSubmission = async (submission: Submission) => {
    try {
      const { data, error } = await supabase.storage
        .from('submissions')
        .createSignedUrl(submission.file_path, 3600); // 1 hour expiry

      if (error) throw error;

      if (data?.signedUrl) {
        const link = document.createElement('a');
        link.href = data.signedUrl;
        link.download = submission.file_name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (error: any) {
      console.error('Error downloading submission:', error);
      toast.error('Failed to download submission file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  // New rubric format criteria
  const NEW_RUBRIC_CRITERIA = ['Technical Knowledge', 'Presentation', 'Teamwork & Professionalism'];

  const parseRubricData = (scores: any, weights: any): Record<string, { score: number; weight: number }> => {
    if (!scores || !weights) return {};

    const parsedScores = typeof scores === 'string' ? JSON.parse(scores) : scores;
    const parsedWeights = typeof weights === 'string' ? JSON.parse(weights) : weights;

    const result: Record<string, { score: number; weight: number }> = {};
    
    // Only include criteria from the new rubric format
    for (const key in parsedScores) {
      if (NEW_RUBRIC_CRITERIA.includes(key)) {
        result[key] = {
          score: parsedScores[key] || 0,
          weight: parsedWeights[key] || 0,
        };
      }
    }
    return result;
  };

  const getGradeLabel = (mark: number): string => {
    if (mark >= 85) return 'HD';
    if (mark >= 75) return 'DN';
    if (mark >= 65) return 'CR';
    if (mark >= 50) return 'PS';
    return 'FL';
  };

  const getGradeColor = (mark: number): string => {
    if (mark >= 85) return 'bg-emerald-500/25 text-emerald-200 border border-emerald-400/40';
    if (mark >= 75) return 'bg-sky-500/25 text-sky-200 border border-sky-400/40';
    if (mark >= 65) return 'bg-amber-500/25 text-amber-200 border border-amber-400/40';
    if (mark >= 50) return 'bg-orange-500/20 text-orange-200 border border-orange-400/40';
    return 'bg-rose-500/20 text-rose-200 border border-rose-400/40';
  };

  if (loading) {
    return <div className="py-8 text-center text-white/60">Loading marks...</div>;
  }

  if (marks.length === 0) {
    return (
      <Alert className="border border-white/10 bg-black/60 text-white/70">
        <Info className="h-4 w-4 text-sky-400" />
        <AlertDescription className="text-white/70">
          No released marks available. Marks will appear here once your grades have been released by the admin.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <h2 className="text-2xl font-bold text-white">My Marks</h2>
      {marks.map((mark) => {
        const rubricData = parseRubricData(mark.rubric_scores, mark.rubric_weights);
        const finalMark = mark.final_mark || mark.team_mark || 0;
        const submissionKey = mark.team_id && mark.project_id ? `${mark.team_id}-${mark.project_id}` : null;
        const submissions = submissionKey ? submissionsMap[submissionKey] || [] : [];

        return (
          <Card
            key={mark.id}
            className="rounded-3xl border border-white/10 bg-black/70 text-white/80 shadow-[0_25px_65px_-40px_rgba(56,189,248,0.45)]"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl text-white">
                    {mark.projects?.title || 'Unknown Project'}
                  </CardTitle>
                  <p className="mt-1 text-sm text-white/55">
                    Team: {mark.teams?.name || 'Unknown Team'}
                    {mark.projects?.category && ` • ${mark.projects.category}`}
                  </p>
                </div>
                <Badge className={getGradeColor(finalMark)}>
                  {getGradeLabel(finalMark)} ({finalMark.toFixed(1)})
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <p className="text-sm font-medium text-white/55">Team Mark</p>
                  <p className="text-2xl font-bold text-white">{mark.team_mark?.toFixed(1) || 'N/A'}</p>
                </div>
                {mark.individual_adjustment !== null && mark.individual_adjustment !== 0 && (
                  <div>
                    <p className="text-sm font-medium text-white/55">Adjustment</p>
                    <p className={`text-xl font-semibold ${mark.individual_adjustment >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>
                      {mark.individual_adjustment >= 0 ? '+' : ''}{mark.individual_adjustment.toFixed(1)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-white/55">Final Mark</p>
                  <p className="text-2xl font-bold text-white">{finalMark.toFixed(1)}</p>
                </div>
              </div>

              {Object.keys(rubricData).length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-white/60">Rubric Breakdown</p>
                  <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/60">
                    <table className="w-full text-sm text-white/75">
                      <thead className="bg-white/5 text-white/70">
                        <tr>
                          <th className="p-3 text-left">Criterion</th>
                          <th className="p-3 text-right">Weight</th>
                          <th className="p-3 text-right">Score</th>
                          <th className="p-3 text-right">Contribution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(rubricData).map(([criterion, data]) => {
                          const contribution = (data.weight / 100) * data.score;
                          return (
                            <tr key={criterion} className="border-t border-white/10">
                              <td className="p-3 font-medium text-white">{criterion}</td>
                              <td className="p-3 text-right">{data.weight}%</td>
                              <td className="p-3 text-right">{data.score}</td>
                              <td className="p-3 text-right">{contribution.toFixed(1)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {mark.feedback && (
                <div>
                  <p className="mb-2 text-sm font-medium text-white/60">Feedback</p>
                  <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
                    <p className="whitespace-pre-wrap text-sm text-white/70">{mark.feedback}</p>
                  </div>
                </div>
              )}

              {submissions.length > 0 && (
                <div>
                  <p className="mb-2 text-sm font-medium text-white/60">Submitted Files</p>
                  <div className="space-y-2">
                    {submissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-black/50 p-3"
                      >
                        <div className="flex items-center gap-2 flex-1">
                          <FileText className="h-4 w-4 text-sky-400" />
                          <div>
                            <p className="text-sm font-medium text-white">{submission.file_name}</p>
                            <p className="text-xs text-white/50">
                              {formatFileSize(submission.file_size)} • {new Date(submission.created_at).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadSubmission(submission)}
                          className="gap-2 rounded-full border border-sky-400/60 bg-sky-500/20 px-4 text-sky-100 transition hover:bg-sky-500/50 hover:text-white focus-visible:ring-sky-300"
                        >
                          <Download className="mr-2 h-3 w-3" />
                          Download
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

