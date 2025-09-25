import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { X, Plus } from 'lucide-react';

export const CreateTeam = () => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    inviteEmails: [] as string[]
  });
  const [emailInput, setEmailInput] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const addEmail = () => {
    const email = emailInput.trim();
    if (email && email.includes('@') && !formData.inviteEmails.includes(email)) {
      setFormData(prev => ({
        ...prev,
        inviteEmails: [...prev.inviteEmails, email]
      }));
      setEmailInput('');
    }
  };

  const removeEmail = (emailToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      inviteEmails: prev.inviteEmails.filter(email => email !== emailToRemove)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Team name is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Create the team
      const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({
          name: formData.name,
          description: formData.description || null,
          created_by: user.id
        })
        .select()
        .single();

      if (teamError) throw teamError;

      // Add creator as team member
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: team.id,
          user_id: user.id,
          role: 'creator'
        });

      if (memberError) throw memberError;

      // Send invitations
      if (formData.inviteEmails.length > 0) {
        const invitations = formData.inviteEmails.map(email => ({
          team_id: team.id,
          email,
          invited_by: user.id
        }));

        const { error: inviteError } = await supabase
          .from('team_invitations')
          .insert(invitations);

        if (inviteError) throw inviteError;
      }

      toast({
        title: "Success",
        description: `Team "${formData.name}" created successfully!`
      });

      // Reset form
      setFormData({
        name: '',
        description: '',
        inviteEmails: []
      });
    } catch (error) {
      console.error('Error creating team:', error);
      toast({
        title: "Error",
        description: "Failed to create team",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create New Team</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="team-name">Team Name *</Label>
            <Input
              id="team-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter team name"
              required
            />
          </div>

          <div>
            <Label htmlFor="team-description">Description (Optional)</Label>
            <Textarea
              id="team-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe your team's goals or focus..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="invite-email">Invite Team Members</Label>
            <div className="flex gap-2 mb-2">
              <Input
                id="invite-email"
                type="email"
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="Enter email address"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addEmail();
                  }
                }}
              />
              <Button type="button" onClick={addEmail} variant="outline">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            {formData.inviteEmails.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.inviteEmails.map((email) => (
                  <Badge key={email} variant="secondary" className="gap-1">
                    {email}
                    <button
                      type="button"
                      onClick={() => removeEmail(email)}
                      className="ml-1 hover:bg-destructive hover:text-destructive-foreground rounded-full"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              Add email addresses to send team invitations
            </p>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Creating Team...' : 'Create Team'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};