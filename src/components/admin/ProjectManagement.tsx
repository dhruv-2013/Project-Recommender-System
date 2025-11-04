import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Archive, Eye } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export const ProjectManagement = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty_level: '',
    estimated_duration: '',
    capacity: 1,
    team_size_min: 1,
    team_size_max: 1,
    assessor_ids: [] as string[],
    required_skills: [] as string[],
    preferred_skills: [] as string[],
    learning_outcomes: [] as string[],
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });

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

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.estimated_duration) {
      toast({
        title: "Error",
        description: "Title, description, and estimated duration are required",
        variant: "destructive"
      });
      return;
    }

    const projectData = {
      ...formData,
      required_skills: formData.required_skills.filter(s => s.trim()),
      preferred_skills: formData.preferred_skills.filter(s => s.trim()),
      learning_outcomes: formData.learning_outcomes.filter(s => s.trim())
    };

    let error;
    if (editingProject) {
      ({ error } = await supabase
        .from('projects')
        .update(projectData)
        .eq('id', editingProject.id));
    } else {
      ({ error } = await supabase
        .from('projects')
        .insert(projectData));
    }

    if (error) {
      toast({
        title: "Error",
        description: `Failed to ${editingProject ? 'update' : 'create'} project`,
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: `Project ${editingProject ? 'updated' : 'created'} successfully`
      });
      resetForm();
      setIsDialogOpen(false);
      fetchProjects();
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: '',
      difficulty_level: '',
      estimated_duration: '',
      capacity: 1,
      team_size_min: 1,
      team_size_max: 1,
      assessor_ids: [],
      required_skills: [],
      preferred_skills: [],
      learning_outcomes: [],
    });
    setEditingProject(null);
  };

  const handleEdit = (project: any) => {
    setEditingProject(project);
    setFormData({
      title: project.title,
      description: project.description,
      category: project.category,
      difficulty_level: project.difficulty_level,
      estimated_duration: project.estimated_duration || '',
      capacity: project.capacity,
      team_size_min: project.team_size_min || 1,
      team_size_max: project.team_size_max || 1,
      assessor_ids: (project.assessor_ids || []),
      required_skills: project.required_skills || [],
      preferred_skills: project.preferred_skills || [],
      learning_outcomes: project.learning_outcomes || [],
    });
    setIsDialogOpen(true);
  };

  const handleArchive = async (projectId: string) => {
    const { error } = await supabase
      .from('projects')
      .update({ archived: true })
      .eq('id', projectId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to archive project",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Project archived successfully"
      });
      fetchProjects();
    }
  };

  const handleSkillAdd = (type: 'required_skills' | 'preferred_skills' | 'learning_outcomes', value: string) => {
    if (value.trim()) {
      setFormData(prev => ({
        ...prev,
        [type]: [...prev[type], value.trim()]
      }));
    }
  };

  const handleSkillRemove = (type: 'required_skills' | 'preferred_skills' | 'learning_outcomes', index: number) => {
    setFormData(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  };

  if (loading) {
    return <div>Loading projects...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Project Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="w-4 h-4 mr-2" />
              Create Project
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingProject ? 'Edit Project' : 'Create New Project'}
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Project title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Project description"
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="estimated_duration">Estimated Duration</Label>
                <Input
                  id="estimated_duration"
                  value={formData.estimated_duration}
                  onChange={(e) => setFormData(prev => ({ ...prev, estimated_duration: e.target.value }))}
                  placeholder="e.g., 4 weeks, 2 months"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Web Development">Web Development</SelectItem>
                      <SelectItem value="Mobile Development">Mobile Development</SelectItem>
                      <SelectItem value="Data Science">Data Science</SelectItem>
                      <SelectItem value="AI/ML">AI/ML</SelectItem>
                      <SelectItem value="DevOps">DevOps</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select value={formData.difficulty_level} onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty_level: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Beginner">Beginner</SelectItem>
                      <SelectItem value="Intermediate">Intermediate</SelectItem>
                      <SelectItem value="Advanced">Advanced</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="capacity">Capacity (Number of Teams)</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="team-min">Min Team Size</Label>
                  <Input
                    id="team-min"
                    type="number"
                    min="1"
                    value={formData.team_size_min}
                    onChange={(e) => setFormData(prev => ({ ...prev, team_size_min: parseInt(e.target.value) || 1 }))}
                  />
                </div>

                <div>
                  <Label htmlFor="team-max">Max Team Size</Label>
                  <Input
                    id="team-max"
                    type="number"
                    min="1"
                    value={formData.team_size_max}
                    onChange={(e) => setFormData(prev => ({ ...prev, team_size_max: parseInt(e.target.value) || 1 }))}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="assessors">Assessor Emails (comma-separated)</Label>
                <Input
                  id="assessors"
                  value={formData.assessor_ids.join(', ')}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    assessor_ids: e.target.value.split(',').map(email => email.trim()).filter(email => email)
                  }))}
                  placeholder="assessor1@unsw.edu.au, assessor2@unsw.edu.au"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingProject ? 'Update' : 'Create'} Project
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {projects.map((project) => (
          <Card key={project.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    {project.title}
                    {project.archived && <Badge variant="secondary">Archived</Badge>}
                  </CardTitle>
                  <p className="text-muted-foreground mt-2">{project.description}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(project)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  {!project.archived && (
                    <Button variant="outline" size="sm" onClick={() => handleArchive(project.id)}>
                      <Archive className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="font-medium">Category:</span> {project.category}
                </div>
                <div>
                  <span className="font-medium">Difficulty:</span> {project.difficulty_level}
                </div>
                <div>
                  <span className="font-medium">Capacity:</span> {project.capacity}
                </div>
                <div>
                  <span className="font-medium">Team Size:</span> {project.team_size_min}-{project.team_size_max}
                </div>
              </div>
              {project.estimated_duration && (
                <div className="mt-2 text-sm">
                  <span className="font-medium">Duration:</span> {project.estimated_duration}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};