import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Download, FileText, Search, Filter, Loader2, Users, FolderOpen, Calendar, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface Submission {
  id: string;
  team_id: string;
  project_id: string;
  subject_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  file_type: string;
  team_acknowledgment: boolean;
  created_at: string;
  submitted_by: string;
  teams?: {
    name: string;
  };
  projects?: {
    title: string;
  };
  subjects?: {
    name: string;
    code: string;
  };
  profiles?: {
    user_id?: string;
    full_name: string;
    email: string;
  } | null;
}

export const SubmissionManagement = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [filteredSubmissions, setFilteredSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTeam, setFilterTeam] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [teams, setTeams] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    fetchSubmissions();
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [submissions, searchTerm, filterTeam, filterProject, filterSubject]);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          teams:team_id (name),
          projects:project_id (title),
          subjects:subject_id (name, code)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const submissionsList = (data || []) as Submission[];

      const submitterIds = Array.from(
        new Set(
          submissionsList
            .map((submission) => submission.submitted_by)
            .filter((id): id is string => Boolean(id))
        )
      );

      let submitterProfiles: Record<string, { full_name: string; email: string }> = {};

      if (submitterIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('user_id, full_name, email')
          .in('user_id', submitterIds);

        if (profilesError) {
          console.error('Error fetching submitter profiles:', profilesError);
        } else {
          submitterProfiles = (profilesData || []).reduce(
            (acc, profile) => ({
              ...acc,
              [profile.user_id]: {
                full_name: profile.full_name || 'Unknown User',
                email: profile.email || 'No email',
              },
            }),
            {} as Record<string, { full_name: string; email: string }>
          );
        }
      }

      const enrichedSubmissions = submissionsList.map((submission) => ({
        ...submission,
        profiles: submission.submitted_by
          ? {
              user_id: submission.submitted_by,
              full_name: submitterProfiles[submission.submitted_by]?.full_name || 'Unknown User',
              email: submitterProfiles[submission.submitted_by]?.email || 'No email',
            }
          : null,
      }));

      setSubmissions(enrichedSubmissions);
    } catch (error: any) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to load submissions');
    } finally {
      setLoading(false);
    }
  };

  const fetchFilterOptions = async () => {
    try {
      // Fetch unique teams
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name')
        .order('name');

      // Fetch unique projects
      const { data: projectsData } = await supabase
        .from('projects')
        .select('id, title')
        .order('title');

      // Fetch unique subjects
      const { data: subjectsData } = await supabase
        .from('subjects')
        .select('id, name, code')
        .order('code');

      setTeams(teamsData || []);
      setProjects(projectsData || []);
      setSubjects(subjectsData || []);
    } catch (error: any) {
      console.error('Error fetching filter options:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...submissions];

    // Search filter
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (sub) =>
          sub.file_name.toLowerCase().includes(searchLower) ||
          sub.teams?.name.toLowerCase().includes(searchLower) ||
          sub.projects?.title.toLowerCase().includes(searchLower) ||
          sub.subjects?.code.toLowerCase().includes(searchLower) ||
          sub.profiles?.full_name.toLowerCase().includes(searchLower) ||
          sub.profiles?.email.toLowerCase().includes(searchLower)
      );
    }

    // Team filter
    if (filterTeam !== 'all') {
      filtered = filtered.filter((sub) => sub.team_id === filterTeam);
    }

    // Project filter
    if (filterProject !== 'all') {
      filtered = filtered.filter((sub) => sub.project_id === filterProject);
    }

    // Subject filter
    if (filterSubject !== 'all') {
      filtered = filtered.filter((sub) => sub.subject_id === filterSubject);
    }

    setFilteredSubmissions(filtered);
  };

  const handleDownload = async (submission: Submission) => {
    try {
      setDownloadingId(submission.id);
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
        toast.success(`Downloaded ${submission.file_name}`);
      }
    } catch (error: any) {
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    setFilterTeam('all');
    setFilterProject('all');
    setFilterSubject('all');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Student Submissions</h2>
        <p className="text-sm text-white/60">View and download files submitted by student teams</p>
      </div>

      {/* Filters */}
      <Card className="rounded-3xl border border-white/10 bg-black/70 text-white/80">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
            {(searchTerm || filterTeam !== 'all' || filterProject !== 'all' || filterSubject !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-white/60 hover:text-white"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
                <Input
                  placeholder="Search files, teams, projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-black/50 border-white/20 text-white pl-10"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Team</label>
              <Select value={filterTeam} onValueChange={setFilterTeam}>
                <SelectTrigger className="bg-black/50 border-white/20 text-white">
                  <SelectValue placeholder="All teams" />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/20">
                  <SelectItem value="all" className="text-white">All teams</SelectItem>
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id} className="text-white">
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Project</label>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="bg-black/50 border-white/20 text-white">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/20">
                  <SelectItem value="all" className="text-white">All projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id} className="text-white">
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-white/80">Subject</label>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="bg-black/50 border-white/20 text-white">
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/20">
                  <SelectItem value="all" className="text-white">All subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id} className="text-white">
                      {subject.code} - {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/60">
          Showing <span className="font-semibold text-white">{filteredSubmissions.length}</span> of{' '}
          <span className="font-semibold text-white">{submissions.length}</span> submissions
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={fetchSubmissions}
          className="gap-2 rounded-full border border-sky-400/60 bg-sky-500/20 px-4 text-sky-100 transition hover:bg-sky-500/50 hover:text-white focus-visible:ring-sky-300"
        >
          Refresh
        </Button>
      </div>

      {/* Submissions List */}
      {filteredSubmissions.length === 0 ? (
        <Alert className="border border-white/10 bg-black/60 text-white/70">
          <FolderOpen className="h-4 w-4 text-sky-400" />
          <AlertDescription className="text-white/70">
            {submissions.length === 0
              ? 'No submissions found. Submissions will appear here once students upload files.'
              : 'No submissions match your filters. Try adjusting your search criteria.'}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-4">
          {filteredSubmissions.map((submission) => (
            <Card
              key={submission.id}
              className="rounded-3xl border border-white/10 bg-black/70 text-white/80 shadow-[0_25px_65px_-40px_rgba(56,189,248,0.45)] transition-all duration-300 hover:border-sky-400/50"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="rounded-lg bg-sky-500/20 p-3">
                        <FileText className="h-5 w-5 text-sky-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-white mb-1">{submission.file_name}</h3>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-white/60">
                          <Badge variant="outline" className="border-white/20 bg-white/5 text-white/70">
                            {submission.file_type === 'application/pdf' ? 'PDF' : 'ZIP'}
                          </Badge>
                          <span>{formatFileSize(submission.file_size)}</span>
                          {submission.team_acknowledgment && (
                            <div className="flex items-center gap-1 text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" />
                              <span className="text-xs">Team Acknowledged</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4 text-sm">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-white/40" />
                        <div>
                          <p className="text-white/40 text-xs">Team</p>
                          <p className="text-white font-medium">{submission.teams?.name || 'Unknown'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-white/40" />
                        <div>
                          <p className="text-white/40 text-xs">Project</p>
                          <p className="text-white font-medium line-clamp-1">
                            {submission.projects?.title || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      {submission.subjects && (
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="border-white/20 bg-white/5 text-white/70 text-xs">
                            {submission.subjects.code}
                          </Badge>
                          <div>
                            <p className="text-white/40 text-xs">Subject</p>
                            <p className="text-white font-medium line-clamp-1">{submission.subjects.name}</p>
                          </div>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-white/40" />
                        <div>
                          <p className="text-white/40 text-xs">Submitted</p>
                          <p className="text-white font-medium">{formatDate(submission.created_at)}</p>
                        </div>
                      </div>
                    </div>

                    {submission.profiles && (
                      <div className="pt-2 border-t border-white/10">
                        <p className="text-xs text-white/50">
                          Submitted by: <span className="text-white/70">{submission.profiles.full_name}</span> (
                          {submission.profiles.email})
                        </p>
                      </div>
                    )}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(submission)}
                    disabled={downloadingId === submission.id}
                    className="shrink-0 gap-2 rounded-full border border-sky-400/60 bg-sky-500/20 px-4 text-sky-100 transition hover:bg-sky-500/50 hover:text-white focus-visible:ring-sky-300"
                  >
                    {downloadingId === submission.id ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

