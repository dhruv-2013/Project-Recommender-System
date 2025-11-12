"use client";

import { useEffect, useState } from "react";
import { Megaphone, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Announcement {
  id: string;
  title: string;
  content: string;
  created_at: string;
  created_by: string | null;
}

interface AuthorMap {
  [userId: string]: {
    full_name: string | null;
  };
}

interface StudentAnnouncementsProps {
  limit?: number;
}

export function StudentAnnouncements({ limit = 4 }: StudentAnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [authors, setAuthors] = useState<AuthorMap>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchAnnouncements();
  }, [limit]);

  const fetchAnnouncements = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("announcements")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      const records = data || [];
      setAnnouncements(records as Announcement[]);

      const authorIds = Array.from(new Set(records.map((item) => item.created_by).filter(Boolean))) as string[];
      if (authorIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", authorIds);

        const map: AuthorMap = {};
        (profileData || []).forEach((profile) => {
          map[profile.user_id] = { full_name: profile.full_name };
        });
        setAuthors(map);
      } else {
        setAuthors({});
      }
    } catch (error) {
      console.error("Failed to load announcements", error);
      setAnnouncements([]);
      setAuthors({});
    } finally {
      setLoading(false);
    }
  };

  const renderAnnouncement = (announcement: Announcement) => {
    const createdAt = new Date(announcement.created_at);
    const isRecent = Date.now() - createdAt.getTime() < 1000 * 60 * 60 * 24 * 7;
    const authorName = announcement.created_by
      ? authors[announcement.created_by]?.full_name || "Admin"
      : "Admin";

    return (
      <Card key={announcement.id} className="border border-white/10 bg-background/60 backdrop-blur">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-base font-semibold text-foreground">
              {announcement.title}
            </CardTitle>
            {isRecent && (
              <Badge variant="default" className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40">
                New
              </Badge>
            )}
          </div>
          <CardDescription className="text-xs">
            Posted by {authorName} on {createdAt.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">
            {announcement.content}
          </p>
        </CardContent>
      </Card>
    );
  };

  return (
    <Card className="border border-white/10 bg-background/70 backdrop-blur">
      <CardHeader className="pb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Latest Announcements
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Stay in sync with important updates from coordinators and mentors.
            </CardDescription>
          </div>
          {!loading && announcements.length > 0 && (
            <Badge variant="outline" className="border-white/20 text-xs text-muted-foreground">
              {announcements.length} update{announcements.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading announcements…
          </div>
        )}

        {!loading && announcements.length === 0 && (
          <div className="rounded-lg border border-dashed border-white/10 py-10 text-center text-sm text-muted-foreground">
            No announcements yet. Check back soon for updates.
          </div>
        )}

        {!loading && announcements.length > 0 && (
          <div className="space-y-4">
            {announcements.map(renderAnnouncement)}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

