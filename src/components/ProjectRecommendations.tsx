import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Users, Clock, ExternalLink, Star, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProjectRecommendationsProps {
  userId: string;
  studentProfile: any;
}

const ProjectRecommendations = ({ userId, studentProfile }: ProjectRecommendationsProps) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjectsAndRecommendations();
  }, [userId, studentProfile]);

  const fetchProjectsAndRecommendations = async () => {
    try {
      setLoading(true);

      // First, try to get existing recommendations
      const { data: existingRecommendations, error: recError } = await supabase
        .from('project_recommendations')
        .select(`
          *,
          projects (*)
        `)
        .eq('user_id', userId)
        .order('match_score', { ascending: false });

      if (recError) throw recError;

      if (existingRecommendations && existingRecommendations.length > 0) {
        setRecommendations(existingRecommendations);
      } else {
        // Generate new recommendations
        await generateRecommendations();
      }
    } catch (error: any) {
      console.error('Error fetching recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to load project recommendations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateRecommendations = async () => {
    try {
      // Fetch all available projects
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*');

      if (projectsError) throw projectsError;

      // Simple matching algorithm based on skills overlap
      const recommendationsData = projectsData.map((project: any) => {
        const userSkills = studentProfile.skills || [];
        const projectSkills = [...(project.required_skills || []), ...(project.preferred_skills || [])];
        
        // Calculate skill match score
        const matchingSkills = userSkills.filter((skill: string) => 
          projectSkills.some((pSkill: string) => 
            pSkill.toLowerCase().includes(skill.toLowerCase()) || 
            skill.toLowerCase().includes(pSkill.toLowerCase())
          )
        );
        
        const skillMatchScore = matchingSkills.length / Math.max(projectSkills.length, 1);
        
        // Factor in difficulty level preference
        let difficultyBonus = 0;
        if (studentProfile.experience_level === 'beginner' && project.difficulty_level === 'Intermediate') difficultyBonus = 0.1;
        if (studentProfile.experience_level === 'intermediate' && project.difficulty_level === 'Intermediate') difficultyBonus = 0.2;
        if (studentProfile.experience_level === 'advanced' && project.difficulty_level === 'Advanced') difficultyBonus = 0.2;
        
        // Calculate final match score (0-1, then convert to percentage)
        const matchScore = Math.min(1, (skillMatchScore * 0.7) + difficultyBonus + 0.2);
        
        return {
          user_id: userId,
          project_id: project.id,
          match_score: parseFloat((matchScore).toFixed(2)),
          reasoning: `Matched ${matchingSkills.length} skills: ${matchingSkills.join(', ')}`,
          skill_match_details: {
            matching_skills: matchingSkills,
            total_project_skills: projectSkills.length,
            user_skills: userSkills
          }
        };
      }).filter(rec => rec.match_score > 0.3) // Only include decent matches
        .sort((a, b) => b.match_score - a.match_score)
        .slice(0, 6); // Top 6 recommendations

      // Save recommendations to database
      const { error: insertError } = await supabase
        .from('project_recommendations')
        .insert(recommendationsData);

      if (insertError) throw insertError;

      // Fetch the saved recommendations with project details
      const { data: savedRecommendations, error: fetchError } = await supabase
        .from('project_recommendations')
        .select(`
          *,
          projects (*)
        `)
        .eq('user_id', userId)
        .order('match_score', { ascending: false });

      if (fetchError) throw fetchError;

      setRecommendations(savedRecommendations);

      toast({
        title: "Recommendations Generated!",
        description: `Found ${savedRecommendations.length} matching projects for your profile.`,
      });

    } catch (error: any) {
      console.error('Error generating recommendations:', error);
      toast({
        title: "Error",
        description: "Failed to generate recommendations. Please try again.",
        variant: "destructive",
      });
    }
  };
  const getMatchColor = (score: number) => {
    if (score >= 0.8) return "text-success";
    if (score >= 0.6) return "text-primary";
    return "text-muted-foreground";
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner": return "bg-success/10 text-success border-success/20";
      case "Intermediate": return "bg-primary/10 text-primary border-primary/20";
      case "Advanced": return "bg-accent/10 text-accent border-accent/20";
      default: return "bg-muted text-muted-foreground";
    }
  };

  if (loading) {
    return (
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <h2 className="text-2xl font-bold mb-2">Generating Your Recommendations</h2>
            <p className="text-muted-foreground">
              Our AI is analyzing your profile to find the perfect projects...
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-20">
      <div className="container mx-auto px-6">
        <div className="text-center mb-12 animate-fade-up">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Recommended Projects</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Based on your skills and interests, here are the projects that best match your profile
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
          {recommendations.map((rec, index) => {
            const project = rec.projects;
            const matchPercentage = Math.round(rec.match_score * 100);
            return (
            <Card 
              key={rec.id} 
              className="hover-lift shadow-card hover:shadow-glow transition-smooth animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className={getDifficultyColor(project.difficulty_level)}>
                    {project.difficulty_level}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className={`font-bold ${getMatchColor(rec.match_score)}`}>
                      {matchPercentage}%
                    </span>
                  </div>
                </div>
                
                <CardTitle className="text-xl leading-tight">{project.title}</CardTitle>
                <CardDescription className="text-sm leading-relaxed">
                  {project.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Match Score */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Match Score</span>
                    <span className={`text-sm font-bold ${getMatchColor(rec.match_score)}`}>
                      {matchPercentage}%
                    </span>
                  </div>
                  <Progress value={matchPercentage} className="h-2" />
                </div>

                {/* Project Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{project.estimated_duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{project.team_size_min}-{project.team_size_max} members</span>
                  </div>
                </div>

                {/* Required Skills */}
                <div>
                  <span className="text-sm font-medium mb-2 block">Required Skills</span>
                  <div className="flex flex-wrap gap-1">
                    {(project.required_skills || []).slice(0, 4).map((skill: string, skillIndex: number) => (
                      <Badge key={skillIndex} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {(project.required_skills || []).length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{(project.required_skills || []).length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Match Reasoning */}
                {rec.reasoning && (
                  <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded">
                    <strong>Why this matches:</strong> {rec.reasoning}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button variant="gradient" className="flex-1" size="sm">
                    <Sparkles className="w-4 h-4 mr-1" />
                    Apply
                  </Button>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>

        {recommendations.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-semibold mb-2">No Recommendations Yet</h3>
            <p className="text-muted-foreground">
              We couldn't find any matching projects. Try updating your profile with more skills or interests.
            </p>
          </div>
        )}

        {recommendations.length > 0 && (
          <div className="text-center mt-12">
            <Button variant="outline" size="lg" onClick={generateRecommendations}>
              Refresh Recommendations
            </Button>
          </div>
        )}
      </div>
    </section>
  );
};

export default ProjectRecommendations;