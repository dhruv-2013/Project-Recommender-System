import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, User, FileText, Award } from "lucide-react";

const StudentProfileForm = () => {
  const [skills, setSkills] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    description: "",
    experience: "",
  });

  const addSkill = () => {
    if (currentSkill.trim() && !skills.includes(currentSkill.trim())) {
      setSkills([...skills, currentSkill.trim()]);
      setCurrentSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Form submitted! Profile data:", { ...formData, skills });
    alert("Profile created successfully! Check console for data.");
    // Here you would typically send the data to your backend
  };

  return (
    <section className="py-20 bg-gradient-subtle">
      <div className="container mx-auto px-6">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-12 animate-fade-up">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Create Your Profile</h2>
            <p className="text-lg text-muted-foreground">
              Tell us about your skills and experience to get personalized project recommendations
            </p>
          </div>

          <Card className="shadow-elegant hover:shadow-glow transition-smooth">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5 text-primary" />
                Student Information
              </CardTitle>
              <CardDescription>
                Provide your basic information and academic background
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Full Name</label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    About You
                  </label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Tell us about your academic background, interests, and goals..."
                    rows={4}
                  />
                </div>

                {/* Experience */}
                <div>
                  <label className="block text-sm font-medium mb-2 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    Previous Experience
                  </label>
                  <Textarea
                    value={formData.experience}
                    onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                    placeholder="Describe your previous projects, coursework, or relevant experience..."
                    rows={3}
                  />
                </div>

                {/* Skills */}
                <div>
                  <label className="block text-sm font-medium mb-2">Skills & Technologies</label>
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={currentSkill}
                      onChange={(e) => setCurrentSkill(e.target.value)}
                      placeholder="Add a skill (e.g., Python, React, Machine Learning)"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addSkill())}
                    />
                    <Button type="button" onClick={addSkill} variant="outline" size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Skills Display */}
                  <div className="flex flex-wrap gap-2 min-h-[2rem]">
                    {skills.map((skill, index) => (
                      <Badge 
                        key={index} 
                        variant="secondary" 
                        className="flex items-center gap-1 px-3 py-1"
                      >
                        {skill}
                        <button
                          type="button"
                          onClick={() => removeSkill(skill)}
                          className="ml-1 hover:text-destructive transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    {skills.length === 0 && (
                      <p className="text-muted-foreground text-sm italic">
                        No skills added yet. Start typing to add your first skill.
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-4">
                  <Button type="submit" variant="gradient" className="flex-1">
                    Create Profile
                  </Button>
                  <Button type="button" variant="outline">
                    Save Draft
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default StudentProfileForm;