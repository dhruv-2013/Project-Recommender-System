import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
          title: 'Error',
          description: `Failed to fetch applications: ${appsError.message}`,
          variant: 'destructive',
        });
        setLoading(false);
        return;
      }

      if (!appsData || appsData.length === 0) {
        setTeams([]);
        setLoading(false);
        return;
      }

      const teamIds = appsData.map((app) => app.applicant_id);
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name, description')
        .in('id', teamIds);

      const { data: teamMembersData } = await supabase
        .from('team_members')
        .select('team_id, user_id')
        .in('team_id', teamIds);

      const userIds = teamMembersData?.map((tm) => tm.user_id).filter(Boolean) || [];

      let profilesData = null;
      if (userIds.length > 0) {
        const { data } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        profilesData = data;
      }

      const teamsWithApps: TeamWithApplication[] = appsData.map((app) => {
        const team = teamsData?.find((t) => t.id === app.applicant_id);
        const members = teamMembersData
          ?.filter((tm) => tm.team_id === app.applicant_id)
          .map((tm) => {
            const profile = profilesData?.find((p) => p.user_id === tm.user_id);
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

      if (teamsWithApps.length > 0) {
        const allTeamIds = teamsWithApps.map((t) => t.id);
        const allProjectIds = teamsWithApps.map((t) => t.project_id);

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
        title: 'Error',
        description: error?.message || 'Failed to load teams',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchMarkForTeam = async () => {
    const team = teams.find((t) => t.id === selectedTeam);
    if (!team) return;

    const { data: marksData, error: marksError } = await supabase
      .from('marks')
      .select('*')
      .eq('team_id', selectedTeam)
      .eq('project_id', team.project_id);

    if (marksError) {
      toast({
        title: 'Error',
        description: 'Failed to fetch marks',
        variant: 'destructive',
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
    const team = teams.find((t) => t.id === teamId);
    if (!team) return;

    const finalMark = teamMark + individualAdjustment;

    const existingMark = marks.find((m) => m.team_id === teamId && m.project_id === team.project_id);

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
      ({ error } = await supabase.from('marks').update(markData).eq('id', existingMark.id));
    } else {
      ({ error } = await supabase.from('marks').insert(markData));
    }

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to save mark',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Mark saved successfully',
      });
      fetchMarkForTeam();
      fetchApprovedTeams();
      setSelectedTeam('');
      setMarks([]);
    }
  };

  const handleReleaseGrades = async () => {
    const team = teams.find((t) => t.id === selectedTeam);
    if (!team) return;

    const { error } = await supabase
      .from('marks')
      .update({ released: true })
      .eq('team_id', selectedTeam)
      .eq('project_id', team.project_id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to release grades',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Grades released successfully',
      });
      fetchMarkForTeam();
      fetchApprovedTeams();
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
            const team = teams.find((t) => t.id === selectedTeam);
            const existingMark = marks.find((m) => m.team_id === selectedTeam);
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
                        variant={existingMark.released ? 'outline' : 'default'}
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
                const teamMark = marks.find((m) => m.team_id === team.id && m.project_id === team.project_id);
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
                        {isReleased && <Badge className="bg-green-100 text-green-800">Released</Badge>}
                        {isMarked && !isReleased && <Badge variant="secondary">Marked</Badge>}
                      </div>
                      <p className="text-sm font-medium text-primary mt-1">{team.project_title}</p>
                      {team.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{team.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-medium text-muted-foreground">Team Members</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {team.members && team.members.length > 0 ? (
                              team.members.slice(0, 3).map((member) => (
                                <span key={member.user_id} className="text-xs bg-muted px-2 py-0.5 rounded">
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
                            variant={isMarked ? 'outline' : 'default'}
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

const GRADE_SCALE = {
  HD: { label: 'High Distinction (HD)', value: 90, description: 'Outstanding execution that exceeds expectations with innovation and polish.' },
  DN: { label: 'Distinction (DN)', value: 80, description: 'Strong delivery that meets all expectations with minor gaps.' },
  CR: { label: 'Credit (CR)', value: 70, description: 'Competent work that satisfies key requirements with notable improvements needed.' },
  PS: { label: 'Pass (PS)', value: 60, description: 'Fundamental understanding demonstrated; limited depth or refinement.' },
  FL: { label: 'Fail (FL)', value: 40, description: 'Key requirements not met or submission incomplete.' },
} as const;

type GradeKey = keyof typeof GRADE_SCALE;

const SECTION_CONFIG = [
  {
    key: 'Technical Knowledge',
    weight: 40,
    description: 'Depth of engineering approach, architecture, testing, and technical execution.'
  },
  {
    key: 'Presentation',
    weight: 30,
    description: 'Narrative clarity, visual communication, and ability to convey impact.'
  },
  {
    key: 'Teamwork & Professionalism',
    weight: 30,
    description: 'Collaboration, reliability, and stakeholder-ready delivery.'
  }
] as const;

const scoreToGrade = (score?: number): GradeKey => {
  if (score == null) return 'CR';
  const entries = Object.entries(GRADE_SCALE) as Array<[GradeKey, { value: number }]>;
  return entries.reduce((best, [grade, meta]) => {
    const bestDiff = Math.abs(score - GRADE_SCALE[best].value);
    const candidateDiff = Math.abs(score - meta.value);
    return candidateDiff < bestDiff ? grade : best;
  }, 'FL' as GradeKey);
};

const parseFeedbackSections = (feedback: string | null | undefined) => {
  if (!feedback) {
    return {
      comments: SECTION_CONFIG.reduce<Record<string, string>>((acc, section) => {
        acc[section.key] = '';
        return acc;
      }, {}),
      overall: '',
    };
  }

  const blocks = feedback.split(/\n\s*\n/);
  const comments: Record<string, string> = SECTION_CONFIG.reduce<Record<string, string>>((acc, section) => {
    acc[section.key] = '';
    return acc;
  }, {});
  const remainder: string[] = [];

  for (const block of blocks) {
    const match = block.match(/^([^:\n]+):\n([\s\S]*)$/);
    if (match) {
      const [, heading, body] = match;
      if (heading in comments) {
        comments[heading] = body.trim();
        continue;
      }
    }
    if (block.trim().length > 0) {
      remainder.push(block.trim());
    }
  }

  return {
    comments,
    overall: remainder.join('\n\n'),
  };
};

const MarkingCard = ({ application, existingMark, onSave }: any) => {
  const parseStoredScores = () => {
    const stored = existingMark?.rubric_scores;
    if (!stored) return {} as Record<string, number>;
    if (typeof stored === 'object') return stored as Record<string, number>;
    try {
      return JSON.parse(stored as string) as Record<string, number>;
    } catch {
      return {} as Record<string, number>;
    }
  };

  const storedScores = parseStoredScores();
  const { comments: parsedComments, overall: parsedOverall } = parseFeedbackSections(existingMark?.feedback);

  const [sectionGrades, setSectionGrades] = useState<Record<string, GradeKey>>(() => {
    return SECTION_CONFIG.reduce<Record<string, GradeKey>>((acc, section) => {
      acc[section.key] = scoreToGrade(storedScores[section.key]);
      return acc;
    }, {} as Record<string, GradeKey>);
  });

  const [sectionComments, setSectionComments] = useState<Record<string, string>>(parsedComments);
  const [individualAdjustment, setIndividualAdjustment] = useState(existingMark?.individual_adjustment || 0);
  const [overallFeedback, setOverallFeedback] = useState(parsedOverall);

  const weightsRecord = SECTION_CONFIG.reduce<Record<string, number>>((acc, section) => {
    acc[section.key] = section.weight;
    return acc;
  }, {} as Record<string, number>);

  const computeTeamMarkFromRubric = () => {
    return SECTION_CONFIG.reduce((total, section) => {
      const grade = sectionGrades[section.key] ?? 'CR';
      const gradeValue = GRADE_SCALE[grade].value;
      return total + (section.weight / 100) * gradeValue;
    }, 0);
  };

  const [teamMark, setTeamMark] = useState(
    existingMark?.team_mark != null ? existingMark.team_mark : computeTeamMarkFromRubric(),
  );

  const finalMark = teamMark + individualAdjustment;

  useEffect(() => {
    setTeamMark(Math.round(computeTeamMarkFromRubric() * 10) / 10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sectionGrades]);

  const handleSave = () => {
    const rubricScores = SECTION_CONFIG.reduce<Record<string, number>>((acc, section) => {
      const grade = sectionGrades[section.key] ?? 'CR';
      acc[section.key] = GRADE_SCALE[grade].value;
      return acc;
    }, {} as Record<string, number>);

    const combinedFeedback = [
      ...SECTION_CONFIG.map((section) => {
        const note = sectionComments[section.key]?.trim();
        return note ? `${section.key}:\n${note}` : null;
      }).filter(Boolean),
      overallFeedback.trim() ? overallFeedback.trim() : null,
    ]
      .filter(Boolean)
      .join('\n\n');

    onSave(
      application.applicant_id,
      teamMark,
      individualAdjustment,
      combinedFeedback,
      rubricScores,
      teamMark,
      weightsRecord,
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {application.team?.name || `Team ${application.applicant_id.slice(0, 8)}`}
        </CardTitle>
        {application.team?.description && (
          <p className="text-sm text-muted-foreground mb-2">{application.team.description}</p>
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
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-xs font-medium text-muted-foreground">Rubric Overview</p>
            <ul className="mt-3 space-y-2 text-sm">
              {(Object.entries(GRADE_SCALE) as Array<[GradeKey, typeof GRADE_SCALE[GradeKey]]>).map(([grade, meta]) => (
                <li key={grade}>
                  <span className="font-semibold mr-2">{grade}</span>
                  <span className="text-muted-foreground">{meta.description}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-muted p-4 rounded-lg">
            <p className="text-xs font-medium text-muted-foreground">Team Mark (weighted)</p>
            <p className="mt-2 text-2xl font-bold">{teamMark.toFixed(1)}</p>
          </div>
          <div className="bg-muted p-4 rounded-lg space-y-2">
            <div>
              <Label htmlFor="team-adjustment" className="text-xs text-muted-foreground">Adjustment (±)</Label>
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
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">Final Mark</p>
              <p className="text-2xl font-bold">{finalMark.toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {SECTION_CONFIG.map((section) => {
            const grade = sectionGrades[section.key] ?? 'CR';
            return (
              <div key={section.key} className="border rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold">{section.key}</p>
                  <p className="text-xs text-muted-foreground">Weight {section.weight}% • {section.description}</p>
                </div>
                <Select
                  value={grade}
                  onValueChange={(value: GradeKey) => {
                    setSectionGrades({ ...sectionGrades, [section.key]: value });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(GRADE_SCALE) as Array<[GradeKey, typeof GRADE_SCALE[GradeKey]]>).map(([key, option]) => (
                      <SelectItem key={key} value={key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div>
                  <Label className="text-xs text-muted-foreground">Comments</Label>
                  <Textarea
                    className="mt-1"
                    rows={4}
                    value={sectionComments[section.key] ?? ''}
                    onChange={(e) => setSectionComments({ ...sectionComments, [section.key]: e.target.value })}
                    placeholder={`Notes on ${section.key.toLowerCase()}…`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium text-muted-foreground">Overall comments</Label>
          <Textarea
            rows={4}
            value={overallFeedback}
            onChange={(e) => setOverallFeedback(e.target.value)}
            placeholder="Summary feedback that students will see…"
          />
        </div>

        <div className="flex justify-between items-center">
          <div className="text-sm text-muted-foreground">
            {existingMark?.released ? <span className="text-green-600">Grade Released</span> : <span>Grade Not Released</span>}
          </div>
          <Button onClick={handleSave}>Save Mark</Button>
        </div>
      </CardContent>
    </Card>
  );
};