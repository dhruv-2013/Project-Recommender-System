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
import { Plus, Edit, Archive, Eye, Upload, FileText } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';

export const ProjectManagement = () => {
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvProgress, setCsvProgress] = useState(0);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    difficulty_level: '',
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
    if (!formData.title || !formData.description) {
      toast({
        title: "Error",
        description: "Title and description are required",
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

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Error",
        description: "Please upload a CSV file",
        variant: "destructive"
      });
      return;
    }

    setCsvUploading(true);
    setCsvProgress(0);

    try {
      // Read CSV file
      const csvContent = await file.text();
      
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("Not authenticated");
      }

      // Get Supabase URL and anon key
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Call the edge function
      setCsvProgress(30);
      const response = await fetch(`${supabaseUrl}/functions/v1/import-projects-csv`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': supabaseAnonKey,
        },
        body: JSON.stringify({
          csvContent,
          authToken: session.access_token,
        }),
      });

      setCsvProgress(70);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to import projects');
      }

      setCsvProgress(100);

      toast({
        title: "Import Complete",
        description: `Successfully imported ${result.success} projects. ${result.failed > 0 ? `${result.failed} failed.` : ''}`,
      });

      if (result.errors && result.errors.length > 0) {
        console.error('Import errors:', result.errors);
      }

      // Refresh projects list
      await fetchProjects();
      setIsCsvDialogOpen(false);
      
      // Reset file input
      event.target.value = '';
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import projects from CSV",
        variant: "destructive"
      });
    } finally {
      setCsvUploading(false);
      setCsvProgress(0);
    }
  };

  if (loading) {
    return <div>Loading projects...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Project Management
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Create, edit, and manage all projects
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
                              <DialogTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <Upload className="w-4 h-4" />
                        Import CSV
                      </Button>
                    </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Projects from CSV</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="csv-file">CSV File</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Upload a CSV file with project details. Each row will be processed using AI to extract project information.
                  </p>
                  <Input
                    id="csv-file"
                    type="file"
                    accept=".csv"
                    onChange={handleCsvUpload}
                    disabled={csvUploading}
                  />
                </div>
                {csvUploading && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Processing CSV...</span>
                      <span>{csvProgress}%</span>
                    </div>
                    <Progress value={csvProgress} />
                  </div>
                )}
                <div className="text-sm text-muted-foreground space-y-1">
                  <p className="font-medium">CSV Format:</p>
                  <p>Your CSV can include columns like: project name, description, skills, category, capacity, team size, etc.</p>
                  <p>The AI will automatically extract and structure the information.</p>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                              <DialogTrigger asChild>
                      <Button onClick={resetForm} className="gap-2 bg-gradient-to-r from-primary to-accent hover:shadow-lg hover:shadow-primary/30">
                        <Plus className="w-4 h-4" />
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
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projects.map((project) => (
          <Card 
            key={project.id} 
            className="relative overflow-hidden border-2 hover:border-primary/50 transition-all duration-300 hover:shadow-lg group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader className="relative">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <CardTitle className="flex items-center gap-2 mb-2 text-lg">
                    <span className="truncate">{project.title}</span>
                    {project.archived && (
                      <Badge variant="secondary" className="shrink-0">Archived</Badge>
                    )}
                    {project.published && !project.archived && (
                      <Badge className="shrink-0 bg-green-500">Published</Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {project.description}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEdit(project)}
                    className="hover:bg-primary/10 hover:border-primary/50"
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  {!project.archived && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleArchive(project.id)}
                      className="hover:bg-destructive/10 hover:border-destructive/50"
                    >
                      <Archive className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="relative">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Category</div>
                  <div className="font-semibold">{project.category || 'N/A'}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Difficulty</div>
                  <div className="font-semibold capitalize">{project.difficulty_level || 'N/A'}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Capacity</div>
                  <div className="font-semibold">{project.capacity}</div>
                </div>
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="text-xs text-muted-foreground mb-1">Team Size</div>
                  <div className="font-semibold">{project.team_size_min}-{project.team_size_max}</div>
                </div>
              </div>
              {(project.required_skills && project.required_skills.length > 0) && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {project.required_skills.slice(0, 3).map((skill: string, idx: number) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                  {project.required_skills.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{project.required_skills.length - 3} more
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};