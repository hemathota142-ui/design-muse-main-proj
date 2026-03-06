import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  User, 
  FolderOpen, 
  Globe, 
  Lock, 
  Edit, 
  Trash2,
  Eye,
  Clock,
  TrendingUp,
  Share2,
  MessageSquare,
  Heart,
  MessageCircle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { getMyProfile } from "@/services/profiles.service";
import { deleteDesign, getMyDesigns, updateDesignVisibility } from "@/services/designs.service";
import { FriendsServiceError, sendFriendRequest } from "@/services/friends.service";

const avatarOptions = [
  "\u{1F600}",
  "\u{1F60E}",
  "\u{1F9E0}",
  "\u{1F3A8}",
  "\u{1F6E0}\uFE0F",
  "\u{1F680}",
  "\u{1F33F}",
  "\u{1F9E9}",
];

interface CommentAuthorLite {
  display_name: string | null;
  avatar: string | null;
}

interface DesignCommentRow {
  id: string;
  user_id: string;
  design_id: string;
  comment_text: string;
  created_at: string;
}

export default function ProfilePage() {
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { userId: routeUserId } = useParams<{ userId?: string }>();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileBio, setProfileBio] = useState<string | null>(null);
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null);
  const [postedDesigns, setPostedDesigns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"public" | "private">("public");
  const [savedAvatar, setSavedAvatar] = useState("\u{1F600}");
  const [selectedAvatar, setSelectedAvatar] = useState("\u{1F600}");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isAvatarEditMode, setIsAvatarEditMode] = useState(false);
  const [friendshipState, setFriendshipState] = useState<"none" | "pending" | "accepted">("none");
  const [isSendingFriendRequest, setIsSendingFriendRequest] = useState(false);
  const [friendsCount, setFriendsCount] = useState(0);
  const [likeCountByDesignId, setLikeCountByDesignId] = useState<Record<string, number>>({});
  const [likedByMeByDesignId, setLikedByMeByDesignId] = useState<Record<string, boolean>>({});
  const [likeBusyByDesignId, setLikeBusyByDesignId] = useState<Record<string, boolean>>({});
  const [commentCountByDesignId, setCommentCountByDesignId] = useState<Record<string, number>>({});
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [activeCommentDesign, setActiveCommentDesign] = useState<any | null>(null);
  const [activeComments, setActiveComments] = useState<DesignCommentRow[]>([]);
  const [isCommentsLoading, setIsCommentsLoading] = useState(false);
  const [newCommentText, setNewCommentText] = useState("");
  const [isCommentSubmitting, setIsCommentSubmitting] = useState(false);
  const [commentAuthorByUserId, setCommentAuthorByUserId] = useState<Record<string, CommentAuthorLite>>({});
  const viewedUserId = routeUserId || new URLSearchParams(location.search).get("userId");
  const isViewingOther = Boolean(viewedUserId && user?.id && viewedUserId !== user.id);
  const profileUserId = isViewingOther && viewedUserId ? viewedUserId : user?.id;

  useEffect(() => {
    if (!user || isGuest) return;
    let isMounted = true;

    const loadDesigns = async () => {
      if (isViewingOther) {
        if (!viewedUserId) {
          if (isMounted) setPostedDesigns([]);
          return;
        }
        try {
          const { data, error } = await supabase
            .from("designs")
            .select("id, title, description, preview_image, content, created_at, visibility, is_public, feasibility_score, constraints")
            .eq("user_id", viewedUserId)
            .eq("visibility", "public")
            .order("created_at", { ascending: false });

          if (error) throw error;

          if (isMounted) {
            const normalized = (data ?? []).map((design: any) => ({
              ...design,
              feasibilityScore: design?.feasibility_score ?? null,
              visibility: design?.visibility ?? (design?.is_public ? "public" : "private"),
              preview_image: design?.preview_image ?? null,
              content: design?.content ?? {},
              canonicalDesign: { title: design?.title, purpose: design?.description },
            }));
            setPostedDesigns(normalized);
          }
        } catch (error) {
          console.error("Failed to load viewed user's public designs:", error);
          if (isMounted) setPostedDesigns([]);
        }
        return;
      }
      try {
        const data = await getMyDesigns(user.id);
        if (isMounted) {
          setPostedDesigns(data || []);
        }
      } catch (error) {
        console.error("Failed to load designs:", error);
      }
    };

    loadDesigns();

    const handleDesignsUpdated = () => {
      loadDesigns();
    };

    window.addEventListener("designs:updated", handleDesignsUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("designs:updated", handleDesignsUpdated);
    };
  }, [user, isGuest, isViewingOther, viewedUserId]);

  useEffect(() => {
    if (!user || isGuest) return;
    const avatarFromMeta =
      typeof user.user_metadata?.avatar === "string" && user.user_metadata.avatar
        ? user.user_metadata.avatar
         : "\u{1F600}";
    setSavedAvatar(avatarFromMeta);
    setSelectedAvatar(avatarFromMeta);
  }, [user, isGuest]);

  useEffect(() => {
    if (!user || isGuest) return;
    let isMounted = true;

    const loadViewedProfile = async (targetId: string) => {
      const [{ data, error }, discoveryRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, email, bio")
          .eq("id", targetId)
          .single(),
        supabase.rpc("list_people_discovery"),
      ]);

      if (error || !data) {
        toast({
          title: "Profile unavailable",
          description: "You do not have access to this profile.",
          variant: "destructive",
        });
        navigate("/profile", { replace: true });
        return;
      }

      if (isMounted) {
        const discovery = ((discoveryRes.data ?? []) as any[]).find((person) => person.id === targetId);
        setProfileName(data.full_name || discovery?.display_name || null);
        setProfileBio(data.bio);
        setProfileEmail(data.email);
        setProfileAvatarUrl(discovery?.avatar || null);
      }
    };

    const loadProfile = async () => {
      try {
        if (isViewingOther && viewedUserId) {
          await loadViewedProfile(viewedUserId);
          return;
        }
        const profile = await getMyProfile();
        if (isMounted) {
          setProfileName(profile.full_name);
          setProfileBio(profile.bio);
          setProfileEmail(profile.email);
          setProfileAvatarUrl(null);
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      }
    };

    loadProfile();

    const handleProfileUpdated = () => {
      loadProfile();
    };

    window.addEventListener("profile:updated", handleProfileUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("profile:updated", handleProfileUpdated);
    };
  }, [user, isGuest, isViewingOther, viewedUserId, navigate, toast]);

  useEffect(() => {
    if (!user || isGuest || !isViewingOther || !profileUserId) {
      setFriendshipState("none");
      return;
    }

    let isMounted = true;
    const loadFriendshipState = async () => {
      try {
        const { data, error } = await supabase
          .from("friends")
          .select("id, status, requester_id, receiver_id, created_at")
          .or(
            `and(requester_id.eq.${user.id},receiver_id.eq.${profileUserId}),and(requester_id.eq.${profileUserId},receiver_id.eq.${user.id})`
          )
          .order("created_at", { ascending: false });

        if (!isMounted) return;
        if (error) {
          setFriendshipState("none");
          return;
        }

        const rows = data ?? [];
        const accepted = rows.find((row) => row.status === "accepted");
        const pending = rows.find((row) => row.status === "pending");
        if (accepted) {
          setFriendshipState("accepted");
          return;
        }
        if (pending) {
          setFriendshipState("pending");
          return;
        }
        setFriendshipState("none");
      } catch {
        if (isMounted) setFriendshipState("none");
      }
    };

    loadFriendshipState();
    const handleFriendsUpdated = () => loadFriendshipState();
    window.addEventListener("friends:updated", handleFriendsUpdated);
    return () => {
      isMounted = false;
      window.removeEventListener("friends:updated", handleFriendsUpdated);
    };
  }, [user, isGuest, isViewingOther, profileUserId]);

  useEffect(() => {
    if (!user || isGuest || !profileUserId) return;
    let isMounted = true;

    const loadFriendsCount = async () => {
      try {
        const { count, error } = await supabase
          .from("friends")
          .select("id", { count: "exact", head: true })
          .eq("status", "accepted")
          .or(`requester_id.eq.${profileUserId},receiver_id.eq.${profileUserId}`);

        if (!isMounted) return;
        if (error) {
          console.error("Failed to load friends count:", error);
          return;
        }
        setFriendsCount(count ?? 0);
      } catch (error) {
        if (!isMounted) return;
        console.error("Failed to load friends count:", error);
      }
    };

    loadFriendsCount();

    const requesterChannel = supabase
      .channel(`profile-friends-requester-${profileUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friends",
          filter: `requester_id=eq.${profileUserId}`,
        },
        () => {
          loadFriendsCount();
        }
      )
      .subscribe();

    const receiverChannel = supabase
      .channel(`profile-friends-receiver-${profileUserId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friends",
          filter: `receiver_id=eq.${profileUserId}`,
        },
        () => {
          loadFriendsCount();
        }
      )
      .subscribe();

    const handleFriendsUpdated = () => {
      loadFriendsCount();
    };

    window.addEventListener("friends:updated", handleFriendsUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("friends:updated", handleFriendsUpdated);
      supabase.removeChannel(requesterChannel);
      supabase.removeChannel(receiverChannel);
    };
  }, [user, isGuest, profileUserId]);

  useEffect(() => {
    if (!user || isGuest) {
      setLikeCountByDesignId({});
      setLikedByMeByDesignId({});
      return;
    }

    const publicDesignIds = postedDesigns
      .filter((design) => design.visibility === "public")
      .map((design) => design.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (publicDesignIds.length === 0) {
      setLikeCountByDesignId({});
      setLikedByMeByDesignId({});
      return;
    }

    let isMounted = true;

    const loadLikes = async () => {
      const { data, error } = await supabase
        .from("design_likes")
        .select("design_id, user_id")
        .in("design_id", publicDesignIds);

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load design likes:", error);
        return;
      }

      const counts: Record<string, number> = Object.fromEntries(
        publicDesignIds.map((designId) => [designId, 0])
      );
      const liked: Record<string, boolean> = {};

      for (const row of data ?? []) {
        if (!row?.design_id) continue;
        counts[row.design_id] = (counts[row.design_id] ?? 0) + 1;
        if (row.user_id === user.id) {
          liked[row.design_id] = true;
        }
      }

      setLikeCountByDesignId(counts);
      setLikedByMeByDesignId(liked);
    };

    loadLikes();

    return () => {
      isMounted = false;
    };
  }, [postedDesigns, user, isGuest]);

  useEffect(() => {
    if (!user || isGuest) {
      setCommentCountByDesignId({});
      return;
    }

    const publicDesignIds = postedDesigns
      .filter((design) => design.visibility === "public")
      .map((design) => design.id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);

    if (publicDesignIds.length === 0) {
      setCommentCountByDesignId({});
      return;
    }

    let isMounted = true;

    const loadCommentCounts = async () => {
      const { data, error } = await supabase
        .from("design_comments")
        .select("design_id")
        .in("design_id", publicDesignIds);

      if (!isMounted) return;

      if (error) {
        console.error("Failed to load comment counts:", error);
        return;
      }

      const counts: Record<string, number> = Object.fromEntries(
        publicDesignIds.map((designId) => [designId, 0])
      );

      for (const row of data ?? []) {
        if (!row?.design_id) continue;
        counts[row.design_id] = (counts[row.design_id] ?? 0) + 1;
      }

      setCommentCountByDesignId(counts);
    };

    loadCommentCounts();

    const commentsChannel = supabase
      .channel(`design-comments-counts-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "design_comments" },
        (payload) => {
          const changedDesignId =
            (payload.new as any)?.design_id || (payload.old as any)?.design_id;
          if (!changedDesignId || !publicDesignIds.includes(changedDesignId)) return;

          loadCommentCounts();

          if (isCommentsOpen && activeCommentDesign?.id === changedDesignId) {
            loadCommentsForDesign(changedDesignId);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(commentsChannel);
    };
  }, [postedDesigns, user, isGuest, activeCommentDesign?.id, isCommentsOpen]);

  const publicDesigns = postedDesigns.filter((d) => d.visibility === "public");
  const privateDesigns = postedDesigns.filter((d) => d.visibility !== "public");
  const feasibilityValues = postedDesigns
    .map((d) => d.feasibilityScore)
    .filter((value: any) => typeof value === "number") as number[];
  const avgFeasibility = feasibilityValues.length
    ? Math.round(
        feasibilityValues.reduce((sum, value) => sum + value, 0) /
          feasibilityValues.length
      )
    : 0;

  const displayedDesigns = activeTab === "public" ? publicDesigns : privateDesigns;

  const resolveDesignPreview = (design: any): string | null => {
    if (typeof design?.preview_image === "string" && design.preview_image.trim()) {
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

  const resolveLikeCount = (design: any): number => {
    const fromContent = design?.content?.design ?? design?.content ?? {};
    const raw =
      design?.like_count ??
      design?.likes ??
      fromContent?.likeCount ??
      fromContent?.like_count ??
      fromContent?.likes ??
      0;
    const count = Number(raw);
    return Number.isFinite(count) ? count : 0;
  };

  const getLikeCount = (design: any): number => {
    const designId = typeof design?.id === "string" ? design.id : "";
    if (designId && typeof likeCountByDesignId[designId] === "number") {
      return likeCountByDesignId[designId];
    }
    return resolveLikeCount(design);
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
        // Already liked (race/stale client). Keep liked state and restore count.
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

  const getCommentCount = (designId: string): number => {
    const count = commentCountByDesignId[designId] ?? 0;
    return Number.isFinite(count) ? count : 0;
  };

  const hydrateCommentAuthors = async (userIds: string[]) => {
    const missingUserIds = userIds.filter((id) => !commentAuthorByUserId[id]);
    if (missingUserIds.length === 0) return;

    const { data, error } = await supabase.rpc("list_people_discovery");
    if (error) {
      console.error("Failed to load comment authors:", error);
      return;
    }

    const authorMap: Record<string, CommentAuthorLite> = {};
    for (const person of (data ?? []) as any[]) {
      if (!person?.id) continue;
      authorMap[person.id] = {
        display_name: person.display_name ?? null,
        avatar: person.avatar ?? null,
      };
    }

    setCommentAuthorByUserId((prev) => ({ ...authorMap, ...prev }));
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

    const rows = (data ?? []) as DesignCommentRow[];
    await hydrateCommentAuthors(Array.from(new Set(rows.map((row) => row.user_id).filter(Boolean))));
    setActiveComments(rows);
    setIsCommentsLoading(false);
  };

  const handleOpenComments = async (design: any) => {
    setActiveCommentDesign(design);
    setIsCommentsOpen(true);
    setNewCommentText("");
    await loadCommentsForDesign(design.id);
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
      console.error("Failed to submit comment:", error);
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

  const usernameSource =
    profileName ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "";
  const username = usernameSource
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  const displayName =
    profileName ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "Designer";

  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("") || "U";

  const handleDelete = async (id: string) => {
    if (!user || isGuest) return;
    try {
      await deleteDesign(id);
      setPostedDesigns((prev) => prev.filter((d) => d.id !== id));
    } catch (error) {
      console.error("Failed to delete design:", error);
    }
  };

  const toggleVisibility = async (id: string, current: "public" | "private") => {
    if (!user || isGuest) return;
    const next = current === "public" ? "private" : "public";
    try {
      await updateDesignVisibility(id, next);
      setPostedDesigns((prev) =>
        prev.map((d) => (d.id === id ? { ...d, visibility: next } : d))
      );
    } catch (error) {
      console.error("Failed to update visibility:", error);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric"
    });
  };

  const handleSaveAvatar = async () => {
    if (!user || isGuest) return;
    if (selectedAvatar === savedAvatar) return;
    try {
      setIsSavingAvatar(true);
      const { error } = await supabase.auth.updateUser({
        data: { avatar: selectedAvatar },
      });
      if (error) throw error;
      setSavedAvatar(selectedAvatar);
      setIsAvatarEditMode(false);
      toast({
        title: "Avatar updated",
        description: "Your avatar has been saved.",
      });
    } catch (error) {
      console.error("Failed to update avatar:", error);
      toast({
        title: "Update failed",
        description: "Unable to save avatar. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleAddFriend = async () => {
    if (!profileUserId || !isViewingOther || friendshipState !== "none") return;
    try {
      setIsSendingFriendRequest(true);
      await sendFriendRequest(profileUserId);
      setFriendshipState("pending");
      window.dispatchEvent(new Event("friends:updated"));
      toast({
        title: "Friend request sent",
        description: "Your request is pending.",
      });
    } catch (error: any) {
      const message = error instanceof FriendsServiceError ? error.message : "Unable to send request.";
      toast({
        title: "Send failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSendingFriendRequest(false);
    }
  };

  if (isGuest) {
    return (
      <AppLayout>
        <div className="max-w-2xl mx-auto text-center py-12">
          <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-6">
            <User className="w-10 h-10 text-warning" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Guest Profile</h1>
          <p className="text-muted-foreground mb-6">
            Sign up to access your profile, save designs, and share with friends.
          </p>
          <Link to="/signup">
            <Button variant="gradient">Create Account</Button>
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <Avatar className="w-24 h-24 rounded-full bg-primary/10">
                  {isViewingOther && profileAvatarUrl ? (
                    <AvatarImage src={profileAvatarUrl} alt={displayName} />
                  ) : null}
                  <AvatarFallback className="text-4xl leading-none">
                    {isViewingOther ? initials : savedAvatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-foreground">{displayName}</h1>
                  <p className="text-muted-foreground">@{username || "designer"}</p>
                  {profileBio && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {profileBio}
                    </p>
                  )}
                  {isViewingOther && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Viewing friend profile (read-only).
                    </p>
                  )}
                  <div className="mt-3 space-y-1">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Friends:</span> {friendsCount}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">Public Designs:</span> {publicDesigns.length}
                    </p>
                  </div>
                  {!isViewingOther && isAvatarEditMode && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-2">Change Avatar</p>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-2 max-w-md">
                        {avatarOptions.map((avatar) => (
                          <button
                            key={avatar}
                            type="button"
                            onClick={() => setSelectedAvatar(avatar)}
                            className={cn(
                              "h-10 w-10 rounded-full border text-lg flex items-center justify-center transition-colors",
                              selectedAvatar === avatar
                                ? "border-primary bg-primary/10"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            {avatar}
                          </button>
                        ))}
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={handleSaveAvatar}
                          disabled={isSavingAvatar || selectedAvatar === savedAvatar}
                        >
                          {isSavingAvatar ? "Saving..." : "Save Avatar"}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedAvatar(savedAvatar);
                            setIsAvatarEditMode(false);
                          }}
                          disabled={isSavingAvatar}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                {!isViewingOther && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => setIsAvatarEditMode(true)}
                  >
                    <Edit className="w-4 h-4" />
                    Edit Profile
                  </Button>
                )}
                {isViewingOther && friendshipState === "none" && (
                  <Button
                    variant="outline"
                    onClick={handleAddFriend}
                    disabled={isSendingFriendRequest}
                  >
                    {isSendingFriendRequest ? "Sending..." : "Add Friend"}
                  </Button>
                )}
                {isViewingOther && friendshipState === "pending" && (
                  <Button variant="outline" disabled>
                    Request Pending
                  </Button>
                )}
                {isViewingOther && friendshipState === "accepted" && profileUserId && (
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={() => navigate(`/messages?friendId=${profileUserId}`)}
                  >
                    <MessageSquare className="w-4 h-4" />
                    Message
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Stats Cards */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="grid sm:grid-cols-3 gap-4 mb-8"
        >
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <FolderOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{postedDesigns.length}</p>
                <p className="text-sm text-muted-foreground">Total Designs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Globe className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{publicDesigns.length}</p>
                <p className="text-sm text-muted-foreground">Public Designs</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-warning" />
              </div>
              <div>
                        <p className="text-2xl font-bold text-foreground">
                          {avgFeasibility ? `${avgFeasibility}%` : "0%"}
                        </p>
                        <p className="text-sm text-muted-foreground">Avg Feasibility</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Viewed User Public Designs */}
        {isViewingOther && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-foreground">Public Designs</h2>
            </div>

            {publicDesigns.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-1">
                    This user has not shared any public designs yet.
                  </h3>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {publicDesigns.map((design, index) => {
                  const previewSrc = resolveDesignPreview(design);
                  const likes = getLikeCount(design);
                  const comments = getCommentCount(design.id);
                  const likedByMe = Boolean(likedByMeByDesignId[design.id]);
                  const likeBusy = Boolean(likeBusyByDesignId[design.id]);
                  return (
                    <motion.div
                      key={design.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Card className="card-hover">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-end mb-3">
                            <Link to={`/designs/${design.id}?mode=read`}>
                              <Button size="sm" variant="outline">
                                View
                              </Button>
                            </Link>
                          </div>

                          <div className="w-full h-40 rounded-lg overflow-hidden bg-muted mb-3">
                            {previewSrc ? (
                              <img
                                src={previewSrc}
                                alt={design?.title || "Design preview"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                <FolderOpen className="w-8 h-8 opacity-60" />
                              </div>
                            )}
                          </div>

                          <h3 className="font-semibold text-foreground mb-2 line-clamp-1">
                            {design?.canonicalDesign?.title || design?.title || "Untitled design"}
                          </h3>

                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant={likedByMe ? "default" : "outline"}
                                className="gap-1.5"
                                disabled={likedByMe || likeBusy}
                                onClick={() => handleLikeDesign(design.id)}
                              >
                                <Heart className={cn("w-4 h-4", likedByMe && "fill-current")} />
                                {likeBusy ? "Liking..." : likedByMe ? "Liked" : "Like"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => handleOpenComments(design)}
                              >
                                <MessageCircle className="w-4 h-4" />
                                Comment
                              </Button>
                            </div>
                            <p className="text-sm text-muted-foreground">{likes} likes | {comments} comments</p>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {/* Designs Tabs */}
        {!isViewingOther && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
          <div className="flex items-center gap-4 mb-6">
            <h2 className="text-xl font-semibold text-foreground">My Posted Designs</h2>
            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setActiveTab("public")}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2",
                  activeTab === "public" 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Globe className="w-4 h-4" />
                Public ({publicDesigns.length})
              </button>
              <button
                onClick={() => setActiveTab("private")}
                className={cn(
                  "px-4 py-2 text-sm font-medium transition-colors flex items-center gap-2",
                  activeTab === "private" 
                    ? "bg-primary text-primary-foreground" 
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Lock className="w-4 h-4" />
                Private ({privateDesigns.length})
              </button>
            </div>
          </div>

          {displayedDesigns.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {displayedDesigns.map((design, index) => {
                const isPublic = design.visibility === "public";
                const likes = isPublic ? getLikeCount(design) : 0;
                const comments = isPublic ? getCommentCount(design.id) : 0;
                const likedByMe = isPublic ? Boolean(likedByMeByDesignId[design.id]) : false;
                const likeBusy = isPublic ? Boolean(likeBusyByDesignId[design.id]) : false;

                return (
                  <motion.div
                    key={design.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="card-hover group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FolderOpen className="w-5 h-5 text-primary" />
                          </div>
                          <span
                            className={cn(
                              "px-2 py-1 rounded-full text-xs",
                              isPublic ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                            )}
                          >
                            {isPublic ? "Public" : "Private"}
                          </span>
                        </div>

                        <h3 className="font-semibold text-foreground mb-1">
                          {design.canonicalDesign?.title || design.title}
                        </h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {design.canonicalDesign?.purpose ||
                            design.constraints?.purpose ||
                            design.constraints?.productType ||
                            ""}
                        </p>

                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
                          <Clock className="w-3 h-3" />
                          {formatDate(new Date(design.created_at).getTime())}
                        </div>

                        {isPublic && (
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant={likedByMe ? "default" : "outline"}
                                className="gap-1.5"
                                disabled={likedByMe || likeBusy}
                                onClick={() => handleLikeDesign(design.id)}
                              >
                                <Heart className={cn("w-4 h-4", likedByMe && "fill-current")} />
                                {likeBusy ? "Liking..." : likedByMe ? "Liked" : "Like"}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5"
                                onClick={() => handleOpenComments(design)}
                              >
                                <MessageCircle className="w-4 h-4" />
                                Comment
                              </Button>
                            </div>
                            <p className="text-xs text-muted-foreground">{likes} likes | {comments} comments</p>
                          </div>
                        )}

                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Link to={`/designs/${design.id}`} className="flex-1">
                            <Button size="sm" variant="ghost" className="w-full gap-1">
                              <Eye className="w-3 h-3" />
                              View
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleVisibility(design.id, design.visibility)}
                          >
                            {isPublic ? (
                              <Lock className="w-3 h-3" />
                            ) : (
                              <Globe className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => handleDelete(design.id)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <FolderOpen className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-1">
                  No {activeTab} designs yet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Complete a design workflow to post it here
                </p>
                <Link to="/design/new">
                  <Button variant="gradient">Start New Design</Button>
                </Link>
              </CardContent>
            </Card>
          )}
          </motion.div>
        )}
      </div>

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
              {activeCommentDesign?.title || activeCommentDesign?.canonicalDesign?.title || "Public design discussion"}
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
                  const author = commentAuthorByUserId[comment.user_id];
                  const authorName =
                    author?.display_name ||
                    (comment.user_id === user?.id
                      ? displayName
                      : `${comment.user_id.slice(0, 8)}`);
                  const authorHandle = `@${comment.user_id.slice(0, 8)}`;
                  const profilePath = comment.user_id === user?.id ? "/profile" : `/profile/${comment.user_id}`;

                  return (
                    <div key={comment.id} className="rounded-lg border border-border p-3">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <Link to={profilePath} className="flex items-center gap-2 min-w-0">
                          <Avatar className="w-7 h-7">
                            {author?.avatar ? <AvatarImage src={author.avatar} alt={authorName} /> : null}
                            <AvatarFallback className="text-[10px] font-semibold">
                              {(authorName || "U").slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{authorName}</p>
                            <p className="text-[11px] text-muted-foreground truncate">{authorHandle}</p>
                          </div>
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

