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

export const MarksManagement = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [applications, setApplications] = useState<any[]>([]);
  const [marks, setMarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchApplicationsAndMarks();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, title')
      .eq('published', true)
      .order('title');

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive"
      });
    } else {
      setProjects(data || []);
    }
    setLoading(false);
  };

  const fetchApplicationsAndMarks = async () => {
    // Fetch approved applications for the selected project
    const { data: appsData, error: appsError } = await supabase
      .from('applications')
      .select(`
        *,
        profiles:applicant_id (full_name, email)
      `)
      .eq('project_id', selectedProject)
      .eq('status', 'approved');

    if (appsError) {
      toast({
        title: "Error",
        description: "Failed to fetch applications",
        variant: "destructive"
      });
      return;
    }

    // Fetch existing marks for this project
    const { data: marksData, error: marksError } = await supabase
      .from('marks')
      .select('*')
      .eq('project_id', selectedProject);

    if (marksError) {
      toast({
        title: "Error",
        description: "Failed to fetch marks",
        variant: "destructive"
      });
      return;
    }

    setApplications(appsData || []);
    setMarks(marksData || []);
  };

  const handleMarkUpdate = async (userId: string, teamMark: number, individualAdjustment: number, feedback: string) => {
    const finalMark = teamMark + individualAdjustment;
    
    const existingMark = marks.find(m => m.user_id === userId && m.project_id === selectedProject);
    
    const markData = {
      project_id: selectedProject,
      user_id: userId,
      team_mark: teamMark,
      individual_adjustment: individualAdjustment,
      final_mark: finalMark,
      feedback: feedback || null
    };

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
      fetchApplicationsAndMarks();
    }
  };

  const handleReleaseGrades = async () => {
    const { error } = await supabase
      .from('marks')
      .update({ released: true })
      .eq('project_id', selectedProject);

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
      fetchApplicationsAndMarks();
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Marks Management</h2>
        {selectedProject && marks.length > 0 && (
          <Button onClick={handleReleaseGrades}>
            Release Grades
          </Button>
        )}
      </div>

      <div className="mb-6">
        <Label htmlFor="project-select">Select Project</Label>
        <Select value={selectedProject} onValueChange={setSelectedProject}>
          <SelectTrigger>
            <SelectValue placeholder="Choose a project to manage marks" />
          </SelectTrigger>
          <SelectContent>
            {projects.map((project) => (
              <SelectItem key={project.id} value={project.id}>
                {project.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProject && (
        <div className="space-y-4">
          {applications.map((application) => {
            const existingMark = marks.find(m => m.user_id === application.applicant_id);
            return (
              <MarkingCard
                key={application.id}
                application={application}
                existingMark={existingMark}
                onSave={handleMarkUpdate}
              />
            );
          })}

          {applications.length === 0 && (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No approved applications for this project.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const MarkingCard = ({ application, existingMark, onSave }: any) => {
  const [teamMark, setTeamMark] = useState(existingMark?.team_mark || 0);
  const [individualAdjustment, setIndividualAdjustment] = useState(existingMark?.individual_adjustment || 0);
  const [feedback, setFeedback] = useState(existingMark?.feedback || '');

  const finalMark = teamMark + individualAdjustment;

  const handleSave = () => {
    onSave(application.applicant_id, teamMark, individualAdjustment, feedback);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">
          {application.profiles?.full_name}
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {application.profiles?.email}
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <Label htmlFor="team-mark">Team Mark</Label>
            <Input
              id="team-mark"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={teamMark}
              onChange={(e) => setTeamMark(parseFloat(e.target.value) || 0)}
              placeholder="0.0"
            />
          </div>
          
          <div>
            <Label htmlFor="individual-adjustment">Individual Adjustment</Label>
            <Input
              id="individual-adjustment"
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
            <Label>Final Mark</Label>
            <div className="p-2 bg-muted rounded font-medium">
              {finalMark.toFixed(1)}
            </div>
          </div>
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