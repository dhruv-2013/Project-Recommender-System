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
  project_subject_code?: string | null;
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

      // Fetch subject codes from application_responses
      const applicationIds = appsData.map((app) => app.id);
      const { data: responsesData } = await supabase
        .from('application_responses' as any)
        .select('application_id, subject_code')
        .in('application_id', applicationIds);

      const subjectCodeMap = new Map<string, string | null>();
      (responsesData || []).forEach((resp: any) => {
        subjectCodeMap.set(resp.application_id, resp.subject_code || null);
      });

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
          project_subject_code: subjectCodeMap.get(app.id) || null,
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

    // If mark was previously released, keep it released when saving again
    if (existingMark?.released) {
      markData.released = true;
    }

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

    const existingMark = marks.find((m) => m.team_id === selectedTeam && m.project_id === team.project_id);
    const newReleasedStatus = !existingMark?.released;

    const { error } = await supabase
      .from('marks')
      .update({ released: newReleasedStatus })
      .eq('team_id', selectedTeam)
      .eq('project_id', team.project_id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update grade release status',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: newReleasedStatus ? 'Grades released successfully' : 'Grades unreleased',
      });
      fetchMarkForTeam();
      fetchApprovedTeams();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-white/60">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Marks Management</h2>
          <p className="mt-1 text-sm text-white/60">
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
            className="mb-4 bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            ← Back to Team List
          </Button>
          {(() => {
            const team = teams.find((t) => t.id === selectedTeam);
            const existingMark = marks.find((m) => m.team_id === selectedTeam);
            if (!team) return null;

            const application: ApplicationWithTeam & { project_subject_code?: string | null } = {
              id: team.application_id,
              applicant_id: team.id,
              applicant_type: 'team',
              project_id: team.project_id,
              status: 'approved',
              admin_note: null,
              created_at: null,
              updated_at: null,
              project_subject_code: team.project_subject_code,
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
                  <Card className="rounded-3xl border border-white/10 bg-black/70 text-white/80">
                    <CardContent className="pt-6">
                      <Button
                        onClick={handleReleaseGrades}
                        className={`w-full ${existingMark.released ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/30" : "bg-sky-500 text-white hover:bg-sky-400"}`}
                        variant={existingMark.released ? 'outline' : 'default'}
                      >
                        {existingMark.released ? 'Re-release Grades to Students' : 'Release Grades to Students'}
                      </Button>
                      {existingMark.released && (
                        <p className="mt-2 text-center text-sm text-emerald-400">
                          ✓ Grades have been released to students. Click above to re-release after making changes.
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
            <div className="rounded-lg border border-white/10 bg-black/70 py-12 text-center">
              <p className="text-lg text-white/60">No approved team applications found.</p>
              <p className="mt-2 text-sm text-white/60">
                Teams will appear here once they have approved applications.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {teams.map((team) => {
                const teamMark = marks.find((m) => m.team_id === team.id && m.project_id === team.project_id);
                const isMarked = !!teamMark;
                const isReleased = teamMark?.released || false;

                return (
                  <Card
                    key={team.id}
                    className={`cursor-pointer rounded-3xl border border-white/10 bg-black/70 text-white/80 shadow-[0_25px_65px_-40px_rgba(56,189,248,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/50 ${
                      selectedTeam === team.id ? 'ring-2 ring-sky-400' : ''
                    } ${isReleased ? 'border-emerald-400/50 bg-emerald-500/10' : ''}`}
                    onClick={() => {
                      setSelectedTeam(team.id);
                    }}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg text-white">{team.name}</CardTitle>
                        {isReleased && <Badge className="bg-emerald-500/30 text-emerald-300">Released</Badge>}
                        {isMarked && !isReleased && <Badge variant="secondary" className="bg-white/15 text-white/80">Marked</Badge>}
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <p className="text-sm font-medium text-sky-400">{team.project_title}</p>
                        {team.project_subject_code && (
                          <>
                            <span className="text-white/40">•</span>
                            <Badge variant="outline" className="border-white/20 bg-white/10 text-white/80 text-xs">
                              {team.project_subject_code}
                            </Badge>
                          </>
                        )}
                      </div>
                      {team.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-white/60">{team.description}</p>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div>
                          <p className="text-xs font-medium text-white/55">Team Members</p>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {team.members && team.members.length > 0 ? (
                              team.members.slice(0, 3).map((member) => (
                                <span key={member.user_id} className="rounded bg-black/60 px-2 py-0.5 text-xs text-white/80">
                                  {member.full_name || `User ${member.user_id.slice(0, 6)}`}
                                </span>
                              ))
                            ) : (
                              <span className="text-xs text-white/60">No members</span>
                            )}
                            {team.members && team.members.length > 3 && (
                              <span className="text-xs text-white/60">
                                +{team.members.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                        {isMarked && (
                          <div className="border-t border-white/10 pt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-white/55">Final Mark</span>
                              <span className="text-lg font-bold text-white">
                                {teamMark.final_mark?.toFixed(1) || teamMark.team_mark?.toFixed(1) || 'N/A'}
                              </span>
                            </div>
                          </div>
                        )}
                        <div className="pt-2">
                          <Button
                            className={`w-full ${isMarked ? 'bg-transparent border-white/20 text-white hover:bg-white/10' : 'bg-sky-500 text-white hover:bg-sky-400'}`}
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
    <Card className="rounded-3xl border border-white/10 bg-black/70 text-white/80">
      <CardHeader>
        <CardTitle className="text-lg text-white">
          {application.team?.name || `Team ${application.applicant_id.slice(0, 8)}`}
        </CardTitle>
        {(application as any).project_subject_code && (
          <div className="mb-2">
            <Badge variant="outline" className="border-white/20 bg-white/10 text-white/80 text-xs">
              Subject: {(application as any).project_subject_code}
            </Badge>
          </div>
        )}
        {application.team?.description && (
          <p className="mb-2 text-sm text-white/60">{application.team.description}</p>
        )}
        {application.team?.members && application.team.members.length > 0 && (
          <div className="mt-2">
            <p className="mb-1 text-xs font-medium text-white/55">Team Members:</p>
            <div className="flex flex-wrap gap-2">
              {application.team.members.map((member) => (
                <span key={member.user_id} className="rounded bg-black/60 px-2 py-1 text-xs text-white/80">
                  {member.full_name || `User ${member.user_id.slice(0, 8)}`}
                  {member.email && <span className="text-white/60"> ({member.email})</span>}
                </span>
              ))}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-black/60 p-4">
            <p className="text-xs font-medium text-white/55">Rubric Overview</p>
            <ul className="mt-3 space-y-2 text-sm">
              {(Object.entries(GRADE_SCALE) as Array<[GradeKey, typeof GRADE_SCALE[GradeKey]]>).map(([grade, meta]) => (
                <li key={grade}>
                  <span className="mr-2 font-semibold text-white">{grade}</span>
                  <span className="text-white/60">{meta.description}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg bg-black/60 p-4">
            <p className="text-xs font-medium text-white/55">Team Mark (weighted)</p>
            <p className="mt-2 text-2xl font-bold text-white">{teamMark.toFixed(1)}</p>
          </div>
          <div className="space-y-2 rounded-lg bg-black/60 p-4">
            <div>
              <Label htmlFor="team-adjustment" className="text-xs text-white/55">Adjustment (±)</Label>
              <Input
                id="team-adjustment"
                type="number"
                min="-50"
                max="50"
                step="0.5"
                value={individualAdjustment}
                onChange={(e) => setIndividualAdjustment(parseFloat(e.target.value) || 0)}
                placeholder="0.0"
                className="rounded-xl border-white/15 bg-black/40 text-white placeholder:text-white/40 focus-visible:ring-0"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-white/55">Final Mark</p>
              <p className="text-2xl font-bold text-white">{finalMark.toFixed(1)}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {SECTION_CONFIG.map((section) => {
            const grade = sectionGrades[section.key] ?? 'CR';
            return (
              <div key={section.key} className="rounded-lg border border-white/10 bg-black/60 p-4 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-white">{section.key}</p>
                  <p className="text-xs text-white/60">Weight {section.weight}% • {section.description}</p>
                </div>
                <Select
                  value={grade}
                  onValueChange={(value: GradeKey) => {
                    setSectionGrades({ ...sectionGrades, [section.key]: value });
                  }}
                >
                  <SelectTrigger className="rounded-xl border-white/15 bg-black/40 text-white focus-visible:ring-0">
                    <SelectValue placeholder="Select grade" />
                  </SelectTrigger>
                  <SelectContent className="border border-white/10 bg-[#0b111a] text-white">
                    {(Object.entries(GRADE_SCALE) as Array<[GradeKey, typeof GRADE_SCALE[GradeKey]]>).map(([key, option]) => (
                      <SelectItem key={key} value={key}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div>
                  <Label className="text-xs text-white/55">Comments</Label>
                  <Textarea
                    className="mt-1 rounded-xl border-white/15 bg-black/40 text-white placeholder:text-white/40 focus-visible:ring-0"
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
          <Label className="text-sm font-medium text-white/55">Overall comments</Label>
          <Textarea
            rows={4}
            value={overallFeedback}
            onChange={(e) => setOverallFeedback(e.target.value)}
            placeholder="Summary feedback that students will see…"
            className="rounded-xl border-white/15 bg-black/40 text-white placeholder:text-white/40 focus-visible:ring-0"
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="text-sm text-white/60">
            {existingMark?.released ? <span className="text-emerald-400">Grade Released</span> : <span>Grade Not Released</span>}
          </div>
          <Button onClick={handleSave} className="bg-sky-500 text-white hover:bg-sky-400">Save Mark</Button>
        </div>
      </CardContent>
    </Card>
  );
};