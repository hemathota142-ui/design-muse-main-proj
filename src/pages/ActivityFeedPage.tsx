import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, FolderOpen, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface DesignCommentRow {
  id: string;
  user_id: string;
  design_id: string;
  comment_text: string;
  created_at: string;
}

export default function ActivityFeedPage() {
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [peopleById, setPeopleById] = useState<Record<string, { display_name: string | null; avatar: string | null }>>({});
  const [isLoading, setIsLoading] = useState(false);

  const [likeCountByDesignId, setLikeCountByDesignId] = useState<Record<string, number>>({});
  const [commentCountByDesignId, setCommentCountByDesignId] = useState<Record<string, number>>({});
  const [likedByMeByDesignId, setLikedByMeByDesignId] = useState<Record<string, boolean>>({});
  const [likeBusyByDesignId, setLikeBusyByDesignId] = useState<Record<string, boolean>>({});

  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activeCommentDesign, setActiveCommentDesign] = useState<any | null>(null);
  const [activeComments, setActiveComments] = useState<DesignCommentRow[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);

  const designIds = useMemo(
    () =>
      Array.from(
        new Set(
          activityFeed
            .map((item) => item?.design_id)
            .filter((id): id is string => typeof id === "string" && id.length > 0)
        )
      ),
    [activityFeed]
  );

  const getDisplayName = (userId: string) => {
    if (userId === user?.id) return "You";
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
    const isOwnDesign = item?.design?.user_id === user?.id;
    const isSelfActor = item?.user_id === user?.id;
    const designTitle =
      typeof item?.design?.title === "string" && item.design.title.trim()
        ? item.design.title.trim()
        : "Untitled design";

    if (item.activity_type === "design_liked") {
      if (isOwnDesign && !isSelfActor) return `${actor} liked your design "${designTitle}"`;
      return `${actor} liked "${designTitle}"`;
    }

    if (item.activity_type === "design_commented") {
      if (isOwnDesign && !isSelfActor) return `${actor} commented on your design`;
      return `${actor} commented on a design`;
    }

    return `${actor} shared a new design`;
  };

  const loadActivityFeed = async () => {
    if (!user?.id || isGuest) return;
    setIsLoading(true);
    try {
      const [feedRes, peopleRes] = await Promise.all([
        supabase
          .from("activity_feed")
          .select("id, user_id, activity_type, design_id, created_at, design:designs(id, user_id, title, preview_image, content)")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.rpc("list_people_discovery"),
      ]);

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
      setActivityFeed([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEngagementMetrics = async (ids: string[]) => {
    if (!user?.id || isGuest || ids.length === 0) {
      setLikeCountByDesignId({});
      setCommentCountByDesignId({});
      setLikedByMeByDesignId({});
      return;
    }

    const [likesRes, commentsRes] = await Promise.all([
      supabase.from("design_likes").select("design_id, user_id").in("design_id", ids),
      supabase.from("design_comments").select("design_id").in("design_id", ids),
    ]);

    if (likesRes.error) {
      console.error("Failed to load likes for feed:", likesRes.error);
    }
    if (commentsRes.error) {
      console.error("Failed to load comments count for feed:", commentsRes.error);
    }

    const likeCounts: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
    const commentCounts: Record<string, number> = Object.fromEntries(ids.map((id) => [id, 0]));
    const liked: Record<string, boolean> = {};

    for (const row of likesRes.data ?? []) {
      if (!row?.design_id) continue;
      likeCounts[row.design_id] = (likeCounts[row.design_id] ?? 0) + 1;
      if (row.user_id === user.id) liked[row.design_id] = true;
    }

    for (const row of commentsRes.data ?? []) {
      if (!row?.design_id) continue;
      commentCounts[row.design_id] = (commentCounts[row.design_id] ?? 0) + 1;
    }

    setLikeCountByDesignId(likeCounts);
    setCommentCountByDesignId(commentCounts);
    setLikedByMeByDesignId(liked);
  };

  const loadCommentsForDesign = async (designId: string) => {
    if (!designId) return;
    setIsCommentsLoading(true);

    const { data, error } = await supabase
      .from("design_comments")
      .select("id, user_id, design_id, comment_text, created_at")
      .eq("design_id", designId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load comments:", error);
      setIsCommentsLoading(false);
      return;
    }

    setActiveComments((data ?? []) as DesignCommentRow[]);
    setIsCommentsLoading(false);
  };

  const handleOpenComments = async (design: any) => {
    setActiveCommentDesign(design);
    setIsCommentsOpen(true);
    setNewCommentText("");
    await loadCommentsForDesign(design.id);
  };

  const handleLikeDesign = async (designId: string) => {
    if (!user || isGuest || !designId) return;
    if (likedByMeByDesignId[designId] || likeBusyByDesignId[designId]) return;

    const previousCount = likeCountByDesignId[designId] ?? 0;

    setLikeBusyByDesignId((prev) => ({ ...prev, [designId]: true }));
    setLikedByMeByDesignId((prev) => ({ ...prev, [designId]: true }));
    setLikeCountByDesignId((prev) => ({ ...prev, [designId]: (prev[designId] ?? 0) + 1 }));

    const { error } = await supabase.from("design_likes").insert({
      user_id: user.id,
      design_id: designId,
    });

    if (error) {
      if (error.code === "23505") {
        setLikedByMeByDesignId((prev) => ({ ...prev, [designId]: true }));
        setLikeCountByDesignId((prev) => ({ ...prev, [designId]: previousCount }));
        setLikeBusyByDesignId((prev) => ({ ...prev, [designId]: false }));
        return;
      }

      console.error("Failed to like design:", error);
      setLikedByMeByDesignId((prev) => ({ ...prev, [designId]: false }));
      setLikeCountByDesignId((prev) => ({ ...prev, [designId]: previousCount }));
      toast({
        title: "Like failed",
        description: "Unable to like this design right now.",
        variant: "destructive",
      });
    }

    setLikeBusyByDesignId((prev) => ({ ...prev, [designId]: false }));
  };

  const handleSubmitComment = async () => {
    if (!user || isGuest || !activeCommentDesign?.id) return;
    const text = newCommentText.trim();
    if (!text) return;

    const designId = activeCommentDesign.id;
    const tempId = `temp-${Date.now()}`;
    const optimistic: DesignCommentRow = {
      id: tempId,
      user_id: user.id,
      design_id: designId,
      comment_text: text,
      created_at: new Date().toISOString(),
    };

    setIsCommentSubmitting(true);
    setNewCommentText("");
    setActiveComments((prev) => [optimistic, ...prev]);
    setCommentCountByDesignId((prev) => ({ ...prev, [designId]: (prev[designId] ?? 0) + 1 }));

    const { error } = await supabase.from("design_comments").insert({
      user_id: user.id,
      design_id: designId,
      comment_text: text,
    });

    if (error) {
      console.error("Failed to post comment:", error);
      setActiveComments((prev) => prev.filter((comment) => comment.id !== tempId));
      setCommentCountByDesignId((prev) => ({ ...prev, [designId]: Math.max((prev[designId] ?? 1) - 1, 0) }));
      setNewCommentText(text);
      toast({
        title: "Comment failed",
        description: "Unable to post comment right now.",
        variant: "destructive",
      });
      setIsCommentSubmitting(false);
      return;
    }

    await loadCommentsForDesign(designId);
    setIsCommentSubmitting(false);
  };

  const formatCommentTime = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  useEffect(() => {
    if (!user?.id || isGuest) {
      setActivityFeed([]);
      setPeopleById({});
      return;
    }

    let isMounted = true;
    const load = async () => {
      await loadActivityFeed();
    };

    load();

    const channel = supabase
      .channel(`activity-feed-page-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "activity_feed" }, () => load())
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, isGuest]);

  useEffect(() => {
    loadEngagementMetrics(designIds);
  }, [user?.id, isGuest, designIds.join("|")]);

  useEffect(() => {
    if (!isCommentsOpen || !activeCommentDesign?.id) return;

    const designId = activeCommentDesign.id as string;
    const channel = supabase
      .channel(`activity-feed-comments-${designId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "design_comments", filter: `design_id=eq.${designId}` },
        () => {
          loadCommentsForDesign(designId);
          loadEngagementMetrics(designIds);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isCommentsOpen, activeCommentDesign?.id, designIds.join("|")]);

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
              const actorName = item.user_id === user?.id ? "You" : getDisplayName(item.user_id);
              const actorAvatar = item.user_id === user?.id ? null : peopleById[item.user_id]?.avatar ?? null;
              const design = item.design;
              const isEngagementEvent =
                item.activity_type === "design_liked" || item.activity_type === "design_commented";
              const designTitle =
                typeof design?.title === "string" && design.title.trim() ? design.title : "Untitled design";
              const previewSrc = resolveDesignPreview(design);
              const designId = item.design_id as string | null;
              const likes = designId ? likeCountByDesignId[designId] ?? 0 : 0;
              const comments = designId ? commentCountByDesignId[designId] ?? 0 : 0;
              const likedByMe = designId ? Boolean(likedByMeByDesignId[designId]) : false;
              const likeBusy = designId ? Boolean(likeBusyByDesignId[designId]) : false;

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

                    {!isEngagementEvent && (
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
                              <Button size="sm" variant="outline">View</Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    )}

                    {!isEngagementEvent && (
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          variant={likedByMe ? "default" : "ghost"}
                          size="sm"
                          className="gap-2"
                          disabled={!designId || likedByMe || likeBusy}
                          onClick={() => designId && handleLikeDesign(designId)}
                        >
                          <Heart className={likedByMe ? "w-4 h-4 fill-current" : "w-4 h-4"} />
                          {likes}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="gap-2"
                          disabled={!designId}
                          onClick={() => designId && handleOpenComments(design)}
                        >
                          <MessageCircle className="w-4 h-4" />
                          {comments}
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </motion.div>

      <Dialog
        open={isCommentsOpen}
        onOpenChange={(open) => {
          setIsCommentsOpen(open);
          if (!open) {
            setActiveCommentDesign(null);
            setActiveComments([]);
            setNewCommentText("");
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Comments</DialogTitle>
            <DialogDescription>
              {activeCommentDesign?.title || "Public design discussion"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="max-h-[360px] overflow-y-auto space-y-3 pr-1">
              {isCommentsLoading ? (
                <p className="text-sm text-muted-foreground">Loading comments...</p>
              ) : activeComments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No comments yet. Start the conversation.</p>
              ) : (
                activeComments.map((comment) => {
                  const authorName = getDisplayName(comment.user_id);
                  const authorAvatar = comment.user_id === user?.id ? null : peopleById[comment.user_id]?.avatar ?? null;
                  const profilePath = comment.user_id === user?.id ? "/profile" : `/profile/${comment.user_id}`;

                  return (
                    <div key={comment.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <Link to={profilePath} className="flex items-center gap-2 min-w-0">
                          <Avatar className="w-7 h-7">
                            {authorAvatar ? <AvatarImage src={authorAvatar} alt={authorName} /> : null}
                            <AvatarFallback className="text-[10px] font-semibold">
                              {(authorName || "U").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-foreground truncate">{authorName}</span>
                        </Link>
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatCommentTime(comment.created_at)}
                        </span>
                      </div>
                      <p className="text-sm text-foreground whitespace-pre-wrap break-words">
                        {comment.comment_text}
                      </p>
                    </div>
                  );
                })
              )}
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder="Write a comment..."
                value={newCommentText}
                onChange={(event) => setNewCommentText(event.target.value)}
                rows={3}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleSubmitComment}
                  disabled={isCommentSubmitting || !newCommentText.trim()}
                >
                  {isCommentSubmitting ? "Posting..." : "Post Comment"}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
