import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Upload, FileText, Download, AlertCircle, CheckCircle2, Loader2, Info } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  teams?: {
    name: string;
  };
  projects?: {
    title: string;
  };
}

interface StudentSubmissionsProps {
  subjectCode: string;
  userId: string;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/zip', 'application/x-zip-compressed'];

export const StudentSubmissions = ({ subjectCode, userId }: StudentSubmissionsProps) => {
  const [teams, setTeams] = useState<any[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [projects, setProjects] = useState<any[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [teamAcknowledgment, setTeamAcknowledgment] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [subjectId, setSubjectId] = useState<string | null>(null);

  useEffect(() => {
    fetchSubjectAndTeams();
  }, [subjectCode, userId]);

  useEffect(() => {
    if (selectedTeamId) {
      fetchProjectsForTeam();
      fetchSubmissions();
    }
  }, [selectedTeamId]);

  const fetchSubjectAndTeams = async () => {
    try {
      setLoading(true);
      
      // Get subject ID
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('id')
        .eq('code', subjectCode)
        .single();

      if (subjectError) throw subjectError;
      if (subjectData) {
        setSubjectId(subjectData.id);
      }

      // Get teams where user is a member
      const { data: teamMembers, error: membersError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          teams (
            id,
            name,
            description
          )
        `)
        .eq('user_id', userId);

      if (membersError) throw membersError;

      const userTeams = (teamMembers || [])
        .map((tm: any) => tm.teams)
        .filter(Boolean);
      
      setTeams(userTeams);

      if (userTeams.length > 0) {
        setSelectedTeamId(userTeams[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching teams:', error);
      toast.error('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectsForTeam = async () => {
    try {
      // Get projects that the team has applied to or is working on
      const { data: applications, error: appsError } = await supabase
        .from('applications')
        .select('project_id, status, projects(*)')
        .eq('applicant_id', selectedTeamId)
        .eq('applicant_type', 'team')
        .in('status', ['approved', 'pending']);

      if (appsError) throw appsError;

      const projectList = (applications || [])
        .map((app: any) => app.projects)
        .filter(Boolean);
      
      setProjects(projectList);

      if (projectList.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projectList[0].id);
      }
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchSubmissions = async () => {
    try {
      if (!selectedTeamId || !subjectId) return;

      const { data, error } = await supabase
        .from('submissions')
        .select(`
          *,
          teams:team_id (name),
          projects:project_id (title)
        `)
        .eq('team_id', selectedTeamId)
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubmissions((data || []) as Submission[]);
    } catch (error: any) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to load submissions');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(selectedFile.type)) {
      toast.error('Only PDF and ZIP files are allowed');
      return;
    }

    // Validate file size
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast.error(`File size must be less than 50MB. Current size: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB`);
      return;
    }

    setFile(selectedFile);
  };

  const handleSubmit = async () => {
    if (!file) {
      toast.error('Please select a file');
      return;
    }

    if (!selectedTeamId) {
      toast.error('Please select a team');
      return;
    }

    if (!selectedProjectId) {
      toast.error('Please select a project');
      return;
    }

    if (!teamAcknowledgment) {
      toast.error('Please acknowledge that other team members agree to this submission');
      return;
    }

    if (!subjectId) {
      toast.error('Subject not found');
      return;
    }

    try {
      setUploading(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('You must be logged in');
        return;
      }

      // Upload file to storage
      const filePath = `${selectedTeamId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from('submissions')
        .upload(filePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      // Create submission record
      const { error: insertError } = await supabase
        .from('submissions')
        .insert({
          team_id: selectedTeamId,
          project_id: selectedProjectId,
          subject_id: subjectId,
          submitted_by: user.id,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          file_type: file.type,
          team_acknowledgment: teamAcknowledgment,
        });

      if (insertError) {
        // If insert fails, try to delete the uploaded file
        await supabase.storage.from('submissions').remove([filePath]);
        throw insertError;
      }

      toast.success('Submission uploaded successfully!');
      setFile(null);
      setTeamAcknowledgment(false);
      
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      fetchSubmissions();
    } catch (error: any) {
      console.error('Error submitting file:', error);
      toast.error(error.message || 'Failed to submit file');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (submission: Submission) => {
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
      console.error('Error downloading file:', error);
      toast.error('Failed to download file');
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      </div>
    );
  }

  if (teams.length === 0) {
    return (
      <Alert className="border border-white/10 bg-black/60 text-white/70">
        <AlertCircle className="h-4 w-4 text-amber-400" />
        <AlertDescription className="text-white/70">
          You need to be part of a team to submit files. Create or join a team first.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6 text-white">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Project Submissions</h2>
        <p className="text-sm text-white/60">Upload PDF or ZIP files (max 50MB) for your team projects</p>
      </div>

      {/* Upload Section */}
      <Card className="rounded-3xl border border-white/10 bg-black/70 text-white/80 shadow-[0_25px_65px_-40px_rgba(56,189,248,0.45)]">
        <CardHeader>
          <CardTitle className="text-xl text-white">Upload Submission</CardTitle>
          <CardDescription className="text-white/55">
            Select your team and project, then upload your submission file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="team-select" className="text-white/80">Team</Label>
              <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                <SelectTrigger id="team-select" className="bg-black/50 border-white/20 text-white">
                  <SelectValue placeholder="Select a team" />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/20">
                  {teams.map((team) => (
                    <SelectItem key={team.id} value={team.id} className="text-white">
                      {team.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="project-select" className="text-white/80">Project</Label>
              <Select 
                value={selectedProjectId} 
                onValueChange={setSelectedProjectId}
                disabled={projects.length === 0}
              >
                <SelectTrigger id="project-select" className="bg-black/50 border-white/20 text-white">
                  <SelectValue placeholder={projects.length === 0 ? "No projects available" : "Select a project"} />
                </SelectTrigger>
                <SelectContent className="bg-black border-white/20">
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id} className="text-white">
                      {project.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file-input" className="text-white/80">File (PDF or ZIP, max 50MB)</Label>
            <div className="flex items-center gap-4">
              <Input
                id="file-input"
                type="file"
                accept=".pdf,.zip"
                onChange={handleFileChange}
                className="bg-black/50 border-white/20 text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-sky-500/20 file:text-sky-300 hover:file:bg-sky-500/30"
              />
            </div>
            {file && (
              <div className="flex items-center gap-2 text-sm text-white/70 mt-2">
                <FileText className="h-4 w-4" />
                <span>{file.name}</span>
                <span className="text-white/50">({formatFileSize(file.size)})</span>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="acknowledgment"
              checked={teamAcknowledgment}
              onCheckedChange={(checked) => setTeamAcknowledgment(checked === true)}
              className="border-white/30 data-[state=checked]:bg-sky-500 data-[state=checked]:border-sky-500"
            />
            <Label
              htmlFor="acknowledgment"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-white/80 cursor-pointer"
            >
              I confirm that all team members agree to this submission
            </Label>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!file || !selectedTeamId || !selectedProjectId || !teamAcknowledgment || uploading}
            className="w-full bg-sky-500 hover:bg-sky-600 text-white"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Submit File
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Submissions List */}
      {submissions.length > 0 && (
        <Card className="rounded-3xl border border-white/10 bg-black/70 text-white/80">
          <CardHeader>
            <CardTitle className="text-xl text-white">Previous Submissions</CardTitle>
            <CardDescription className="text-white/55">
              View and download your team's previous submissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {submissions.map((submission) => (
                <div
                  key={submission.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/50 p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <FileText className="h-4 w-4 text-sky-400" />
                      <span className="font-medium text-white">{submission.file_name}</span>
                      {submission.team_acknowledgment && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" title="Team acknowledged" />
                      )}
                    </div>
                    <div className="text-sm text-white/60 space-y-1">
                      {submission.projects && (
                        <p>Project: {submission.projects.title}</p>
                      )}
                      <p>Size: {formatFileSize(submission.file_size)} • Uploaded: {new Date(submission.created_at).toLocaleString()}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDownload(submission)}
                    className="gap-2 rounded-full border border-sky-400/60 bg-sky-500/20 px-4 text-sky-100 transition hover:bg-sky-500/50 hover:text-white focus-visible:ring-sky-300"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {submissions.length === 0 && selectedTeamId && (
        <Alert className="border border-white/10 bg-black/60 text-white/70">
          <Info className="h-4 w-4 text-sky-400" />
          <AlertDescription className="text-white/70">
            No submissions yet. Upload your first submission above.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

