import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";

interface AddSkillsModalProps {
  userId: string;
  onSkillsUpdated?: () => void;
}

export function AddSkillsModal({ userId, onSkillsUpdated }: AddSkillsModalProps) {
  const [open, setOpen] = useState(false);
  const [skillName, setSkillName] = useState("");
  const [skillLevel, setSkillLevel] = useState("3");
  const [currentSkills, setCurrentSkills] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadCurrentSkills = async () => {
    const { data } = await supabase
      .from("user_skills")
      .select("*")
      .eq("user_id", userId);
    
    setCurrentSkills(data || []);
  };

  const handleAddSkill = async () => {
    if (!skillName.trim()) {
      toast.error("Please enter a skill name");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_skills")
        .insert({
          user_id: userId,
          skill_name: skillName.trim(),
          level: parseInt(skillLevel),
        });

      if (error) {
        if (error.code === "23505") {
          toast.error("You already have this skill added");
        } else {
          throw error;
        }
      } else {
        toast.success(`Added ${skillName}`);
        setSkillName("");
        setSkillLevel("3");
        await loadCurrentSkills();
        onSkillsUpdated?.();
      }
    } catch (error: any) {
      console.error("Error adding skill:", error);
      toast.error("Failed to add skill");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSkill = async (skillId: string, skillName: string) => {
    try {
      const { error } = await supabase
        .from("user_skills")
        .delete()
        .eq("id", skillId);

      if (error) throw error;

      toast.success(`Removed ${skillName}`);
      await loadCurrentSkills();
      onSkillsUpdated?.();
    } catch (error: any) {
      console.error("Error removing skill:", error);
      toast.error("Failed to remove skill");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (isOpen) loadCurrentSkills();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add/Manage Skills
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage Your Skills</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Add New Skill */}
          <div className="space-y-4">
            <h3 className="font-semibold">Add New Skill</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Label htmlFor="skill-name">Skill Name</Label>
                <Input
                  id="skill-name"
                  placeholder="e.g., Python, React, Machine Learning"
                  value={skillName}
                  onChange={(e) => setSkillName(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                />
              </div>
              <div>
                <Label htmlFor="skill-level">Level (1-5)</Label>
                <Select value={skillLevel} onValueChange={setSkillLevel}>
                  <SelectTrigger id="skill-level">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 - Beginner</SelectItem>
                    <SelectItem value="2">2 - Basic</SelectItem>
                    <SelectItem value="3">3 - Intermediate</SelectItem>
                    <SelectItem value="4">4 - Advanced</SelectItem>
                    <SelectItem value="5">5 - Expert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAddSkill} disabled={loading} className="w-full">
              <Plus className="h-4 w-4 mr-2" />
              Add Skill
            </Button>
          </div>

          {/* Current Skills */}
          <div className="space-y-4">
            <h3 className="font-semibold">Your Current Skills ({currentSkills.length})</h3>
            {currentSkills.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {currentSkills.map((skill) => (
                  <Badge key={skill.id} variant="secondary" className="text-sm py-2 px-3">
                    {skill.skill_name} (Level {skill.level})
                    <button
                      onClick={() => handleRemoveSkill(skill.id, skill.skill_name)}
                      className="ml-2 hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground italic">
                No skills added yet. Add your first skill above!
              </p>
            )}
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <p className="text-sm text-muted-foreground">
              <strong>Tip:</strong> Adding skills helps with team formation and project matching. 
              The level indicates your proficiency (1=Beginner, 5=Expert).
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}