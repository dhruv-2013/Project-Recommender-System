import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X, User, FileText, Award, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface StudentProfileFormProps {
  onProfileCreated?: (profile: any) => void;
}

const StudentProfileForm = ({ onProfileCreated }: StudentProfileFormProps = {}) => {
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState("");
  const [currentInterest, setCurrentInterest] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    academicLevel: "",
    fieldOfStudy: "",
  });

  useEffect(() => {
    const fetchUserData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, email')
          .eq('user_id', user.id)
          .single();

        if (profile) {
          setFormData(prev => ({
            ...prev,
            name: profile.full_name || "",
            email: profile.email || user.email || "",
          }));
        }
      }
    };

    fetchUserData();
  }, []);

  const addSkill = () => {
    if (currentSkill.trim() && !skills.includes(currentSkill.trim())) {
      setSkills([...skills, currentSkill.trim()]);
      setCurrentSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter(skill => skill !== skillToRemove));
  };

  const addInterest = () => {
    if (currentInterest.trim() && !interests.includes(currentInterest.trim())) {
      setInterests([...interests, currentInterest.trim()]);
      setCurrentInterest("");
    }
  };

  const removeInterest = (interestToRemove: string) => {
    setInterests(interests.filter(interest => interest !== interestToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to create a profile");
      }

      const profileData = {
        user_id: user.id,
        name: formData.name,
        email: formData.email,
        academic_level: formData.academicLevel,
        field_of_study: formData.fieldOfStudy,
        skills: skills,
        interests: interests,
      };

      const { data, error } = await supabase
        .from('student_profiles')
        .insert([profileData])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Profile created successfully!",
        description: "Your profile has been saved. Now generating personalized project recommendations...",
      });

      onProfileCreated?.(data);
    } catch (error: any) {
      console.error('Error creating profile:', error);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
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
                {/* Basic Information - Hidden, pre-filled from auth */}
                <input type="hidden" name="name" value={formData.name} />
                <input type="hidden" name="email" value={formData.email} />

                {/* Academic Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Academic Level</label>
                    <Select value={formData.academicLevel} onValueChange={(value) => setFormData({ ...formData, academicLevel: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="undergraduate">Undergraduate</SelectItem>
                        <SelectItem value="graduate">Graduate</SelectItem>
                        <SelectItem value="masters">Master's</SelectItem>
                        <SelectItem value="phd">PhD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Field of Study</label>
                    <Input
                      value={formData.fieldOfStudy}
                      onChange={(e) => setFormData({ ...formData, fieldOfStudy: e.target.value })}
                      placeholder="e.g., Computer Science"
                      required
                    />
                  </div>
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

                {/* Interests */}
                <div>
                  <label className="block text-sm font-medium mb-2">Interests & Project Types</label>
                  <div className="flex gap-2 mb-3">
                    <Input
                      value={currentInterest}
                      onChange={(e) => setCurrentInterest(e.target.value)}
                      placeholder="Add an interest (e.g., AI, Web Development, IoT)"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addInterest())}
                    />
                    <Button type="button" onClick={addInterest} variant="outline" size="icon">
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {/* Interests Display */}
                  <div className="flex flex-wrap gap-2 min-h-[2rem]">
                    {interests.map((interest, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="flex items-center gap-1 px-3 py-1"
                      >
                        {interest}
                        <button
                          type="button"
                          onClick={() => removeInterest(interest)}
                          className="ml-1 hover:text-destructive transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                    {interests.length === 0 && (
                      <p className="text-muted-foreground text-sm italic">
                        No interests added yet. Start typing to add your first interest.
                      </p>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-4">
                  <Button type="submit" variant="gradient" className="flex-1" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Profile...
                      </>
                    ) : (
                      "Create Profile"
                    )}
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