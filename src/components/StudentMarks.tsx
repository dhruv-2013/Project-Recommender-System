import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info } from 'lucide-react';
import { Json } from '@/integrations/supabase/types';

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

      setMarks((marksData || []) as Mark[]);
    } catch (error) {
      console.error('Error in fetchReleasedMarks:', error);
    } finally {
      setLoading(false);
    }
  };

  const parseRubricData = (scores: any, weights: any): Record<string, { score: number; weight: number }> => {
    if (!scores || !weights) return {};

    const parsedScores = typeof scores === 'string' ? JSON.parse(scores) : scores;
    const parsedWeights = typeof weights === 'string' ? JSON.parse(weights) : weights;

    const result: Record<string, { score: number; weight: number }> = {};
    for (const key in parsedScores) {
      result[key] = {
        score: parsedScores[key] || 0,
        weight: parsedWeights[key] || 0,
      };
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
    if (mark >= 85) return 'bg-green-100 text-green-800';
    if (mark >= 75) return 'bg-blue-100 text-blue-800';
    if (mark >= 65) return 'bg-yellow-100 text-yellow-800';
    if (mark >= 50) return 'bg-orange-100 text-orange-800';
    return 'bg-red-100 text-red-800';
  };

  if (loading) {
    return <div className="text-center py-8">Loading marks...</div>;
  }

  if (marks.length === 0) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          No released marks available. Marks will appear here once your grades have been released by the admin.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">My Marks</h2>
      {marks.map((mark) => {
        const rubricData = parseRubricData(mark.rubric_scores, mark.rubric_weights);
        const finalMark = mark.final_mark || mark.team_mark || 0;

        return (
          <Card key={mark.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-xl">
                    {mark.projects?.title || 'Unknown Project'}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Team Mark</p>
                  <p className="text-2xl font-bold">{mark.team_mark?.toFixed(1) || 'N/A'}</p>
                </div>
                {mark.individual_adjustment !== null && mark.individual_adjustment !== 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Adjustment</p>
                    <p className={`text-xl font-semibold ${mark.individual_adjustment >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {mark.individual_adjustment >= 0 ? '+' : ''}{mark.individual_adjustment.toFixed(1)}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Final Mark</p>
                  <p className="text-2xl font-bold">{finalMark.toFixed(1)}</p>
                </div>
              </div>

              {Object.keys(rubricData).length > 0 && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Rubric Breakdown</p>
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-muted">
                        <tr>
                          <th className="p-2 text-left">Criterion</th>
                          <th className="p-2 text-right">Weight</th>
                          <th className="p-2 text-right">Score</th>
                          <th className="p-2 text-right">Contribution</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(rubricData).map(([criterion, data]) => {
                          const contribution = (data.weight / 100) * data.score;
                          return (
                            <tr key={criterion} className="border-t">
                              <td className="p-2 font-medium">{criterion}</td>
                              <td className="p-2 text-right">{data.weight}%</td>
                              <td className="p-2 text-right">{data.score}</td>
                              <td className="p-2 text-right">{contribution.toFixed(1)}</td>
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
                  <p className="text-sm font-medium text-muted-foreground mb-2">Feedback</p>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="whitespace-pre-wrap">{mark.feedback}</p>
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

