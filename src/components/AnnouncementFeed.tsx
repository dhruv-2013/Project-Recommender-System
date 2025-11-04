import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const AnnouncementFeed = () => {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [authors, setAuthors] = useState<Record<string, { full_name: string }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const { data, error } = await supabase
          .from("announcements")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        setAnnouncements(data || []);
        const ids = Array.from(new Set((data || []).map((a: any) => a.created_by))).filter(Boolean);
        if (ids.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('user_id, full_name')
            .in('user_id', ids);
          const map: Record<string, { full_name: string }> = {};
          (profiles || []).forEach((p: any) => { map[p.user_id] = { full_name: p.full_name }; });
          setAuthors(map);
        } else {
          setAuthors({});
        }
      } catch (e) {
        // no-op
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    );
  }

  if (announcements.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-muted-foreground">No announcements yet.</CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {announcements.map((a) => (
        <Card key={a.id} className="hover-lift">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {a.title}
              <Badge variant="secondary">{new Date(a.created_at).toLocaleDateString()}</Badge>
            </CardTitle>
            <div className="text-sm text-muted-foreground">By {authors[a.created_by]?.full_name || "Admin"}</div>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap">{a.content}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AnnouncementFeed;


