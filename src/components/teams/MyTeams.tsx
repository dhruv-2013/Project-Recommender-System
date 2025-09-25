import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Crown } from 'lucide-react';

export const MyTeams = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMyTeams();
  }, []);

  const fetchMyTeams = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        teams:team_id (
          id,
          name,
          description,
          created_at,
          created_by
        )
      `)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch teams",
        variant: "destructive"
      });
    } else {
      // Fetch team members for each team
      const teamsWithMembers = await Promise.all(
        (data || []).map(async (teamMember) => {
          const { data: members } = await supabase
            .from('team_members')
            .select(`
              *,
              profiles:user_id (full_name, email)
            `)
            .eq('team_id', teamMember.teams.id);

          return {
            ...teamMember,
            teams: {
              ...teamMember.teams,
              members: members || []
            }
          };
        })
      );
      setTeams(teamsWithMembers);
    }
    setLoading(false);
  };

  const leaveTeam = async (teamId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('team_id', teamId)
      .eq('user_id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to leave team",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: "Left team successfully"
      });
      fetchMyTeams();
    }
  };

  if (loading) {
    return <div>Loading your teams...</div>;
  }

  return (
    <div>
      <div className="space-y-4">
        {teams.map((teamMember) => (
          <Card key={teamMember.teams.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    {teamMember.teams.name}
                    {teamMember.role === 'creator' && (
                      <Badge variant="default">
                        <Crown className="w-3 h-3 mr-1" />
                        Creator
                      </Badge>
                    )}
                  </CardTitle>
                  {teamMember.teams.description && (
                    <p className="text-muted-foreground mt-2">
                      {teamMember.teams.description}
                    </p>
                  )}
                </div>
                {teamMember.role !== 'creator' && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => leaveTeam(teamMember.teams.id)}
                  >
                    Leave Team
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium mb-2">Team Members ({teamMember.teams.members.length})</h4>
                  <div className="space-y-2">
                    {teamMember.teams.members.map((member: any) => (
                      <div key={member.id} className="flex items-center justify-between p-2 bg-muted rounded">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{member.profiles?.full_name}</span>
                          <span className="text-sm text-muted-foreground">{member.profiles?.email}</span>
                        </div>
                        <Badge variant={member.role === 'creator' ? 'default' : 'secondary'}>
                          {member.role}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Created {new Date(teamMember.teams.created_at).toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {teams.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">You're not part of any teams yet.</p>
          <p className="text-sm text-muted-foreground">Create a new team or wait for an invitation.</p>
        </div>
      )}
    </div>
  );
};