import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

const Projects = () => {
  const [user, setUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [userSkills, setUserSkills] = useState<any[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate('/auth');
        return;
      }

      setUser(user);
      await Promise.all([fetchProjects(), fetchUserSkills(user.id)]);
      setLoading(false);
    };

    checkUser();
  }, [navigate]);

  const fetchProjects = async () => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('published', true)
      .eq('archived', false)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch projects",
        variant: "destructive"
      });
    } else {
      setProjects(data || []);
      setFilteredProjects(data || []);
    }
  };

  const fetchUserSkills = async (userId: string) => {
    const { data } = await supabase
      .from('user_skills')
      .select('*')
      .eq('user_id', userId);
    
    setUserSkills(data || []);
  };

  useEffect(() => {
    let filtered = projects;

    if (searchTerm) {
      filtered = filtered.filter(project => 
        project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        project.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(project => project.category === categoryFilter);
    }

    setFilteredProjects(filtered);
  }, [searchTerm, categoryFilter, projects]);

  const getSkillMatch = (project: any) => {
    const userSkillNames = userSkills.map(s => s.skill_name.toLowerCase());
    const requiredSkills = project.required_skills || [];
    const preferredSkills = project.preferred_skills || [];
    
    const matchedRequired = requiredSkills.filter((skill: string) => 
      userSkillNames.includes(skill.toLowerCase())
    );
    const matchedPreferred = preferredSkills.filter((skill: string) => 
      userSkillNames.includes(skill.toLowerCase())
    );

    return {
      matchedRequired,
      matchedPreferred,
      missingRequired: requiredSkills.filter((skill: string) => 
        !userSkillNames.includes(skill.toLowerCase())
      ),
      totalRequired: requiredSkills.length,
      matchPercentage: requiredSkills.length > 0 ? 
        Math.round((matchedRequired.length / requiredSkills.length) * 100) : 100
    };
  };

  const handleApply = async (projectId: string, applicationType: 'individual' | 'team') => {
    // For now, we'll implement individual applications
    // Team applications would require team selection
    if (applicationType === 'team') {
      toast({
        title: "Feature Coming Soon",
        description: "Team applications will be available soon",
        variant: "default"
      });
      return;
    }

    const { error } = await supabase
      .from('applications')
      .insert({
        project_id: projectId,
        applicant_type: 'individual',
        applicant_id: user.id
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to submit application",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Application submitted successfully",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Browse Projects</h1>
            <p className="text-muted-foreground">Find projects that match your skills</p>
          </div>
          <Button onClick={() => navigate('/')} variant="outline">
            Back to Home
          </Button>
        </div>

        <div className="flex gap-4 mb-8">
          <Input
            placeholder="Search projects..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="Web Development">Web Development</SelectItem>
              <SelectItem value="Mobile Development">Mobile Development</SelectItem>
              <SelectItem value="Data Science">Data Science</SelectItem>
              <SelectItem value="AI/ML">AI/ML</SelectItem>
              <SelectItem value="DevOps">DevOps</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-6">
          {filteredProjects.map((project) => {
            const skillMatch = getSkillMatch(project);
            return (
              <Card key={project.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-xl font-semibold mb-2">{project.title}</h3>
                    <p className="text-muted-foreground mb-4">{project.description}</p>
                  </div>
                  <Badge variant={skillMatch.matchPercentage >= 80 ? "default" : "secondary"}>
                    {skillMatch.matchPercentage}% Match
                  </Badge>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="font-medium mb-2">Required Skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {project.required_skills?.map((skill: string) => (
                        <Badge 
                          key={skill} 
                          variant={skillMatch.matchedRequired.includes(skill) ? "default" : "outline"}
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="font-medium mb-2">Preferred Skills:</p>
                    <div className="flex flex-wrap gap-2">
                      {project.preferred_skills?.map((skill: string) => (
                        <Badge 
                          key={skill} 
                          variant={skillMatch.matchedPreferred.includes(skill) ? "default" : "outline"}
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    <span>Capacity: {project.capacity}</span> • 
                    <span> Duration: {project.estimated_duration}</span> • 
                    <span> Level: {project.difficulty_level}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleApply(project.id, 'individual')}
                      size="sm"
                    >
                      Apply Individual
                    </Button>
                    <Button 
                      onClick={() => handleApply(project.id, 'team')}
                      variant="outline"
                      size="sm"
                    >
                      Apply as Team
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {filteredProjects.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">No projects found matching your criteria.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Projects;