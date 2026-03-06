import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, FolderOpen, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export default function ActivityFeedPage() {
  const { user, isGuest } = useAuth();
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [peopleById, setPeopleById] = useState<Record<string, { display_name: string | null; avatar: string | null }>>({});
  const [isLoading, setIsLoading] = useState(false);

  const getDisplayName = (userId: string) => {
    const person = peopleById[userId];
    return person?.display_name || userId.slice(0, 8);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const resolveDesignPreview = (design: any): string | null => {
    if (!design) return null;
    if (typeof design.preview_image === "string" && design.preview_image.trim()) {
      return design.preview_image;
    }
    const fromContent = design?.content?.design ?? design?.content ?? {};
    return (
      fromContent?.previewImage ||
      fromContent?.preview_image ||
      fromContent?.imageUrl ||
      fromContent?.image_url ||
      fromContent?.thumbnail ||
      fromContent?.thumbnailUrl ||
      fromContent?.image ||
      null
    );
  };

  const getActivityMessage = (item: any) => {
    const actor = getDisplayName(item.user_id);
    if (item.activity_type === "design_liked") return `${actor} liked a design`;
    return `${actor} shared a new design`;
  };

  useEffect(() => {
    if (!user?.id || isGuest) {
      setActivityFeed([]);
      setPeopleById({});
      return;
    }

    let isMounted = true;
    const loadActivityFeed = async () => {
      setIsLoading(true);
      try {
        const [feedRes, peopleRes] = await Promise.all([
          supabase
            .from("activity_feed")
            .select("id, user_id, activity_type, design_id, created_at, design:designs(id, title, preview_image, content)")
            .order("created_at", { ascending: false })
            .limit(50),
          supabase.rpc("list_people_discovery"),
        ]);

        if (!isMounted) return;
        if (feedRes.error) throw feedRes.error;
        if (peopleRes.error) throw peopleRes.error;

        setActivityFeed(feedRes.data ?? []);
        const byId = Object.fromEntries(
          ((peopleRes.data ?? []) as any[]).map((p: any) => [
            p.id,
            { display_name: p.display_name ?? null, avatar: p.avatar ?? null },
          ])
        );
        setPeopleById(byId);
      } catch (error) {
        console.error("Failed to load activity feed", error);
        if (isMounted) setActivityFeed([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadActivityFeed();
    const channel = supabase
      .channel(`activity-feed-page-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "activity_feed" },
        () => loadActivityFeed()
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, isGuest]);

  return (
    <AppLayout>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Activity Feed</h1>
          <p className="text-muted-foreground">Latest public design activity from you and your friends.</p>
        </div>

        {isLoading ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Loading activity...</CardContent>
          </Card>
        ) : activityFeed.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center text-muted-foreground">
              No activity from your friends yet.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {activityFeed.map((item) => {
              const actorName = getDisplayName(item.user_id);
              const actorAvatar = peopleById[item.user_id]?.avatar ?? null;
              const design = item.design;
              const designTitle =
                (typeof design?.title === "string" && design.title.trim()) ? design.title : "Untitled design";
              const previewSrc = resolveDesignPreview(design);
              return (
                <Card key={item.id} className="card-hover">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10">
                        {actorAvatar ? <AvatarImage src={actorAvatar} alt={actorName} /> : null}
                        <AvatarFallback>{getInitials(actorName)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{actorName}</p>
                        <p className="text-sm text-muted-foreground">{getActivityMessage(item)}</p>
                      </div>
                    </div>

                    <div className="rounded-xl border border-border p-3 bg-muted/20">
                      <div className="w-full h-44 rounded-lg overflow-hidden bg-muted mb-3">
                        {previewSrc ? (
                          <img src={previewSrc} alt={designTitle} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <FolderOpen className="w-8 h-8 opacity-60" />
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-medium text-foreground line-clamp-1">{designTitle}</p>
                        {item.design_id && (
                          <Link to={`/designs/${item.design_id}?mode=read`}>
                            <Button size="sm" variant="outline">Open Design</Button>
                          </Link>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Heart className="w-4 h-4" />
                        Like
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Comment
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>
    </AppLayout>
  );
}
