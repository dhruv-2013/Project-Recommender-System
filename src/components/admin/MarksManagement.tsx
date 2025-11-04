import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

type ApplicationWithTeam = {
  admin_note: string | null;
  applicant_id: string;
  applicant_type: string;
  created_at: string | null;
  id: string;
  project_id: string | null;
  status: string | null;
  updated_at: string | null;
  team?: {
    id: string;
    name: string;
    description: string | null;
    members?: Array<{
      user_id: string;
      full_name: string | null;
      email: string | null;
    }>;
  } | null;
};

type TeamWithApplication = {
  id: string;
  name: string;
  description: string | null;
  project_id: string;
  project_title: string;
  application_id: string;
  members?: Array<{
    user_id: string;
    full_name: string | null;
    email: string | null;
  }>;
};

export const MarksManagement = () => {
  const [teams, setTeams] = useState<TeamWithApplication[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [marks, setMarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchApprovedTeams();
  }, []);

  useEffect(() => {
    if (selectedTeam && teams.length > 0) {
      fetchMarkForTeam();
    }
  }, [selectedTeam, teams]);

  const fetchApprovedTeams = async () => {
    try {
      setLoading(true);
      // Fetch all approved team applications with marks info
      const { data: appsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          id,
          project_id,
          applicant_id,
          projects:project_id (title, category)
        `)
        .eq('status', 'approved')
        .eq('applicant_type', 'team')
        .order('created_at', { ascending: false });

      if (appsError) {
        console.error('Error fetching applications:', appsError);
        toast({
          title: "Error",
          description: `Failed to fetch applications: ${appsError.message}`,
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      if (!appsData || appsData.length === 0) {
        console.log('No approved team applications found');
        setTeams([]);
        setLoading(false);
        return;
      }

      console.log('Found approved applications:', appsData.length);

      // Get team IDs
      const teamIds = appsData.map(app => app.applicant_id);

      // Fetch team information
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, description')
        .in('id', teamIds);

      // Fetch team members
      const { data: teamMembersData } = await supabase
        .from('team_members')
        .select('team_id, user_id')
        .in('team_id', teamIds);

      // Get all user IDs
      const userIds = teamMembersData?.map(tm => tm.user_id).filter(Boolean) || [];
      
      // Fetch profiles for team members
      let profilesData = null;
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        profilesData = data;
      }

      // Build teams with application info
      const teamsWithApps: TeamWithApplication[] = appsData.map(app => {
        const team = teamsData?.find(t => t.id === app.applicant_id);
        const members = teamMembersData
          ?.filter(tm => tm.team_id === app.applicant_id)
          .map(tm => {
            const profile = profilesData?.find(p => p.user_id === tm.user_id);
            return {
              user_id: tm.user_id || '',
              full_name: profile?.full_name || null,
              email: profile?.email || null,
            };
          }) || [];

        return {
          id: app.applicant_id,
          name: team?.name || `Team ${app.applicant_id.slice(0, 8)}`,
          description: team?.description || null,
          project_id: app.project_id,
          project_title: (app.projects as any)?.title || 'Unknown Project',
          application_id: app.id,
          members,
        };
      });

      setTeams(teamsWithApps);
      console.log('Teams loaded:', teamsWithApps.length);

      // Fetch all marks for these teams to show status
      if (teamsWithApps.length > 0) {
        const allTeamIds = teamsWithApps.map(t => t.id);
        const allProjectIds = teamsWithApps.map(t => t.project_id);
        
        const { data: allMarks } = await supabase
          .from('marks')
          .select('*')
          .in('team_id', allTeamIds)
          .in('project_id', allProjectIds);
        
        setMarks(allMarks || []);
      }
    } catch (error: any) {
      console.error('Error in fetchApprovedTeams:', error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load teams",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMarkForTeam = async () => {
    const team = teams.find(t => t.id === selectedTeam);
    if (!team) return;

    // Fetch existing mark for this team and project
    const { data: marksData, error: marksError } = await supabase
      .from('marks')
      .select('*')
      .eq('team_id', selectedTeam)
      .eq('project_id', team.project_id);

    if (marksError) {
      toast({
        title: "Error",
        description: "Failed to fetch marks",
        variant: "destructive"
      });
      return;
    }

    setMarks(marksData || []);
  };

  const handleMarkUpdate = async (
    teamId: string,
    teamMark: number,
    individualAdjustment: number,
    feedback: string,
    rubricScores: Record<string, number> | null,
    rubricTotal: number | null,
    rubricWeights: Record<string, number> | null,
  ) => {
    const team = teams.find(t => t.id === teamId);
    if (!team) return;

    const finalMark = teamMark + individualAdjustment;
    
    const existingMark = marks.find(m => m.team_id === teamId && m.project_id === team.project_id);
    
    const markData: any = {
      project_id: team.project_id,
      team_id: teamId,
      team_mark: teamMark,
      individual_adjustment: individualAdjustment,
      final_mark: finalMark,
      feedback: feedback || null,
    };

    if (rubricScores) markData.rubric_scores = rubricScores;
    if (rubricTotal != null) markData.rubric_total = rubricTotal;
    if (rubricWeights) markData.rubric_weights = rubricWeights;

    let error;
    if (existingMark) {
      ({ error } = await supabase
        .from('marks')
        .update(markData)
        .eq('id', existingMark.id));
    } else {
      ({ error } = await supabase
        .from('marks')
        .insert(markData));
    }

    if (error) {
      toast({
        title: "Error",
        description: "Failed to save mark",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Mark saved successfully"
      });
      fetchMarkForTeam();
      // Refresh teams list to update status badges
      fetchApprovedTeams();
      // Clear selection to allow selecting another team
      setSelectedTeam('');
      setMarks([]);
    }
  };

  const handleReleaseGrades = async () => {
    const team = teams.find(t => t.id === selectedTeam);
    if (!team) return;

    const { error } = await supabase
      .from('marks')
      .update({ released: true })
      .eq('team_id', selectedTeam)
      .eq('project_id', team.project_id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to release grades",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Grades released successfully"
      });
      fetchMarkForTeam();
      // Refresh teams list to update status badges
      fetchApprovedTeams();
      // Clear selection to allow selecting another team
      setSelectedTeam('');
      setMarks([]);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading teams...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">Marks Management</h2>
          <p className="text-sm text-muted-foreground mt-1">
            {teams.length} approved team{teams.length !== 1 ? 's' : ''} to mark
          </p>
        </div>
      </div>

      {selectedTeam ? (
        // Show marking form when team is selected
        <div className="space-y-4">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedTeam('');
              setMarks([]);
            }}
            className="mb-4"
          >
            ← Back to Team List
          </Button>
          {(() => {
            const team = teams.find(t => t.id === selectedTeam);
            const existingMark = marks.find(m => m.team_id === selectedTeam);
            if (!team) return null;
            
            const application: ApplicationWithTeam = {
              id: team.application_id,
              applicant_id: team.id,
              applicant_type: 'team',
              project_id: team.project_id,
              status: 'approved',
              admin_note: null,
              created_at: null,
              updated_at: null,
              team: {
                id: team.id,
                name: team.name,
                description: team.description,
                members: team.members,
              },
            };

            return (
              <div className="space-y-4">
                <MarkingCard
                  key={team.id}
                  application={application}
                  existingMark={existingMark}
                  onSave={handleMarkUpdate}
                />
                {existingMark && (
                  <Card>
                    <CardContent className="pt-6">
                      <Button
                        onClick={handleReleaseGrades}
                        className="w-full"
                        variant={existingMark.released ? "outline" : "default"}
                        disabled={existingMark.released}
                      >
                        {existingMark.released ? 'Grades Already Released' : 'Release Grades to Students'}
                      </Button>
                      {existingMark.released && (
                        <p className="text-sm text-green-600 text-center mt-2">
                          ✓ Grades have been released to students
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            );
          })()}
        </div>
      ) : (
        // Show team selection cards
        <div className="space-y-4">
          {teams.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <p className="text-muted-foreground text-lg">No approved team applications found.</p>
              <p className="text-sm text-muted-foreground mt-2">
                Teams will appear here once they have approved applications.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map((team) => {
                const teamMark = marks.find(m => m.team_id === team.id && m.project_id === team.project_id);
                const isMarked = !!teamMark;
                const isReleased = teamMark?.released || false;

                return (
                  <Card
                    key={team.id}
                    className={`cursor-pointer hover:shadow-lg transition-shadow ${
                      selectedTeam === team.id ? 'ring-2 ring-primary' : ''
                    } ${isReleased ? 'border-green-200 bg-green-50/50' : ''}`}
                    onClick={() => {
                      setSelectedTeam(team.id);
                    }}
                  >
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        {isReleased && (
                          <Badge className="bg-green-100 text-green-800">Released</Badge>
                        )}
                        {isMarked && !isReleased && (
                          <Badge variant="secondary">Marked</Badge>
                        )}
                      </div>
                      <p className="text-sm font-medium text-primary mt-1">
                        {team.project_title}
                      </p>
                      {team.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                          {team.description}
                        </p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Team Members</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {team.members && team.members.length > 0 ? (
                              team.members.slice(0, 3).map((member) => (
                                <span
                                  key={member.user_id}
                                  className="text-xs bg-muted px-2 py-0.5 rounded"
                                >
                                  {member.full_name || `User ${member.user_id.slice(0, 6)}`}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-muted-foreground">No members</span>
                            )}
                            {team.members && team.members.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{team.members.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                        {isMarked && (
                          <div className="pt-2 border-t">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Final Mark</span>
                              <span className="text-lg font-bold">
                                {teamMark.final_mark?.toFixed(1) || teamMark.team_mark?.toFixed(1) || 'N/A'}
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="pt-2">
                          <Button
                            className="w-full"
                            variant={isMarked ? "outline" : "default"}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTeam(team.id);
                            }}
                          >
                            {isMarked ? 'Edit Mark' : 'Mark Team'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MarkingCard = ({ application, existingMark, onSave }: any) => {
  // Parse rubric weights from JSONB if needed
  const parseRubricWeights = (): Record<string, number> => {
    if (!existingMark?.rubric_weights) {
      return {
        Requirements: 15,
        Design: 15,
        Implementation: 25,
        Testing: 10,
        Documentation: 15,
        Presentation: 10,
        Teamwork: 10,
      };
    }
    if (typeof existingMark.rubric_weights === 'object') {
      return existingMark.rubric_weights as Record<string, number>;
    }
    try {
      return typeof existingMark.rubric_weights === 'string' 
        ? JSON.parse(existingMark.rubric_weights)
        : existingMark.rubric_weights;
    } catch {
      return {
        Requirements: 15,
        Design: 15,
        Implementation: 25,
        Testing: 10,
        Documentation: 15,
        Presentation: 10,
        Teamwork: 10,
      };
    }
  };

  // Parse rubric scores from JSONB if needed
  const parseRubricScores = (weights: Record<string, number>): Record<string, number> => {
    if (!existingMark?.rubric_scores) {
      return Object.keys(weights).reduce((acc: any, k) => { acc[k] = 0; return acc; }, {});
    }
    if (typeof existingMark.rubric_scores === 'object') {
      return existingMark.rubric_scores as Record<string, number>;
    }
    try {
      return typeof existingMark.rubric_scores === 'string'
        ? JSON.parse(existingMark.rubric_scores)
        : existingMark.rubric_scores;
    } catch {
      return Object.keys(weights).reduce((acc: any, k) => { acc[k] = 0; return acc; }, {});
    }
  };

  const defaultWeights = parseRubricWeights();
  const [rubricWeights, setRubricWeights] = useState<Record<string, number>>(defaultWeights);
  const initialScores = parseRubricScores(defaultWeights);
  const [rubricScores, setRubricScores] = useState<Record<string, number>>(initialScores);

  const computeTeamMarkFromRubric = () => {
    let total = 0;
    for (const k of Object.keys(rubricWeights)) {
      const weight = rubricWeights[k] ?? 0;
      const score = rubricScores[k] ?? 0;
      total += (weight / 100) * score;
    }
    return Math.round(total * 10) / 10;
  };

  const [teamMark, setTeamMark] = useState(
    existingMark?.team_mark != null ? existingMark.team_mark : computeTeamMarkFromRubric()
  );
  const [individualAdjustment, setIndividualAdjustment] = useState(existingMark?.individual_adjustment || 0);
  const [feedback, setFeedback] = useState(existingMark?.feedback || '');

  const finalMark = teamMark + individualAdjustment;

  useEffect(() => {
    // Recompute team mark when rubric changes
    const computed = computeTeamMarkFromRubric();
    setTeamMark(computed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rubricScores, rubricWeights]);

  const handleSave = () => {
    const total = computeTeamMarkFromRubric();
    onSave(
      application.applicant_id, // This is team_id for team applications
      total,
      individualAdjustment,
      feedback,
      rubricScores,
      total,
      rubricWeights,
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {application.team?.name || `Team ${application.applicant_id.slice(0, 8)}`}
        </CardTitle>
        {application.team?.description && (
          <p className="text-sm text-muted-foreground mb-2">
            {application.team.description}
          </p>
        )}
        {application.team?.members && application.team.members.length > 0 && (
          <div className="mt-2">
            <p className="text-xs font-medium text-muted-foreground mb-1">Team Members:</p>
            <div className="flex flex-wrap gap-2">
              {application.team.members.map((member) => (
                <span key={member.user_id} className="text-xs bg-muted px-2 py-1 rounded">
                  {member.full_name || `User ${member.user_id.slice(0, 8)}`}
                  {member.email && <span className="text-muted-foreground"> ({member.email})</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <Label>Team Mark (from rubric)</Label>
            <div className="p-2 bg-muted rounded font-medium">
              {teamMark.toFixed(1)}
            </div>
          </div>
          
          <div>
            <Label htmlFor="team-adjustment">Team Adjustment</Label>
            <Input
              id="team-adjustment"
              type="number"
              min="-50"
              max="50"
              step="0.5"
              value={individualAdjustment}
              onChange={(e) => setIndividualAdjustment(parseFloat(e.target.value) || 0)}
              placeholder="0.0"
            />
            <p className="text-xs text-muted-foreground mt-1">Adjustment to team mark (±)</p>
          </div>
          
          <div>
            <Label>Final Mark</Label>
            <div className="p-2 bg-muted rounded font-medium">
              {finalMark.toFixed(1)}
            </div>
          </div>
        </div>

        {/* UNSW-style rubric */}
        <div className="mb-4">
          <Label className="mb-2 block">Rubric</Label>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="p-2">Criterion</th>
                  <th className="p-2">Weight %</th>
                  <th className="p-2">Grade</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(rubricWeights).map((criterion) => (
                  <tr key={criterion} className="border-t">
                    <td className="p-2 font-medium">{criterion}</td>
                    <td className="p-2">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={rubricWeights[criterion]}
                        onChange={(e) => setRubricWeights({ ...rubricWeights, [criterion]: Number(e.target.value) || 0 })}
                      />
                    </td>
                    <td className="p-2">
                      <Select
                        value={String(rubricScores[criterion])}
                        onValueChange={(v) => setRubricScores({ ...rubricScores, [criterion]: Number(v) })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select grade" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="85">HD (85)</SelectItem>
                          <SelectItem value="75">DN (75)</SelectItem>
                          <SelectItem value="65">CR (65)</SelectItem>
                          <SelectItem value="50">PS (50)</SelectItem>
                          <SelectItem value="0">FL (0)</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xs text-muted-foreground mt-2">Team mark is computed as weighted sum of grades.</div>
        </div>

        <div className="mb-4">
          <Label htmlFor="feedback">Feedback</Label>
          <Textarea
            id="feedback"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Optional feedback for the student..."
            rows={3}
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {existingMark?.released ? (
              <span className="text-green-600">Grade Released</span>
            ) : (
              <span>Grade Not Released</span>
            )}
          </div>
          <Button onClick={handleSave}>
            Save Mark
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};