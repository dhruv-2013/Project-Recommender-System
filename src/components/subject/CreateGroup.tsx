import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users } from "lucide-react";

interface CreateGroupProps {
  subjectCode: string;
  userId: string;
}

export function CreateGroup({ subjectCode, userId }: CreateGroupProps) {
  const navigate = useNavigate();
  const [teamName, setTeamName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!teamName.trim()) {
      toast.error("Please enter a team name");
      return;
    }

    setLoading(true);

    try {
      // Create team
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: teamName,
          description: description || null,
          created_by: userId,
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add creator as team member
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: team.id,
          user_id: userId,
          role: "creator",
        });

      if (memberError) throw memberError;

      toast.success("Team created successfully!");
      navigate("/teams");
    } catch (error: any) {
      console.error("Error creating team:", error);
      toast.error(error.message || "Failed to create team");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create a Team</CardTitle>
        <CardDescription>
          Form a team for {subjectCode} and invite other students
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateTeam} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="teamName">Team Name *</Label>
            <Input
              id="teamName"
              placeholder="e.g., Code Crusaders"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What is your team about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Next Steps:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>After creating your team, you can invite members</li>
                  <li>Apply for projects as a team</li>
                  <li>Collaborate with your teammates</li>
                </ul>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : "Create Team"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
