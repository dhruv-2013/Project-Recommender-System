import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

export const AnnouncementManagement = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });
  const { toast } = useToast();
  const [authorMap, setAuthorMap] = useState<Record<string, { full_name: string }>>({});

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from('announcements')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch announcements",
        variant: "destructive"
      });
    } else {
      setAnnouncements(data || []);
      // fetch authors separately
      const ids = Array.from(new Set((data || []).map(a => a.created_by))).filter(Boolean);
      if (ids.length > 0) {
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', ids);
        const map: Record<string, { full_name: string }> = {};
        (profilesData || []).forEach((p: any) => { map[p.user_id] = { full_name: p.full_name }; });
        setAuthorMap(map);
      } else {
        setAuthorMap({});
      }
    }
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.content) {
      toast({
        title: "Error",
        description: "Title and content are required",
        variant: "destructive"
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    let error;
    if (editing) {
      ({ error } = await supabase
        .from('announcements')
        .update({
          title: formData.title,
          content: formData.content
        })
        .eq('id', editing.id));
    } else {
      ({ error } = await supabase
        .from('announcements')
        .insert({
          title: formData.title,
          content: formData.content,
          created_by: user.id
        }));
    }

    if (error) {
      toast({
        title: "Error",
        description: "Failed to create announcement",
        variant: "destructive"
      });
    } else {
      toast({
        title: "Success",
        description: editing ? "Announcement updated" : "Announcement created successfully"
      });
      setFormData({ title: '', content: '' });
      setEditing(null);
      setIsDialogOpen(false);
      fetchAnnouncements();
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormData({ title: '', content: '' });
    setIsDialogOpen(true);
  };

  const openEdit = (a: any) => {
    setEditing(a);
    setFormData({ title: a.title, content: a.content });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('announcements')
      .delete()
      .eq('id', id);
    if (error) {
      toast({ title: 'Error', description: 'Failed to delete announcement', variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Announcement removed' });
      fetchAnnouncements();
    }
  };

  if (loading) {
    return <div>Loading announcements...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Announcement Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={(o) => { if (!o) { setEditing(null); setFormData({ title: '', content: '' }); } setIsDialogOpen(o); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="w-4 h-4 mr-2" />
              Create Announcement
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit Announcement' : 'Create New Announcement'}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Announcement title"
                />
              </div>

              <div>
                <Label htmlFor="content">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Announcement content"
                  rows={5}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editing ? 'Update' : 'Create'} Announcement
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id}>
            <CardHeader>
              <CardTitle>{announcement.title}</CardTitle>
              <p className="text-sm text-muted-foreground">
                By {authorMap[announcement.created_by]?.full_name || 'Admin'} on {new Date(announcement.created_at).toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent>
              <div className="whitespace-pre-wrap mb-3">{announcement.content}</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(announcement)}>Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(announcement.id)}>Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {announcements.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No announcements found.</p>
        </div>
      )}
    </div>
  );
};