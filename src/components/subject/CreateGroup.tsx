import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Users, X } from "lucide-react";

interface CreateGroupProps {
  subjectCode: string;
  userId: string;
  selectedPartners?: any[];
  onRemovePartner?: (partnerId: string) => void;
  onTeamCreated?: () => void;
}

export function CreateGroup({ subjectCode, userId, selectedPartners = [], onRemovePartner, onTeamCreated }: CreateGroupProps) {
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

      // Add selected partners as team members
      if (selectedPartners.length > 0) {
        const memberInserts = selectedPartners.map(partner => ({
          team_id: team.id,
          user_id: partner.user_id,
          role: "member",
        }));

        const { error: partnersError } = await supabase
          .from("team_members")
          .insert(memberInserts);

        if (partnersError) throw partnersError;
      }

      toast.success("Team created successfully!");
      
      // Reset form
      setTeamName("");
      setDescription("");
      
      // Notify parent to refresh
      onTeamCreated?.();
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
          Form a team for {subjectCode} and add students from the Partners tab
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
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {selectedPartners.map((partner) => (
                  <div key={partner.user_id} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="font-medium">
                        {partner.profiles?.full_name || "Anonymous"}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {partner.profiles?.email}
                      </div>
                      {partner.skills && partner.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {partner.skills.slice(0, 3).map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="text-xs">
                              {skill}
                            </Badge>
                          ))}
                          {partner.skills.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{partner.skills.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemovePartner?.(partner.user_id)}
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
                <p className="text-muted-foreground">
                  Total members: {selectedPartners.length + 1} (You + {selectedPartners.length} selected partner{selectedPartners.length !== 1 ? 's' : ''})
                </p>
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