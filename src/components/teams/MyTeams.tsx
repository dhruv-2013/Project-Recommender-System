import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Mail, Crown, Trash2, UserPlus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export const MyTeams = () => {
  const [teams, setTeams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const [inviteOpenForTeamId, setInviteOpenForTeamId] = useState<string | null>(null);
  const [inviteEmails, setInviteEmails] = useState<string>("");
  const [inviteLoading, setInviteLoading] = useState<boolean>(false);

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

  const deleteTeam = async (teamId: string, teamName: string) => {
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('id', teamId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete team',
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Deleted',
        description: `Team "${teamName}" was deleted`,
      });
      fetchMyTeams();
    }
  };

  const inviteMembers = async (teamId: string) => {
    setInviteLoading(true);
    const emails = inviteEmails
      .split(/[,\n]/)
      .map(e => e.trim())
      .filter(Boolean);
    if (emails.length === 0) {
      toast({ title: 'Error', description: 'Enter at least one email', variant: 'destructive' });
      setInviteLoading(false);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: 'Error', description: 'Not authenticated', variant: 'destructive' });
      setInviteLoading(false);
      return;
    }
    const invitations = emails.map(email => ({ team_id: teamId, email, invited_by: user.id }));
    const { error } = await supabase.from('team_invitations').insert(invitations);
    if (error) {
      toast({ title: 'Error', description: 'Failed to send invitations', variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: `Invited ${emails.length} member${emails.length>1?'s':''}` });
      setInviteEmails("");
      setInviteOpenForTeamId(null);
    }
    setInviteLoading(false);
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
                {teamMember.role !== 'creator' ? (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => leaveTeam(teamMember.teams.id)}
                  >
                    Leave Team
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Dialog open={inviteOpenForTeamId === teamMember.teams.id} onOpenChange={(open) => { if (!open) { setInviteOpenForTeamId(null); setInviteEmails(""); } }}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => setInviteOpenForTeamId(teamMember.teams.id)}>
                          <UserPlus className="w-4 h-4" />
                          Invite Members
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite members to "{teamMember.teams.name}"</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-2">
                          <Label htmlFor="emails">Emails</Label>
                          <Textarea id="emails" placeholder="Enter email addresses separated by commas or new lines" value={inviteEmails} onChange={(e) => setInviteEmails(e.target.value)} />
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => { setInviteOpenForTeamId(null); setInviteEmails(""); }}>Cancel</Button>
                          <Button disabled={inviteLoading} onClick={() => inviteMembers(teamMember.teams.id)}>{inviteLoading ? 'Sending...' : 'Send Invites'}</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="destructive" size="sm" className="gap-2">
                          <Trash2 className="w-4 h-4" />
                          Delete Team
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this team?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action will permanently delete the team and all memberships.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => deleteTeam(teamMember.teams.id, teamMember.teams.name)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
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