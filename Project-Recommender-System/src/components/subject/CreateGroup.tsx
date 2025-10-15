import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Users, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface CreateGroupProps {
  subjectCode: string;
  userId: string;
  selectedPartners: any[];
  onRemovePartner: (partnerId: string) => void;
  onTeamCreated: () => void;
}

export function CreateGroup({ subjectCode, userId, selectedPartners, onRemovePartner, onTeamCreated }: CreateGroupProps) {
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
      // Get the current authenticated user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      
      if (!currentUser) {
        toast.error("You must be logged in to create a team");
        return;
      }

      console.log("Creating team with partners:", selectedPartners);
      console.log("Current user:", currentUser.id);

      // Create team
      const { data: team, error: teamError } = await supabase
        .from("teams")
        .insert({
          name: teamName,
          description: description || null,
          created_by: currentUser.id,
        })
        .select()
        .single();

      if (teamError) {
        console.error("Team creation error:", teamError);
        throw teamError;
      }

      console.log("Team created successfully:", team);

      // Prepare all members to insert at once (creator + partners)
      const allMembers = [
        {
          team_id: team.id,
          user_id: currentUser.id,
          role: "creator",
        },
        ...selectedPartners.map(partner => ({
          team_id: team.id,
          user_id: partner.user_id,
          role: "member",
        }))
      ];

      console.log("Inserting members:", allMembers);

      // Insert all members at once
      const { data: insertedMembers, error: membersError } = await supabase
        .from("team_members")
        .insert(allMembers)
        .select();

      if (membersError) {
        console.error("Members insertion error:", membersError);
        throw membersError;
      }

      console.log("Members inserted successfully:", insertedMembers);

      toast.success(`Team "${teamName}" created with ${allMembers.length} members!`);
      setTeamName("");
      setDescription("");
      onTeamCreated();
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

          {selectedPartners.length > 0 && (
            <div className="space-y-2">
              <Label>Selected Team Members ({selectedPartners.length})</Label>
              <div className="bg-muted p-4 rounded-lg space-y-2">
                {selectedPartners.map((partner) => (
                  <div key={partner.user_id} className="flex items-center justify-between bg-background p-3 rounded-md">
                    <div>
                      <p className="font-medium">{partner.profiles.full_name}</p>
                      <p className="text-sm text-muted-foreground">{partner.profiles.email}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemovePartner(partner.user_id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-muted p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Users className="h-5 w-5 text-primary mt-0.5" />
              <div className="text-sm">
                <p className="font-medium mb-1">Team Summary:</p>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Total members: {selectedPartners.length + 1} (including you)</li>
                  <li>After creating, you can apply for projects as a team</li>
                  <li>All members will be able to collaborate together</li>
                </ul>
              </div>
            </div>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Creating..." : `Create Team with ${selectedPartners.length + 1} Members`}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}