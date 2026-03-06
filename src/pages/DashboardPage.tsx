import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMyDesigns } from "@/services/designs.service";
import { getMyProfile } from "@/services/profiles.service";
import { getGuestDesigns } from "@/services/designStorage";
import { motion } from "framer-motion";
import {
  Plus,
  FolderOpen,
  CheckCircle2,
  Gauge,
  ArrowRight,
  Sparkles,
  MessageSquare,
  Layers,
  Heart,
  MessageCircle,
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const [designs, setDesigns] = useState<any[]>([]);
  const [profileName, setProfileName] = useState<string>("");
  const [authGreeting, setAuthGreeting] = useState<"signup" | "login" | "">("");
  const [activityFeed, setActivityFeed] = useState<any[]>([]);
  const [peopleById, setPeopleById] = useState<Record<string, { display_name: string | null; avatar: string | null }>>({});
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);
  const { user, isGuest } = useAuth();

  const totalDesigns = designs.length;

  const resolveStatus = (design: any) => {
    if (typeof design?.status === "string" && design.status.trim()) {
      return design.status.toLowerCase();
    }
    if (typeof design?.designDraft?.status === "string" && design.designDraft.status.trim()) {
      return design.designDraft.status.toLowerCase();
    }
    if (typeof design?.data?.designDraft?.status === "string" && design.data.designDraft.status.trim()) {
      return design.data.designDraft.status.toLowerCase();
    }
    return "";
  };

  const resolveFeasibilityScore = (design: any) => {
    if (typeof design?.feasibilityScore === "number") return design.feasibilityScore;
    if (typeof design?.feasibility_score === "number") return design.feasibility_score;
    if (typeof design?.designDraft?.feasibilityScore === "number") return design.designDraft.feasibilityScore;
    if (typeof design?.data?.designDraft?.feasibilityScore === "number") return design.data.designDraft.feasibilityScore;
    return null;
  };

  const completedDesigns = designs.filter((design) => {
    const status = resolveStatus(design);
    return status === "completed" || status === "finalized";
  }).length;

  const feasibilityValues = designs
    .map((design) => resolveFeasibilityScore(design))
    .filter((value) => typeof value === "number") as number[];

  const avgFeasibility = feasibilityValues.length
    ? Math.round(feasibilityValues.reduce((sum, value) => sum + value, 0) / feasibilityValues.length)
    : null;

  useEffect(() => {
    let isMounted = true;

    const loadDesigns = async () => {
      try {
        const data = isGuest ? await getGuestDesigns() : user?.id ? await getMyDesigns(user.id) : [];
        if (isMounted) setDesigns(data || []);
      } catch (err) {
        console.error("Failed to load designs", err);
      }
    };

    loadDesigns();

    const handleDesignsUpdated = () => loadDesigns();
    const handleVisibilityChange = () => {
      if (!document.hidden) loadDesigns();
    };

    window.addEventListener("designs:updated", handleDesignsUpdated);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      window.removeEventListener("designs:updated", handleDesignsUpdated);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, isGuest]);

  useEffect(() => {
    if (isGuest) {
      setAuthGreeting("login");
      setProfileName("Guest");
      return;
    }
    if (!user?.id) return;

    const lastAction = localStorage.getItem("auth:last_action");
    if (lastAction === "signup" || lastAction === "login") {
      setAuthGreeting(lastAction);
      localStorage.removeItem("auth:last_action");
    } else {
      setAuthGreeting("login");
    }

    let isMounted = true;
    const loadProfile = async () => {
      try {
        const profile = await getMyProfile();
        if (isMounted) setProfileName(profile.full_name || "");
      } catch {
        if (isMounted) setProfileName("");
      }
    };

    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user, isGuest]);

  useEffect(() => {
    if (!user?.id || isGuest) {
      setActivityFeed([]);
      setPeopleById({});
      return;
    }

    let isMounted = true;

    const loadActivityFeed = async () => {
      setIsLoadingActivity(true);
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
        if (isMounted) setIsLoadingActivity(false);
      }
    };

    loadActivityFeed();

    const channel = supabase
      .channel(`activity-feed-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "activity_feed",
        },
        () => {
          loadActivityFeed();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id, isGuest]);

  const displayName =
    profileName ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.display_name ||
    user?.user_metadata?.name ||
    user?.email?.split("@")[0] ||
    "";

  const greeting =
    authGreeting === "signup"
      ? `Welcome, ${displayName || "Designer"}!`
      : displayName
      ? `Welcome back, ${displayName}!`
      : "Welcome back!";

  const getDisplayNameForFeedUser = (userId: string) => {
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
    const actor = getDisplayNameForFeedUser(item.user_id);
    if (item.activity_type === "design_liked") return `${actor} liked a design`;
    return `${actor} shared a new design`;
  };

  return (
    <AppLayout>
      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">{greeting}</h1>
            <p className="text-muted-foreground">Smart Design Assistance with AI</p>
            {isGuest && <p className="text-sm text-warning mt-2">Guest Mode (data will be lost on logout/close).</p>}
          </div>
          <Link to="/design/new">
            <Button variant="gradient" size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              New Design
            </Button>
          </Link>
        </motion.div>

        <motion.div variants={itemVariants} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="transition-all duration-200 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <FolderOpen className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="mt-5">
                <p className="text-sm font-medium text-muted-foreground">Total Designs</p>
                <p className="text-3xl font-bold text-foreground mt-1">{totalDesigns}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {totalDesigns === 0 ? "No designs yet - start your first one." : "All saved designs in your workspace."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
                  <CheckCircle2 className="w-6 h-6 text-success" />
                </div>
              </div>
              <div className="mt-5">
                <p className="text-sm font-medium text-muted-foreground">Completed Designs</p>
                <p className="text-3xl font-bold text-foreground mt-1">{completedDesigns}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {completedDesigns === 0 ? "No completed designs yet." : "Marked completed/finalized."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="transition-all duration-200 hover:shadow-md">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
                  <Gauge className="w-6 h-6 text-accent-foreground" />
                </div>
              </div>
              <div className="mt-5">
                <p className="text-sm font-medium text-muted-foreground">Average Feasibility</p>
                <p className="text-3xl font-bold text-foreground mt-1">{avgFeasibility === null ? "—" : `${avgFeasibility}%`}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {avgFeasibility === null ? "N/A until completed designs have scores." : "Based on completed/finalized designs."}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <h2 className="text-xl font-semibold text-foreground mb-4">Quick Actions</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link to="/design/new">
              <Card className="card-hover group cursor-pointer border-dashed border-2 hover:border-primary/50">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Sparkles className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Start New Design</p>
                    <p className="text-sm text-muted-foreground">Create with AI assistance</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/designs">
              <Card className="card-hover group cursor-pointer">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center group-hover:bg-success/20 transition-colors">
                    <FolderOpen className="w-6 h-6 text-success" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">View Previous Designs</p>
                    <p className="text-sm text-muted-foreground">Browse your projects</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/ai-suggestions">
              <Card className="card-hover group cursor-pointer">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/20 transition-colors">
                    <MessageSquare className="w-6 h-6 text-accent-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">AI Suggestions</p>
                    <p className="text-sm text-muted-foreground">Chat with AI assistant</p>
                  </div>
                </CardContent>
              </Card>
            </Link>

            <Link to="/templates">
              <Card className="card-hover group cursor-pointer">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-warning/10 flex items-center justify-center group-hover:bg-warning/20 transition-colors">
                    <Layers className="w-6 h-6 text-warning" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">Explore Templates</p>
                    <p className="text-sm text-muted-foreground">Start from examples</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        </motion.div>

        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Activity Feed</h2>
          </div>

          {isLoadingActivity ? (
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
                const actorName = getDisplayNameForFeedUser(item.user_id);
                const actorAvatar = peopleById[item.user_id]?.avatar ?? null;
                const design = item.design;
                const designTitle = typeof design?.title === "string" && design.title.trim() ? design.title : "Untitled design";
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

        <motion.div variants={itemVariants}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-foreground">Recent Designs</h2>
            <Link to="/designs" className="text-sm text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid gap-4">
            {designs.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-muted-foreground">No designs yet. Create your first one!</CardContent>
              </Card>
            ) : (
              designs.slice(0, 3).map((design) => {
                const title = typeof design?.title === "string" ? design.title.trim() : "";
                const feasibility = typeof design?.feasibilityScore === "number" ? `${design.feasibilityScore}%` : "N/A";
                const status = typeof design?.status === "string" && design.status.trim() ? design.status : "unknown";

                return (
                  <Card key={design.id} className="card-hover">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                          <FolderOpen className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{title}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span>Feasibility: {feasibility}</span>
                            <span className="text-muted-foreground/50">•</span>
                            <span className="capitalize">Status: {status}</span>
                          </div>
                        </div>
                      </div>

                      <Link to={`/designs/${design.id}`}>
                        <Button variant="ghost" size="sm">
                          View
                          <ArrowRight className="w-4 h-4 ml-1" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}

