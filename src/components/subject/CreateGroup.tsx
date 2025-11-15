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
    <Card className="rounded-3xl border border-white/10 bg-black/70 text-white/80 shadow-[0_25px_65px_-40px_rgba(56,189,248,0.55)]">
      <CardHeader>
        <CardTitle className="text-white">Create a Team</CardTitle>
        <CardDescription className="text-white/55">
          Form a team for {subjectCode} and add students from the Partners tab
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleCreateTeam} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="teamName" className="text-white/70">
              Team Name *
            </Label>
            <Input
              id="teamName"
              placeholder="e.g., Code Crusaders"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              required
              className="rounded-xl border-white/15 bg-black/40 text-white placeholder:text-white/40 focus-visible:ring-0"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description" className="text-white/70">
              Description
            </Label>
            <Textarea
              id="description"
              placeholder="What is your team about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="rounded-xl border-white/15 bg-black/40 text-white placeholder:text-white/40 focus-visible:ring-0"
            />
          </div>

          {selectedPartners.length > 0 && (
            <div className="space-y-2">
              <Label className="text-white/70">
                Selected Team Members ({selectedPartners.length})
              </Label>
              <div className="max-h-64 space-y-2 overflow-y-auto">
                {selectedPartners.map((partner) => (
                  <div
                    key={partner.user_id}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/50 p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-white">
                        {partner.profiles?.full_name || "Anonymous"}
                      </div>
                      <div className="text-sm text-white/50">
                        {partner.profiles?.email}
                      </div>
                      {partner.skills && partner.skills.length > 0 && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {partner.skills.slice(0, 3).map((skill: string) => (
                            <Badge key={skill} variant="secondary" className="bg-white/10 text-white/70">
                              {skill}
                            </Badge>
                          ))}
                          {partner.skills.length > 3 && (
                            <Badge variant="secondary" className="bg-white/10 text-white/70">
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
                      className="text-white/60 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-white/10 bg-black/50 p-4">
            <div className="flex items-start gap-3">
              <Users className="mt-0.5 h-5 w-5 text-sky-400" />
              <div className="text-sm">
                <p className="mb-1 font-medium text-white">Team Summary:</p>
                <p className="text-white/55">
                  Total members: {selectedPartners.length + 1} (You + {selectedPartners.length} selected partner
                  {selectedPartners.length !== 1 ? "s" : ""})
                </p>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-sky-500 text-white hover:bg-sky-400"
          >
            {loading ? "Creating..." : "Create Team"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}