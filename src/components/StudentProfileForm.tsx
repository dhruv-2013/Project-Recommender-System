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

const AVAILABLE_COURSES = [
  { code: "COMP9444", name: "Neural Networks and Deep Learning" },
  { code: "COMP9417", name: "Machine Learning and Data Mining" },
  { code: "COMP9318", name: "Data Warehousing and Data Mining" },
  { code: "COMP9414", name: "Artificial Intelligence" },
  { code: "COMP9517", name: "Computer Vision" },
  { code: "COMP9334", name: "Capacity Planning of Computer Systems and Networks" },
  { code: "COMP9321", name: "Web Application Engineering" },
  { code: "COMP9313", name: "Big Data Management" },
  { code: "COMP9242", name: "Advanced Operating Systems" },
  { code: "COMP9243", name: "Distributed Systems" },
];

const StudentProfileForm = ({ onProfileCreated }: StudentProfileFormProps = {}) => {
  const [skills, setSkills] = useState<string[]>([]);
  const [interests, setInterests] = useState<string[]>([]);
  const [courses, setCourses] = useState<string[]>([]);
  const [currentSkill, setCurrentSkill] = useState("");
  const [currentInterest, setCurrentInterest] = useState("");
  const [courseSearch, setCourseSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    firstName: "",
    lastName: "",
    email: "",
    academicLevel: "",
    fieldOfStudy: "",
    wam: "",
    lab: "",
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
          const full = profile.full_name || "";
          const [fn = "", ...rest] = full.split(" ");
          const ln = rest.join(" ");
          setFormData(prev => ({
            ...prev,
            name: full,
            firstName: fn,
            lastName: ln,
            email: profile.email || user.email || "",
          }));
        }
      }
    };

    fetchUserData();
    // Load existing student profile for edit mode
    const loadExistingProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: existing } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (existing) {
        setIsEditing(true);
        const full = existing.name || "";
        const [fn = "", ...rest] = full.split(" ");
        const ln = rest.join(" ");
        setFormData(prev => ({
          ...prev,
          name: full || prev.name,
          firstName: fn || prev.firstName,
          lastName: ln || prev.lastName,
          email: existing.email || prev.email,
          academicLevel: existing.academic_level || "",
          fieldOfStudy: existing.field_of_study || "",
          wam: existing.wam != null ? String(existing.wam) : "",
          lab: existing.experience_level || "",
        }));
        setSkills(Array.isArray(existing.skills) ? existing.skills : []);
        setInterests(Array.isArray(existing.interests) ? existing.interests : []);
        setCourses(Array.isArray(existing.courses) ? existing.courses : []);
      }
    };
    void loadExistingProfile();
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

  const addCourse = (courseCode: string) => {
    if (!courses.includes(courseCode)) {
      setCourses([...courses, courseCode]);
      setCourseSearch("");
    }
  };

  const removeCourse = (courseToRemove: string) => {
    setCourses(courses.filter(course => course !== courseToRemove));
  };

  const filteredCourses = AVAILABLE_COURSES.filter(course => 
    !courses.includes(course.code) &&
    (course.code.toLowerCase().includes(courseSearch.toLowerCase()) ||
     course.name.toLowerCase().includes(courseSearch.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to create a profile");
      }

      const fullName = [formData.firstName, formData.lastName].filter(Boolean).join(" ");
      const profileData = {
        user_id: user.id,
        name: fullName || formData.name,
        email: formData.email,
        academic_level: formData.academicLevel,
        field_of_study: formData.fieldOfStudy,
        wam: formData.wam ? parseFloat(formData.wam) : null,
        skills: skills,
        interests: interests,
        courses: courses,
        // Store Lab selection in existing 'experience_level' string column
        experience_level: formData.lab || null,
      };

      let data: any = null;
      if (isEditing) {
        const { data: updated, error } = await supabase
          .from('student_profiles')
          .update(profileData)
          .eq('user_id', user.id)
          .select()
          .maybeSingle();
        if (error) throw error;
        data = updated;
      } else {
        const { data: created, error } = await supabase
          .from('student_profiles')
          .insert([profileData])
          .select()
          .single();
        if (error) throw error;
        data = created;
      }

      toast({
        title: isEditing ? "Profile updated successfully!" : "Profile created successfully!",
        description: isEditing ? "Your changes have been saved." : "Your profile has been saved. Now generating personalized project recommendations...",
      });

      // Notify parent immediately to allow closing modals or navigating away
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
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{isEditing ? 'Edit Your Profile' : 'Create Your Profile'}</h2>
            <p className="text-lg text-muted-foreground">
              {isEditing ? 'Update your details and preferences.' : 'Tell us about your skills and experience to get personalized project recommendations'}
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">First Name</label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      placeholder="e.g., Dhruv"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Last Name</label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      placeholder="e.g., Gulwani"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <Input value={formData.email} disabled />
                  </div>
                </div>

                {/* Academic Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Academic Level</label>
                    <Select value={formData.academicLevel} onValueChange={(value) => setFormData({ ...formData, academicLevel: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select your level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="undergraduate">Undergraduate</SelectItem>
                        <SelectItem value="masters">Master's</SelectItem>
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
                  <div>
                    <label className="block text-sm font-medium mb-2">WAM (Percentage)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={formData.wam}
                      onChange={(e) => setFormData({ ...formData, wam: e.target.value })}
                      placeholder="e.g., 85.5"
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

                {/* Lab Selection */}
                <div>
                  <label className="block text-sm font-medium mb-2">Lab</label>
                  <Select value={formData.lab} onValueChange={(value) => setFormData({ ...formData, lab: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select your lab" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lab1">Lab 1</SelectItem>
                      <SelectItem value="lab2">Lab 2</SelectItem>
                      <SelectItem value="lab3">Lab 3</SelectItem>
                      <SelectItem value="lab4">Lab 4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Courses */}
                <div>
                  <label className="block text-sm font-medium mb-2">Completed Courses</label>
                  <div className="relative mb-3">
                    <Input
                      value={courseSearch}
                      onChange={(e) => setCourseSearch(e.target.value)}
                      placeholder="Search for courses (e.g., COMP9444)"
                    />
                    {courseSearch && filteredCourses.length > 0 && (
                      <div className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-48 overflow-y-auto">
                        {filteredCourses.map((course) => (
                          <button
                            key={course.code}
                            type="button"
                            onClick={() => addCourse(course.code)}
                            className="w-full text-left px-4 py-2 hover:bg-accent transition-colors"
                          >
                            <div className="font-medium">{course.code}</div>
                            <div className="text-sm text-muted-foreground">{course.name}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  {/* Courses Display */}
                  <div className="flex flex-wrap gap-2 min-h-[2rem]">
                    {courses.map((courseCode, index) => {
                      const course = AVAILABLE_COURSES.find(c => c.code === courseCode);
                      return (
                        <Badge 
                          key={index} 
                          variant="secondary" 
                          className="flex items-center gap-1 px-3 py-1"
                        >
                          <span className="font-medium">{courseCode}</span>
                          <span className="text-xs">- {course?.name}</span>
                          <button
                            type="button"
                            onClick={() => removeCourse(courseCode)}
                            className="ml-1 hover:text-destructive transition-colors"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </Badge>
                      );
                    })}
                    {courses.length === 0 && (
                      <p className="text-muted-foreground text-sm italic">
                        No courses added yet. Search and select courses you've completed.
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
                        {isEditing ? 'Saving Changes...' : 'Creating Profile...'}
                      </>
                    ) : (
                      isEditing ? 'Save Changes' : 'Create Profile'
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