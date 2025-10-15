import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Download } from 'lucide-react';

export const ExportData = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('id, title')
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

  const exportProjectData = async () => {
    if (!selectedProject) {
      toast({
        title: "Error",
        description: "Please select a project",
        variant: "destructive"
      });
      return;
    }

    try {
      // Fetch project data with applications and marks
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', selectedProject)
        .single();

      if (projectError) throw projectError;

      const { data: applicationsData, error: appsError } = await supabase
        .from('applications')
        .select(`
          *,
          profiles:applicant_id (full_name, email)
        `)
        .eq('project_id', selectedProject);

      if (appsError) throw appsError;

      const { data: marksData, error: marksError } = await supabase
        .from('marks')
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .eq('project_id', selectedProject);

      if (marksError) throw marksError;

      // Create CSV data
      const csvData = [];
      csvData.push(['Project', 'Student Name', 'Email', 'Application Status', 'Team Mark', 'Individual Adjustment', 'Final Mark', 'Feedback']);

      // Add rows for each application
      applicationsData.forEach((app: any) => {
        const mark = marksData?.find((m: any) => m.user_id === app.applicant_id);
        csvData.push([
          projectData.title,
          app.profiles?.full_name || 'N/A',
          app.profiles?.email || 'N/A',
          app.status,
          mark?.team_mark || '',
          mark?.individual_adjustment || '',
          mark?.final_mark || '',
          mark?.feedback || ''
        ]);
      });

      // Convert to CSV string
      const csvString = csvData.map(row => 
        row.map(field => `"${field}"`).join(',')
      ).join('\n');

      // Download CSV file
      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${projectData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_export.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Data exported successfully"
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export data",
        variant: "destructive"
      });
    }
  };

  const exportAllStudents = async () => {
    try {
      const { data: studentsData, error } = await supabase
        .from('student_profiles')
        .select(`
          *,
          user_skills (skill_name, level)
        `);

      if (error) throw error;

      const csvData = [];
      csvData.push(['Name', 'Email', 'University', 'Academic Level', 'Field of Study', 'Experience Level', 'Skills']);

      studentsData?.forEach((student: any) => {
        const skills = student.user_skills?.map((s: any) => `${s.skill_name} (${s.level})`).join('; ') || '';
        csvData.push([
          student.name,
          student.email,
          student.university,
          student.academic_level,
          student.field_of_study,
          student.experience_level,
          skills
        ]);
      });

      const csvString = csvData.map(row => 
        row.map(field => `"${field}"`).join(',')
      ).join('\n');

      const blob = new Blob([csvString], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'all_students_export.csv';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Student data exported successfully"
      });
    } catch (error) {
      console.error('Export error:', error);
      toast({
        title: "Error",
        description: "Failed to export student data",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Export Data</h2>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Export Project Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="project-select">Select Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project to export" />
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
            
            <Button onClick={exportProjectData} disabled={!selectedProject}>
              <Download className="w-4 h-4 mr-2" />
              Export Project CSV
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Export All Students</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Export all student profiles and their skills data.
            </p>
            <Button onClick={exportAllStudents}>
              <Download className="w-4 h-4 mr-2" />
              Export Students CSV
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};