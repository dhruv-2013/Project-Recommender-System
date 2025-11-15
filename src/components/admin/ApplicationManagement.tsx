import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

export const ApplicationManagement = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', note: '' });
  const { toast } = useToast();
  const [augmented, setAugmented] = useState<Record<string, { matchPercentage: number; matchedSkills: string[]; teamSize: number }>>({});
  const [responses, setResponses] = useState<Record<string, { q1: string; q2: string; subject_code?: string }>>({});
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [teamDetails, setTeamDetails] = useState<Record<string, any[]>>({});
  const [openTeamForAppId, setOpenTeamForAppId] = useState<string | null>(null);
  const [viewDetailDialog, setViewDetailDialog] = useState<string | null>(null);
  const [recommendations, setRecommendations] = useState<Record<string, {
    bestApplicationId: string | null;
    summary?: string | null;
    ranking: Array<{
      applicationId: string;
      suitabilityScore: number | null;
      strengths?: string;
      concerns?: string;
    }>;
  }>>({});
  const [evaluatingProjectId, setEvaluatingProjectId] = useState<string | null>(null);

  const teamApplicationMeta = useMemo(() => {
    const map: Record<string, { teamCount: number; firstTeamApplicationId: string | null }> = {};
    applications.forEach((app) => {
      if (app.applicant_type !== 'team') return;
      const entry = map[app.project_id] ?? { teamCount: 0, firstTeamApplicationId: null };
      entry.teamCount += 1;
      if (!entry.firstTeamApplicationId) {
        entry.firstTeamApplicationId = app.id;
      }
      map[app.project_id] = entry;
    });
    return map;
  }, [applications]);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    const { data, error } = await supabase
      .from('applications')
      .select(`
        *,
        projects:project_id (title, category, required_skills, preferred_skills, team_size_min, team_size_max)
      `)
      .neq('status', 'rejected')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch applications",
        variant: "destructive"
      });
    } else {
      setApplications(data || []);
      void augmentApplications(data || []);
      void fetchResponses(data || []);
      void fetchTeamNames(data || []);
      void fetchIndividualProfiles(data || []);
    }
    setLoading(false);
  };

  const augmentApplications = async (apps: any[]) => {
    const result: Record<string, { matchPercentage: number; matchedSkills: string[]; teamSize: number }> = {};
    for (const app of apps) {
      const projectSkills: string[] = [
        ...(app.projects?.required_skills || []),
        ...(app.projects?.preferred_skills || []),
      ];
      let applicantSkills: string[] = [];
      let teamSize = 1;
      try {
        if (app.applicant_type === 'team') {
          const { data: members } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', app.applicant_id);
          teamSize = members?.length || 0;
          const userIds = (members || []).map((m: any) => m.user_id);
          if (userIds.length > 0) {
            const { data: studentProfiles } = await supabase
              .from('student_profiles')
              .select('user_id, skills')
              .in('user_id', userIds);
            const skillSet = new Set<string>();
            (studentProfiles || []).forEach((sp: any) => {
              (sp.skills || []).forEach((s: string) => skillSet.add(s));
            });
            applicantSkills = Array.from(skillSet);
          }
        } else {
          const { data: studentProfile } = await supabase
            .from('student_profiles')
            .select('skills')
            .eq('user_id', app.applicant_id)
            .maybeSingle();
          applicantSkills = (studentProfile?.skills || []);
        }
      } catch (e) {
        // ignore
      }

      const matched = applicantSkills.filter((s) => projectSkills.includes(s));
      const matchPercentage = projectSkills.length > 0 ? Math.round((matched.length / projectSkills.length) * 100) : 0;
      result[app.id] = { matchPercentage, matchedSkills: matched, teamSize };
    }
    setAugmented(result);
  };

  const fetchResponses = async (apps: any[]) => {
    const ids = apps.map(a => a.id);
    if (ids.length === 0) return;
    const { data } = await supabase
      .from('application_responses' as any)
      .select('application_id, q1, q2, subject_code')
      .in('application_id', ids);
    const map: Record<string, { q1: string; q2: string; subject_code?: string }> = {};
    (data || []).forEach((row: any) => {
      map[row.application_id] = { q1: row.q1 || '', q2: row.q2 || '', subject_code: row.subject_code || undefined };
    });
    setResponses(map);
  };

  const fetchTeamNames = async (apps: any[]) => {
    const teamIds = apps.filter(a => a.applicant_type === 'team').map(a => a.applicant_id);
    if (teamIds.length === 0) return;
    const { data } = await supabase
      .from('teams')
      .select('id, name')
      .in('id', teamIds);
    const map: Record<string, string> = {};
    (data || []).forEach((t: any) => { map[t.id] = t.name; });
    setTeamNames(map);
  };

  const [individualProfiles, setIndividualProfiles] = useState<Record<string, { full_name: string; email: string }>>({});
  const fetchIndividualProfiles = async (apps: any[]) => {
    const userIds = apps.filter(a => a.applicant_type === 'individual').map(a => a.applicant_id);
    const unique = Array.from(new Set(userIds));
    if (unique.length === 0) return;
    const { data } = await supabase
      .from('profiles')
      .select('user_id, full_name, email')
      .in('user_id', unique);
    const map: Record<string, { full_name: string; email: string }> = {};
    (data || []).forEach((p: any) => { map[p.user_id] = { full_name: p.full_name, email: p.email }; });
    setIndividualProfiles(map);
  };

  const fetchTeamDetails = async (teamId: string, applicationId: string) => {
    try {
      // fetch team members
      const { data: members } = await supabase
        .from('team_members')
        .select('id, user_id, role')
        .eq('team_id', teamId);

      const userIds = (members || []).map((m: any) => m.user_id);
      let profilesMap: Record<string, any> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', userIds);
        (profiles || []).forEach((p: any) => { profilesMap[p.user_id] = p; });

        const { data: sps } = await supabase
          .from('student_profiles')
          .select('user_id, skills')
          .in('user_id', userIds);
        const skillsMap: Record<string, string[]> = {};
        (sps || []).forEach((sp: any) => { skillsMap[sp.user_id] = sp.skills || []; });

        const enriched = (members || []).map((m: any) => ({
          ...m,
          profile: profilesMap[m.user_id] || {},
          skills: skillsMap[m.user_id] || [],
        }));
        setTeamDetails(prev => ({ ...prev, [applicationId]: enriched }));
      } else {
        setTeamDetails(prev => ({ ...prev, [applicationId]: [] }));
      }
    } catch (e) {
      // swallow errors in admin UI
      setTeamDetails(prev => ({ ...prev, [applicationId]: [] }));
    }
  };

  const handleRecommendTeam = async (projectId: string) => {
    try {
      setEvaluatingProjectId(projectId);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Not signed in",
          description: "Please sign in again and retry.",
          variant: "destructive"
        });
        return;
      }

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${supabaseUrl}/functions/v1/evaluate-team-applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          projectId,
          authToken: session.access_token,
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Failed to evaluate applications');
      }

      toast({
        title: "Recommendation ready",
        description: payload.bestApplicationId
          ? "AI suggested the best-fit team for this project."
          : "AI review complete, but no clear standout was found.",
      });

      setRecommendations(prev => ({
        ...prev,
        [projectId]: {
          bestApplicationId: payload.bestApplicationId ?? null,
          summary: payload.summary ?? null,
          ranking: Array.isArray(payload.ranking) ? payload.ranking : [],
        },
      }));
    } catch (error: any) {
      console.error("handleRecommendTeam error:", error);
      toast({
        title: "Recommendation failed",
        description: error?.message || "Unable to generate recommendation. Please try again.",
        variant: "destructive"
      });
    } finally {
      setEvaluatingProjectId(null);
    }
  };

  const handleStatusUpdate = async () => {
    if (!selectedApplication || !statusUpdate.status) {
      toast({
        title: "Error",
        description: "Please select a status",
        variant: "destructive"
      });
      return;
    }

    const { error } = await supabase
      .from('applications')
      .update({
        status: statusUpdate.status,
        admin_note: statusUpdate.note || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedApplication.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update application status",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Application status updated successfully"
      });
      setSelectedApplication(null);
      setStatusUpdate({ status: '', note: '' });
      fetchApplications();
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'rejected': return 'destructive';
      case 'waitlisted': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12 text-white/60">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent" />
      </div>
    );
  }

  const pendingApplications = applications.filter(app => app.status === 'pending' || app.status === 'waitlisted');
  const approvedApplications = applications.filter(app => app.status === 'approved');

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Application Management</h2>
      </div>

      <Tabs defaultValue="pending" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 rounded-full border border-white/10 bg-black/30 p-1">
          <TabsTrigger
            value="pending"
            className="gap-2 rounded-full text-white/70 transition-all data-[state=active]:bg-sky-300/90 data-[state=active]:text-black"
          >
            Pending Applications
            {pendingApplications.length > 0 && (
              <Badge variant="destructive" className="ml-1 h-5 px-1.5 text-xs bg-amber-500/20 text-amber-200">
                {pendingApplications.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger
            value="approved"
            className="gap-2 rounded-full text-white/70 transition-all data-[state=active]:bg-sky-300/90 data-[state=active]:text-black"
          >
            Approved Applications
            {approvedApplications.length > 0 && (
              <Badge variant="default" className="ml-1 h-5 px-1.5 text-xs bg-emerald-500/20 text-emerald-200">
                {approvedApplications.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {pendingApplications.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-black/70 py-12 text-center">
              <p className="text-lg text-white/60">No pending applications</p>
            </div>
          ) : (
            pendingApplications.map((application) => {
          const meta = teamApplicationMeta[application.project_id];
          const multipleTeamsForProject = (meta?.teamCount ?? 0) > 1;
          const isPrimaryTeamForProject = multipleTeamsForProject && meta?.firstTeamApplicationId === application.id;
          const recommendation = recommendations[application.project_id];
          const rankingEntry = recommendation?.ranking?.find((entry) => entry.applicationId === application.id);
          const rankingPosition = recommendation?.ranking?.findIndex((entry) => entry.applicationId === application.id);
          const isRecommended = recommendation?.bestApplicationId === application.id;
          const showRecommendButton = application.applicant_type === 'team'
            && isPrimaryTeamForProject
            && !recommendation
            && evaluatingProjectId !== application.project_id;
          const showEvaluating = isPrimaryTeamForProject && evaluatingProjectId === application.project_id;

          return (
          <Card key={application.id} className={cn(
            "rounded-3xl border border-white/10 bg-black/70 text-white/80 shadow-[0_25px_65px_-40px_rgba(56,189,248,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/50",
            isRecommended && "border-emerald-400/60 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
          )}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg text-white">
                    {application.projects?.title}
                  </CardTitle>
                  <p className="text-sm text-white/60">
                    Applicant: {application.applicant_type === 'team' 
                      ? (teamNames[application.applicant_id] || 'Team') 
                      : (individualProfiles[application.applicant_id]?.full_name || application.applicant_id)}
                    {application.applicant_type === 'individual' && individualProfiles[application.applicant_id]?.email 
                      ? ` (${individualProfiles[application.applicant_id]?.email})` 
                      : ''}
                  </p>
                  <p className="text-sm text-white/60">
                    Type: {application.applicant_type}
                  </p>
                  {application.applicant_type === 'team' && responses[application.id]?.subject_code && (
                    <p className="text-sm text-white/60">
                      Subject: <span className="font-medium text-sky-300">{responses[application.id]?.subject_code}</span>
                    </p>
                  )}
                  {recommendation && (
                    <div className="mt-3 space-y-2">
                      {isRecommended && (
                        <Badge variant="default" className="bg-emerald-500/20 text-emerald-600 border border-emerald-500/30">
                          Recommended by AI
                        </Badge>
                      )}
                      {rankingPosition != null && rankingPosition > -1 && (
                        <div className="text-xs text-white/60">
                          AI Ranking: #{rankingPosition + 1}
                          {rankingEntry?.suitabilityScore != null && (
                            <span className="ml-1 font-semibold text-white">
                              ({rankingEntry.suitabilityScore}/100)
                            </span>
                          )}
                        </div>
                      )}
                      {isRecommended && recommendation.summary && (
                        <p className="text-sm leading-relaxed text-white/60">
                          {recommendation.summary}
                        </p>
                      )}
                      {!isRecommended && rankingEntry?.strengths && (
                        <div className="rounded-md bg-black/60 p-3 text-xs leading-relaxed">
                          <p className="font-semibold text-white">AI Notes</p>
                          <p className="mt-1 text-white/60">
                            <span className="font-semibold text-white">Strengths:</span> {rankingEntry.strengths}
                          </p>
                          {rankingEntry.concerns && (
                            <p className="mt-1 text-white/60">
                              <span className="font-semibold text-white">Concerns:</span> {rankingEntry.concerns}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={getStatusBadgeVariant(application.status)}
                    className={
                      application.status === 'approved' 
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                        : application.status === 'rejected'
                        ? 'bg-red-500/30 text-red-200 border border-red-500/30'
                        : application.status === 'waitlisted'
                        ? 'bg-amber-500/30 text-amber-300 border border-amber-500/30'
                        : 'bg-transparent border-white/20 text-white/80'
                    }
                  >
                    {application.status}
                  </Badge>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedApplication(application);
                          setStatusUpdate({ status: application.status, note: application.admin_note || '' });
                        }}
                        className="bg-transparent border-white/20 text-white hover:bg-white/10"
                      >
                        Update Status
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="border border-white/10 bg-[#0b111a] text-white">
                      <DialogHeader>
                        <DialogTitle className="text-white">Update Application Status</DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="status" className="text-white/70">Status</Label>
                          <Select 
                            value={statusUpdate.status} 
                            onValueChange={(value) => setStatusUpdate(prev => ({ ...prev, status: value }))}
                          >
                            <SelectTrigger className="rounded-xl border-white/15 bg-black/40 text-white focus-visible:ring-0">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent className="border border-white/10 bg-[#0b111a] text-white">
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="waitlisted">Waitlisted</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="note" className="text-white/70">Admin Note (Optional)</Label>
                          <Textarea
                            id="note"
                            value={statusUpdate.note}
                            onChange={(e) => setStatusUpdate(prev => ({ ...prev, note: e.target.value }))}
                            placeholder="Add a note for the applicant..."
                            rows={3}
                            className="rounded-xl border-white/15 bg-black/40 text-white placeholder:text-white/40 focus-visible:ring-0"
                          />
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setSelectedApplication(null)} className="border-white/20 text-white hover:bg-white/10">
                            Cancel
                          </Button>
                          <Button onClick={handleStatusUpdate} className="bg-sky-500 text-white hover:bg-sky-400">
                            Update Status
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                {application.applicant_type === 'team' && (
                  <Dialog open={openTeamForAppId === application.id} onOpenChange={(o) => {
                    if (o) {
                      setOpenTeamForAppId(application.id);
                      void fetchTeamDetails(application.applicant_id, application.id);
                    } else {
                      setOpenTeamForAppId(null);
                    }
                  }}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="bg-transparent border-white/20 text-white hover:bg-white/10">View Team</Button>
                    </DialogTrigger>
                    <DialogContent className="border border-white/10 bg-[#0b111a] text-white">
                      <DialogHeader>
                        <DialogTitle className="text-white">Team Members - {teamNames[application.applicant_id] || 'Team'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        {(teamDetails[application.id] || []).map((m: any) => (
                          <div key={m.id} className="rounded-lg bg-black/60 p-3">
                            <div className="font-medium text-white">{m.profile?.full_name || m.user_id} {m.role === 'creator' && <span className="ml-2 rounded bg-white/15 px-2 py-0.5 text-xs text-white/80">Creator</span>}</div>
                            <div className="text-sm text-white/60">{m.profile?.email || ''}</div>
                            {Array.isArray(m.skills) && m.skills.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {m.skills.map((s: string) => (
                                  <span key={s} className="rounded bg-white/15 px-2 py-0.5 text-xs text-white/80">{s}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {(teamDetails[application.id] || []).length === 0 && (
                          <div className="text-sm text-white/60">No members found.</div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
                {showRecommendButton && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleRecommendTeam(application.project_id)}
                    className="bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30"
                  >
                    Let AI pick best team
                  </Button>
                )}
                {showEvaluating && (
                  <Button variant="secondary" size="sm" disabled className="bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    Evaluating…
                  </Button>
                )}
                <Button 
                  variant="default"
                  size="sm"
                  onClick={async () => {
                    setSelectedApplication(application);
                    setStatusUpdate({ status: 'approved', note: '' });
                    const { error } = await supabase
                      .from('applications')
                      .update({ status: 'approved', updated_at: new Date().toISOString() })
                      .eq('id', application.id);
                    if (error) {
                      toast({ title: 'Error', description: 'Failed to approve application', variant: 'destructive' });
                    } else {
                      toast({ title: 'Approved', description: 'Application approved' });
                      fetchApplications();
                    }
                  }}
                  className="bg-emerald-500 text-white hover:bg-emerald-400"
                >
                  Approve
                </Button>
                <Button 
                  variant="destructive"
                  size="sm"
                  onClick={async () => {
                    setSelectedApplication(application);
                    setStatusUpdate({ status: 'rejected', note: '' });
                    const { error } = await supabase
                      .from('applications')
                      .update({ status: 'rejected', updated_at: new Date().toISOString() })
                      .eq('id', application.id);
                    if (error) {
                      toast({ title: 'Error', description: 'Failed to decline application', variant: 'destructive' });
                    } else {
                      toast({ title: 'Declined', description: 'Application declined' });
                      fetchApplications();
                    }
                  }}
                  className="bg-red-500/30 text-red-200 hover:bg-red-500/40 border border-red-500/30"
                >
                  Decline
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-3">
                <div>
                  <span className="font-medium text-white/70">Applied:</span> <span className="text-white/60">{new Date(application.created_at).toLocaleDateString()}</span>
                </div>
                <div>
                  <span className="font-medium text-white/70">Category:</span> <span className="text-white/60">{application.projects?.category}</span>
                </div>
                <div>
                  <span className="font-medium text-white/70">Team Size:</span> <span className="text-white/60">{augmented[application.id]?.teamSize ?? (application.applicant_type === 'team' ? '—' : 1)}</span>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-black/60 p-3">
                  <div className="text-xs text-white/55">Skill Match</div>
                  <div className="text-xl font-bold text-white">{augmented[application.id]?.matchPercentage ?? 0}%</div>
                </div>
                <div className="rounded-lg bg-black/60 p-3">
                  <div className="text-xs text-white/55">Matched Skills</div>
                  <div className="text-sm text-white/60">{(augmented[application.id]?.matchedSkills || []).join(', ') || '—'}</div>
                </div>
              </div>
              {application.applicant_type === 'team' && (responses[application.id]?.q1 || responses[application.id]?.q2) && (
                <div className="mt-3 space-y-3">
                  <div className="rounded-lg border border-white/10 bg-black/60 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium text-white">Team Application Responses</div>
                      {responses[application.id]?.subject_code && (
                        <Badge variant="outline" className="border-white/20 bg-white/10 text-white/80 text-xs">
                          {responses[application.id]?.subject_code}
                        </Badge>
                      )}
                    </div>
                    {responses[application.id]?.q1 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-white/70">Q1: Why is your team a good fit for this project?</p>
                        <p className="text-sm text-white/80 whitespace-pre-wrap line-clamp-2">{responses[application.id]?.q1}</p>
                      </div>
                    )}
                    {responses[application.id]?.q2 && (
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-white/70">Q2: Outline your proposed approach or plan</p>
                        <p className="text-sm text-white/80 whitespace-pre-wrap line-clamp-2">{responses[application.id]?.q2}</p>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setViewDetailDialog(application.id)}
                      className="w-full bg-transparent border-white/20 text-white hover:bg-white/10"
                    >
                      View Full Details
                    </Button>
                  </div>
                </div>
              )}
              {application.admin_note && (
                <div className="mt-2 rounded-lg bg-black/60 p-2">
                  <span className="font-medium text-white">Admin Note:</span> <span className="text-white/60">{application.admin_note}</span>
                </div>
              )}
            </CardContent>
          </Card>
          );
            })
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {approvedApplications.length === 0 ? (
            <div className="rounded-lg border border-white/10 bg-black/70 py-12 text-center">
              <p className="text-lg text-white/60">No approved applications</p>
              <p className="mt-2 text-sm text-white/50">Approved applications will appear here and can be marked in the Marks tab</p>
            </div>
          ) : (
            approvedApplications.map((application) => {
              const meta = teamApplicationMeta[application.project_id];
              const multipleTeamsForProject = (meta?.teamCount ?? 0) > 1;
              const isPrimaryTeamForProject = multipleTeamsForProject && meta?.firstTeamApplicationId === application.id;
              const recommendation = recommendations[application.project_id];
              const rankingEntry = recommendation?.ranking?.find((entry) => entry.applicationId === application.id);
              const rankingPosition = recommendation?.ranking?.findIndex((entry) => entry.applicationId === application.id);
              const isRecommended = recommendation?.bestApplicationId === application.id;

              return (
                <Card key={application.id} className={cn(
                  "rounded-3xl border border-white/10 bg-black/70 text-white/80 shadow-[0_25px_65px_-40px_rgba(56,189,248,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/50",
                  isRecommended && "border-emerald-400/60 shadow-[0_0_0_1px_rgba(16,185,129,0.35)]"
                )}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg text-white">
                          {application.projects?.title}
                        </CardTitle>
                        <p className="text-sm text-white/60">
                          Applicant: {application.applicant_type === 'team' 
                            ? (teamNames[application.applicant_id] || 'Team') 
                            : (individualProfiles[application.applicant_id]?.full_name || application.applicant_id)}
                          {application.applicant_type === 'individual' && individualProfiles[application.applicant_id]?.email 
                            ? ` (${individualProfiles[application.applicant_id]?.email})` 
                            : ''}
                        </p>
                        <p className="text-sm text-white/60">
                          Type: {application.applicant_type}
                        </p>
                        {application.applicant_type === 'team' && responses[application.id]?.subject_code && (
                          <p className="text-sm text-white/60">
                            Subject: <span className="font-medium text-sky-300">{responses[application.id]?.subject_code}</span>
                          </p>
                        )}
                        <Badge className="mt-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          Approved
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div className="rounded-lg bg-black/60 p-3">
                          <div className="text-xs text-white/55">Skill Match</div>
                          <div className="text-xl font-bold text-white">{augmented[application.id]?.matchPercentage ?? 0}%</div>
                        </div>
                        <div className="rounded-lg bg-black/60 p-3">
                          <div className="text-xs text-white/55">Matched Skills</div>
                          <div className="text-sm text-white/60">{(augmented[application.id]?.matchedSkills || []).join(', ') || '—'}</div>
                        </div>
                      </div>
                      {application.applicant_type === 'team' && (responses[application.id]?.q1 || responses[application.id]?.q2) && (
                        <div className="mt-3 space-y-3">
                          <div className="rounded-lg border border-white/10 bg-black/60 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="text-sm font-medium text-white">Team Application Responses</div>
                              {responses[application.id]?.subject_code && (
                                <Badge variant="outline" className="border-white/20 bg-white/10 text-white/80 text-xs">
                                  {responses[application.id]?.subject_code}
                                </Badge>
                              )}
                            </div>
                            {responses[application.id]?.q1 && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-white/70">Q1: Why is your team a good fit for this project?</p>
                                <p className="text-sm text-white/80 whitespace-pre-wrap line-clamp-2">{responses[application.id]?.q1}</p>
                              </div>
                            )}
                            {responses[application.id]?.q2 && (
                              <div className="space-y-1">
                                <p className="text-xs font-medium text-white/70">Q2: Outline your proposed approach or plan</p>
                                <p className="text-sm text-white/80 whitespace-pre-wrap line-clamp-2">{responses[application.id]?.q2}</p>
                              </div>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setViewDetailDialog(application.id)}
                              className="w-full bg-transparent border-white/20 text-white hover:bg-white/10"
                            >
                              View Full Details
                            </Button>
                          </div>
                        </div>
                      )}
                      <p className="text-sm text-white/50 italic">
                        This application has been approved. You can mark this team in the Marks tab.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* View Detail Dialog */}
      {viewDetailDialog && (() => {
        const application = applications.find(app => app.id === viewDetailDialog);
        const appResponses = responses[viewDetailDialog];
        if (!application || !appResponses) return null;

        return (
          <Dialog open={!!viewDetailDialog} onOpenChange={(open) => !open && setViewDetailDialog(null)}>
            <DialogContent className="border border-white/10 bg-[#0b111a] text-white max-w-2xl">
              <DialogHeader>
                <DialogTitle className="text-white">Team Application Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-2">
                    {application.projects?.title || 'Unknown Project'}
                  </h3>
                  <p className="text-sm text-white/60">
                    Team: {teamNames[application.applicant_id] || 'Unknown Team'}
                  </p>
                  {appResponses.subject_code && (
                    <Badge variant="outline" className="mt-2 border-white/20 bg-white/10 text-white/80">
                      {appResponses.subject_code}
                    </Badge>
                  )}
                </div>

                {appResponses.q1 && (
                  <div className="space-y-2">
                    <Label className="text-white/70 font-semibold">
                      Why is your team a good fit for this project?
                    </Label>
                    <div className="rounded-lg border border-white/10 bg-black/60 p-4">
                      <p className="text-white/80 whitespace-pre-wrap">{appResponses.q1}</p>
                    </div>
                  </div>
                )}

                {appResponses.q2 && (
                  <div className="space-y-2">
                    <Label className="text-white/70 font-semibold">
                      Outline your proposed approach or plan
                    </Label>
                    <div className="rounded-lg border border-white/10 bg-black/60 p-4">
                      <p className="text-white/80 whitespace-pre-wrap">{appResponses.q2}</p>
                    </div>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    onClick={() => setViewDetailDialog(null)}
                    className="bg-transparent border-white/20 text-white hover:bg-white/10"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        );
      })()}
    </div>
  );
};