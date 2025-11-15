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
    return (
      <div className="flex items-center justify-center py-12 text-white/60">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Announcement Management</h2>
        <Dialog open={isDialogOpen} onOpenChange={(o) => { if (!o) { setEditing(null); setFormData({ title: '', content: '' }); } setIsDialogOpen(o); }}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} className="bg-sky-500 text-white hover:bg-sky-400">
              <Plus className="mr-2 h-4 w-4" />
              Create Announcement
            </Button>
          </DialogTrigger>
          <DialogContent className="border border-white/10 bg-[#0b111a] text-white">
            <DialogHeader>
              <DialogTitle className="text-white">{editing ? 'Edit Announcement' : 'Create New Announcement'}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="title" className="text-white/70">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Announcement title"
                  className="rounded-xl border-white/15 bg-black/40 text-white placeholder:text-white/40 focus-visible:ring-0"
                />
              </div>

              <div>
                <Label htmlFor="content" className="text-white/70">Content</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Announcement content"
                  rows={5}
                  className="rounded-xl border-white/15 bg-black/40 text-white placeholder:text-white/40 focus-visible:ring-0"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)} className="border-white/20 text-white hover:bg-white/10">
                  Cancel
                </Button>
                <Button onClick={handleSubmit} className="bg-sky-500 text-white hover:bg-sky-400">
                  {editing ? 'Update' : 'Create'} Announcement
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {announcements.map((announcement) => (
          <Card key={announcement.id} className="rounded-3xl border border-white/10 bg-black/70 text-white/80 shadow-[0_25px_65px_-40px_rgba(56,189,248,0.45)] transition-all duration-300 hover:-translate-y-1 hover:border-sky-400/50">
            <CardHeader>
              <CardTitle className="text-white">{announcement.title}</CardTitle>
              <p className="text-sm text-white/60">
                By {authorMap[announcement.created_by]?.full_name || 'Admin'} on {new Date(announcement.created_at).toLocaleDateString()}
              </p>
            </CardHeader>
            <CardContent>
              <div className="mb-3 whitespace-pre-wrap text-white/75">{announcement.content}</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openEdit(announcement)} className="bg-transparent border-white/20 text-white hover:bg-white/10">Edit</Button>
                <Button variant="destructive" size="sm" onClick={() => handleDelete(announcement.id)} className="bg-red-500/30 text-red-200 hover:bg-red-500/40">Delete</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {announcements.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-white/60">No announcements found.</p>
        </div>
      )}
    </div>
  );
};