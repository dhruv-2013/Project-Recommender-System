import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export const ApplicationManagement = () => {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<any>(null);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', note: '' });
  const { toast } = useToast();
  const [augmented, setAugmented] = useState<Record<string, { matchPercentage: number; matchedSkills: string[]; teamSize: number; probableMark: number }>>({});
  const [responses, setResponses] = useState<Record<string, { q1: string; q2: string }>>({});
  const [teamNames, setTeamNames] = useState<Record<string, string>>({});
  const [teamDetails, setTeamDetails] = useState<Record<string, any[]>>({});
  const [openTeamForAppId, setOpenTeamForAppId] = useState<string | null>(null);

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
    const result: Record<string, { matchPercentage: number; matchedSkills: string[]; teamSize: number; probableMark: number }> = {};
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
      const probableMark = Math.min(100, Math.round(60 + matchPercentage * 0.3 + Math.min(10, teamSize * 2)));

      result[app.id] = { matchPercentage, matchedSkills: matched, teamSize, probableMark };
    }
    setAugmented(result);
  };

  const fetchResponses = async (apps: any[]) => {
    const ids = apps.map(a => a.id);
    if (ids.length === 0) return;
    const { data } = await supabase
      .from('application_responses' as any)
      .select('application_id, q1, q2')
      .in('application_id', ids);
    const map: Record<string, { q1: string; q2: string }> = {};
    (data || []).forEach((row: any) => {
      map[row.application_id] = { q1: row.q1 || '', q2: row.q2 || '' };
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
    return <div>Loading applications...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Application Management</h2>
      </div>

      <div className="space-y-4">
        {applications.map((application) => (
          <Card key={application.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">
                    {application.projects?.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Applicant: {application.applicant_type === 'team' 
                      ? (teamNames[application.applicant_id] || 'Team') 
                      : (individualProfiles[application.applicant_id]?.full_name || application.applicant_id)}
                    {application.applicant_type === 'individual' && individualProfiles[application.applicant_id]?.email 
                      ? ` (${individualProfiles[application.applicant_id]?.email})` 
                      : ''}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Type: {application.applicant_type}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusBadgeVariant(application.status)}>
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
                      >
                        Update Status
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Application Status</DialogTitle>
                      </DialogHeader>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select 
                            value={statusUpdate.status} 
                            onValueChange={(value) => setStatusUpdate(prev => ({ ...prev, status: value }))}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="approved">Approved</SelectItem>
                              <SelectItem value="waitlisted">Waitlisted</SelectItem>
                              <SelectItem value="rejected">Rejected</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="note">Admin Note (Optional)</Label>
                          <Textarea
                            id="note"
                            value={statusUpdate.note}
                            onChange={(e) => setStatusUpdate(prev => ({ ...prev, note: e.target.value }))}
                            placeholder="Add a note for the applicant..."
                            rows={3}
                          />
                        </div>

                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setSelectedApplication(null)}>
                            Cancel
                          </Button>
                          <Button onClick={handleStatusUpdate}>
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
                      <Button variant="outline" size="sm">View Team</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Team Members - {teamNames[application.applicant_id] || 'Team'}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-3">
                        {(teamDetails[application.id] || []).map((m: any) => (
                          <div key={m.id} className="p-3 bg-muted rounded">
                            <div className="font-medium">{m.profile?.full_name || m.user_id} {m.role === 'creator' && <span className="ml-2 text-xs px-2 py-0.5 bg-secondary rounded">Creator</span>}</div>
                            <div className="text-sm text-muted-foreground">{m.profile?.email || ''}</div>
                            {Array.isArray(m.skills) && m.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {m.skills.map((s: string) => (
                                  <span key={s} className="text-xs px-2 py-0.5 bg-secondary rounded">{s}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                        {(teamDetails[application.id] || []).length === 0 && (
                          <div className="text-sm text-muted-foreground">No members found.</div>
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>
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
                >
                  Decline
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">Applied:</span> {new Date(application.created_at).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-medium">Category:</span> {application.projects?.category}
                </div>
                <div>
                  <span className="font-medium">Team Size:</span> {augmented[application.id]?.teamSize ?? (application.applicant_type === 'team' ? '—' : 1)}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Skill Match</div>
                  <div className="text-xl font-bold">{augmented[application.id]?.matchPercentage ?? 0}%</div>
                </div>
                <div className="p-3 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Matched Skills</div>
                  <div className="text-sm">{(augmented[application.id]?.matchedSkills || []).join(', ') || '—'}</div>
                </div>
                <div className="p-3 bg-muted rounded">
                  <div className="text-xs text-muted-foreground">Probable Mark</div>
                  <div className="text-xl font-bold">{augmented[application.id]?.probableMark ?? 60}</div>
                </div>
              </div>
              {(responses[application.id]?.q1 || responses[application.id]?.q2) && (
                <div className="mt-3 p-3 bg-muted rounded">
                  <div className="text-sm font-medium mb-2">Team Responses</div>
                  {responses[application.id]?.q1 && (
                    <div className="text-sm mb-2">
                      <span className="font-medium">Q1:</span> {responses[application.id]?.q1}
                    </div>
                  )}
                  {responses[application.id]?.q2 && (
                    <div className="text-sm">
                      <span className="font-medium">Q2:</span> {responses[application.id]?.q2}
                    </div>
                  )}
                </div>
              )}
              {application.admin_note && (
                <div className="mt-2 p-2 bg-muted rounded">
                  <span className="font-medium">Admin Note:</span> {application.admin_note}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {applications.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No applications found.</p>
        </div>
      )}
    </div>
  );
};