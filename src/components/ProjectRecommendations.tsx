import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Users, Clock, ExternalLink, Star } from "lucide-react";

const mockProjects = [
  {
    id: 1,
    title: "AI-Powered Chatbot for Student Support",
    description: "Develop an intelligent chatbot using NLP to help students with academic queries and course recommendations.",
    matchScore: 92,
    requiredSkills: ["Python", "Natural Language Processing", "Machine Learning", "Flask", "React"],
    difficulty: "Intermediate",
    duration: "12 weeks",
    teamSize: 4,
    category: "Artificial Intelligence"
  },
  {
    id: 2,
    title: "Sustainable Campus Energy Management System",
    description: "Create an IoT-based system to monitor and optimize energy consumption across university buildings.",
    matchScore: 87,
    requiredSkills: ["IoT", "Data Analytics", "Python", "Sensor Networks", "Web Development"],
    difficulty: "Advanced",
    duration: "16 weeks",
    teamSize: 5,
    category: "Sustainability"
  },
  {
    id: 3,
    title: "Student Collaboration Platform",
    description: "Build a modern web platform that helps students find study groups, share resources, and collaborate on projects.",
    matchScore: 84,
    requiredSkills: ["React", "Node.js", "Database Design", "UI/UX", "Authentication"],
    difficulty: "Beginner",
    duration: "10 weeks",
    teamSize: 3,
    category: "Web Development"
  }
];

const ProjectRecommendations = () => {
  const getMatchColor = (score: number) => {
    if (score >= 90) return "text-success";
    if (score >= 80) return "text-primary";
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
          {mockProjects.map((project, index) => (
            <Card 
              key={project.id} 
              className="hover-lift shadow-card hover:shadow-glow transition-smooth animate-fade-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className={getDifficultyColor(project.difficulty)}>
                    {project.difficulty}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className={`font-bold ${getMatchColor(project.matchScore)}`}>
                      {project.matchScore}%
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
                    <span className={`text-sm font-bold ${getMatchColor(project.matchScore)}`}>
                      {project.matchScore}%
                    </span>
                  </div>
                  <Progress value={project.matchScore} className="h-2" />
                </div>

                {/* Project Details */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span>{project.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-muted-foreground" />
                    <span>{project.teamSize} members</span>
                  </div>
                </div>

                {/* Required Skills */}
                <div>
                  <span className="text-sm font-medium mb-2 block">Required Skills</span>
                  <div className="flex flex-wrap gap-1">
                    {project.requiredSkills.slice(0, 4).map((skill, skillIndex) => (
                      <Badge key={skillIndex} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {project.requiredSkills.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{project.requiredSkills.length - 4} more
                      </Badge>
                    )}
                  </div>
                </div>

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
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            Load More Projects
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProjectRecommendations;