import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, Check, X, Clock } from 'lucide-react';

export const TeamInvitations = () => {
  const [invitations, setInvitations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('team_invitations')
      .select(`
        *,
        teams:team_id (
          id,
          name,
          description
        ),
        inviter:invited_by (
          full_name,
          email
        )
      `)
      .eq('email', user.email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch invitations",
        variant: "destructive"
      });
    } else {
      setInvitations(data || []);
    }
    setLoading(false);
  };

  const respondToInvitation = async (invitationId: string, teamId: string, response: 'accepted' | 'declined') => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // Update invitation status
      const { error: inviteError } = await supabase
        .from('team_invitations')
        .update({ status: response })
        .eq('id', invitationId);

      if (inviteError) throw inviteError;

      // If accepted, add user to team
      if (response === 'accepted') {
        const { error: memberError } = await supabase
          .from('team_members')
          .insert({
            team_id: teamId,
            user_id: user.id,
            role: 'member'
          });

        if (memberError) throw memberError;
      }

      toast({
        title: "Success",
        description: `Invitation ${response} successfully`
      });

      fetchInvitations();
    } catch (error) {
      console.error('Error responding to invitation:', error);
      toast({
        title: "Error",
        description: `Failed to ${response} invitation`,
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return <div>Loading invitations...</div>;
  }

  return (
    <div>
      <div className="space-y-4">
        {invitations.map((invitation) => (
          <Card key={invitation.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Team Invitation: {invitation.teams.name}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Invited by {invitation.inviter?.full_name} ({invitation.inviter?.email})
                  </p>
                </div>
                <Badge variant="outline">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invitation.teams.description && (
                  <p className="text-muted-foreground">{invitation.teams.description}</p>
                )}
                
                <div className="text-sm text-muted-foreground">
                  Invited {new Date(invitation.created_at).toLocaleDateString()}
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => respondToInvitation(invitation.id, invitation.teams.id, 'accepted')}
                    size="sm"
                  >
                    <Check className="w-4 h-4 mr-1" />
                    Accept
                  </Button>
                  <Button
                    onClick={() => respondToInvitation(invitation.id, invitation.teams.id, 'declined')}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Decline
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {invitations.length === 0 && (
        <div className="text-center py-8">
          <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No pending team invitations.</p>
          <p className="text-sm text-muted-foreground">When someone invites you to a team, it will appear here.</p>
        </div>
      )}
    </div>
  );
};