import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Search, 
  Filter, 
  Grid, 
  List, 
  FolderOpen,
  Clock,
  TrendingUp,
  MoreVertical,
  Trash2,
  Copy,
  Eye,
  Edit,
  Download,
  Share2
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import {
  SavedDesign,
  getGuestDesigns,
  deleteGuestDesign,
  saveGuestDesignRecord,
} from "@/services/designStorage";
import { useToast } from "@/hooks/use-toast";
import { GuidedTooltip } from "@/components/ui/guided-tooltip";
import { getMyDesigns, deleteDesign } from "@/services/designs.service";
import { buildDesignShareMessage } from "@/services/designShareMessage";
import { getAcceptedFriendsForUser, sendMessageToFriend, type ChatFriend } from "@/services/messages.service";
import { generateFullWorkflowPDF } from "@/utils/pdfExport";
import type { WorkflowStep } from "@/types/workflow";

const filterOptions = ["All", "Recent", "Oldest"];
const sortOptions = [
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Name A-Z", value: "name-asc" },
  { label: "Name Z-A", value: "name-desc" },
];

export default function PreviousDesignsPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");
  const [sortBy, setSortBy] = useState("newest");
  const [designs, setDesigns] = useState<(SavedDesign & { source: "local" | "remote" | "guest" })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<(SavedDesign & { source: "local" | "remote" | "guest" }) | null>(null);
  const [friends, setFriends] = useState<ChatFriend[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isSendingToFriendId, setIsSendingToFriendId] = useState<string | null>(null);
  
  const { user, isGuest } = useAuth();
  const { toast } = useToast();

  const mapRemoteDesign = (design: any): SavedDesign & { source: "remote" } => {
    const canonical = design?.canonicalDesign ?? design?.content?.design ?? null;
    const constraints = design?.constraints ?? {};
    const workflow = Array.isArray(design?.workflow)
      ? design.workflow
      : Array.isArray(canonical?.steps)
        ? canonical.steps
        : [];
    const safeText = (value: any) =>
      typeof value === "string" && value !== "undefined" ? value : "";

    const productType =
      safeText(canonical?.product_type) ||
      safeText(constraints.productType) ||
      safeText(constraints.product_type) ||
      safeText(constraints.type) ||
      "";
    const purpose =
      safeText(canonical?.purpose) ||
      safeText(constraints.purpose) ||
      safeText(constraints.description);

    return {
      id: design.id,
      name:
        typeof canonical?.title === "string"
          ? canonical.title
          : typeof design.title === "string"
            ? design.title
            : "",
      timestamp: design.created_at ? new Date(design.created_at).getTime() : Date.now(),
      data: {
        productType,
        purpose,
        workflowSteps: workflow,
        previewImage:
          design?.preview_image ||
          canonical?.previewImage ||
          canonical?.preview_image ||
          canonical?.imageUrl ||
          canonical?.image_url ||
          canonical?.thumbnail ||
          canonical?.thumbnailUrl ||
          canonical?.image ||
          null,
      },
      version: 1,
      userId: design.user_id || "",
      source: "remote",
    };
  };

  const mapGuestDesign = (design: SavedDesign): SavedDesign & { source: "guest" } => ({
    ...design,
    source: "guest",
  });

  // Load designs from Supabase (authenticated)
  useEffect(() => {
    const loadDesigns = async () => {
      try {
        if (!user || isGuest) {
          const guestDesigns = await getGuestDesigns();
          setDesigns((guestDesigns || []).map(mapGuestDesign));
          return;
        }

        const remoteDesigns = await getMyDesigns(user.id);
        const mapped = (remoteDesigns || []).map(mapRemoteDesign);
        setDesigns(mapped);
      } catch (error) {
        console.error("Failed to load designs:", error);
        setDesigns([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadDesigns();
  }, [user, isGuest]);

  useEffect(() => {
    if (!isShareOpen || !user?.id || isGuest) return;
    let isMounted = true;
    const loadFriends = async () => {
      setIsLoadingFriends(true);
      try {
        const data = await getAcceptedFriendsForUser(user.id);
        if (isMounted) setFriends(data);
      } catch (error: any) {
        if (!isMounted) return;
        toast({
          title: "Unable to load friends",
          description: error?.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        if (isMounted) setIsLoadingFriends(false);
      }
    };
    loadFriends();
    return () => {
      isMounted = false;
    };
  }, [isShareOpen, user?.id, isGuest, toast]);

  // Filter and sort designs
  const filteredDesigns = designs
    .filter((design) => {
      const matchesSearch = 
        design.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        design.data.productType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        design.data.purpose?.toLowerCase().includes(searchQuery.toLowerCase());
      
      if (activeFilter === "All") return matchesSearch;
      if (activeFilter === "Recent") {
        const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        return matchesSearch && design.timestamp > oneWeekAgo;
      }
      return matchesSearch;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return a.timestamp - b.timestamp;
        case "name-asc":
          return a.name.localeCompare(b.name);
        case "name-desc":
          return b.name.localeCompare(a.name);
        default:
          return b.timestamp - a.timestamp;
      }
    });

  const handleDelete = async (id: string) => {
    try {
      if (isGuest || !user) {
        await deleteGuestDesign(id);
      } else {
        await deleteDesign(id);
      }
      setDesigns((prev) => prev.filter((d) => d.id !== id));
      toast({
        title: "Design deleted",
        description: isGuest
          ? "The design has been removed from this guest session."
          : "The design has been removed from the database.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete design.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicate = async (design: SavedDesign) => {
    if ((design as any).source === "remote") {
      toast({
        title: "Not available yet",
        description: "Duplicate is not available for cloud designs yet.",
      });
      return;
    }

    const ownerId = user?.id || "guest_session";
    const duplicate: SavedDesign = {
      ...design,
      id: `design_${Date.now()}`,
      name: `${design.name} (Copy)`,
      timestamp: Date.now(),
      version: 1,
      userId: ownerId,
    };

    try {
      if (isGuest || !user) {
        await saveGuestDesignRecord(duplicate);
        setDesigns((prev) => [{ ...duplicate, source: "guest" }, ...prev]);
      } else {
        setDesigns((prev) => [{ ...duplicate, source: "local" }, ...prev]);
      }
      toast({
        title: "Design duplicated",
        description: "A copy has been created.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate design.",
        variant: "destructive",
      });
    }
  };

  const handleExport = (design: SavedDesign) => {
    const rawSteps = Array.isArray(design.data?.workflowSteps)
      ? design.data.workflowSteps
      : Array.isArray(design.designDraft?.workflow)
        ? design.designDraft.workflow
        : Array.isArray(design.canonicalDesign?.steps)
          ? design.canonicalDesign.steps
          : [];

    const steps: WorkflowStep[] = rawSteps
      .map((step: any, index: number) => ({
        id: String(step?.id ?? index + 1),
        title: String(step?.title ?? `Step ${index + 1}`),
        description: String(step?.description ?? ""),
        duration: typeof step?.duration === "string" ? step.duration : undefined,
        effort:
          step?.effort === "Low" || step?.effort === "Medium" || step?.effort === "High"
            ? step.effort
            : undefined,
        completed: Boolean(step?.completed),
        materials: Array.isArray(step?.materials) ? step.materials : undefined,
        safetyNote: typeof step?.safetyNote === "string" ? step.safetyNote : undefined,
      }))
      .filter((step) => step.title || step.description);

    generateFullWorkflowPDF(steps, design.name || "Design Workflow");
    toast({
      title: "Design exported",
      description: "Workflow PDF is ready to save/download.",
    });
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getFriendInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const openShareForDesign = (design: SavedDesign & { source: "local" | "remote" | "guest" }) => {
    setShareTarget(design);
    setIsShareOpen(true);
  };

  const copyShareLink = async () => {
    if (!shareTarget?.id) return;
    const shareUrl = `${window.location.origin}/designs/${shareTarget.id}?mode=read`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied",
        description: "Link copied",
      });
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy link. Please try again.",
        variant: "destructive",
      });
    }
  };

  const sendSharedDesignToFriend = async (friendId: string) => {
    if (!user?.id || isGuest) {
      toast({
        title: "Login required",
        description: "Login first to access this feature.",
        variant: "destructive",
      });
      return;
    }
    if (!shareTarget?.id) {
      toast({
        title: "Design unavailable",
        description: "Unable to share this design right now.",
        variant: "destructive",
      });
      return;
    }

    const shareUrl = `${window.location.origin}/designs/${shareTarget.id}?mode=read`;
    const message = buildDesignShareMessage({
      text: "Shared a design with you",
      designId: shareTarget.id,
      title: shareTarget.name || "Untitled design",
      previewImage: (shareTarget as any)?.data?.previewImage ?? null,
      url: shareUrl,
    });

    setIsSendingToFriendId(friendId);
    try {
      await sendMessageToFriend(user.id, friendId, message);
      toast({
        title: "Sent",
        description: "Design link sent to your friend.",
      });
    } catch (error: any) {
      toast({
        title: "Send failed",
        description: error?.message || "Unable to send design right now.",
        variant: "destructive",
      });
    } finally {
      setIsSendingToFriendId(null);
    }
  };

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div className="flex items-center gap-2">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-1">
                My Designs
              </h1>
              <p className="text-muted-foreground">
                Browse and manage all your product designs
              </p>
            </div>
            <GuidedTooltip
              content="Your designs are stored securely in Supabase."
              variant="help"
            />
          </div>
          <Link to="/design/new">
            <Button variant="gradient" className="gap-2">
              Create New Design
            </Button>
          </Link>
        </motion.div>

        {isGuest && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="p-4 rounded-xl bg-warning/10 border border-warning/20"
          >
            <p className="text-sm text-warning-foreground">
              <strong>Guest Mode:</strong> Sign up to save your designs.
            </p>
          </motion.div>
        )}

        {/* Search & Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search designs by name, type, or purpose..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <Filter className="w-4 h-4" />
                  {activeFilter}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {filterOptions.map((option) => (
                  <DropdownMenuItem
                    key={option}
                    onClick={() => setActiveFilter(option)}
                  >
                    {option}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  Sort
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                {sortOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setSortBy(option.value)}
                    className={sortBy === option.value ? "bg-accent" : ""}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex rounded-lg border border-border overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "grid" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                <Grid className="w-5 h-5" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={cn(
                  "p-2 transition-colors",
                  viewMode === "list" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                )}
              >
                <List className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Designs Grid/List */}
        {!isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className={cn(
              viewMode === "grid"
                ? "grid sm:grid-cols-2 lg:grid-cols-3 gap-4"
                : "space-y-3"
            )}
          >
            {filteredDesigns.map((design, index) => (
              <motion.div
                key={design.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card className="card-hover group">
                  <CardContent className={cn(
                    "p-4",
                    viewMode === "list" && "flex items-center justify-between"
                  )}>
                    {viewMode === "grid" ? (
                      <>
                        <div className="flex items-start justify-between mb-3">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                            <FolderOpen className="w-6 h-6 text-primary" />
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => navigate(`/designs/${design.id}`)}>
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDuplicate(design)}>
                                <Copy className="w-4 h-4 mr-2" />
                                Duplicate
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openShareForDesign(design)}>
                                <Share2 className="w-4 h-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => handleExport(design)}>
                                <Download className="w-4 h-4 mr-2" />
                                Export PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="text-destructive"
                                onClick={() => handleDelete(design.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <h3 className="font-semibold text-foreground mb-1">{design.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                          {design.data.purpose || design.data.productType || "No description"}
                        </p>

                        <div className="flex items-center gap-2 mb-3 text-sm">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{formatDate(design.timestamp)}</span>
                          <span className="text-muted-foreground/50">•</span>
                          <span className="text-muted-foreground">v{design.version}</span>
                        </div>

                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {design.data.productType || "Design"}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/designs/${design.id}`)}
                              className="gap-1"
                            >
                              <Eye className="w-3 h-3" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleExport(design)}
                              className="gap-1"
                            >
                              <Download className="w-3 h-3" />
                              Export
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openShareForDesign(design)}
                              className="gap-1"
                            >
                              <Share2 className="w-3 h-3" />
                              Share
                            </Button>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <FolderOpen className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold text-foreground">{design.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {design.data.purpose || design.data.productType || "No description"}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-sm text-muted-foreground">{formatDate(design.timestamp)}</div>
                          <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                            {design.data.productType || "Design"}
                          </span>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleExport(design)}
                          >
                            <Download className="w-4 h-4 mr-1" />
                            Export
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openShareForDesign(design)}
                          >
                            <Share2 className="w-4 h-4 mr-1" />
                            Share
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/designs/${design.id}`)}
                          >
                            View
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}

        {!isLoading && filteredDesigns.length === 0 && (
          <div className="text-center py-12">
            <FolderOpen className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-1">No designs found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? "Try adjusting your search or filter criteria" : "Start by creating your first design!"}
            </p>
          </div>
        )}
      </div>

      <Dialog open={isShareOpen} onOpenChange={setIsShareOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Share Design</DialogTitle>
            <DialogDescription>
              Copy the design link or send it directly to your friends.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <section className="space-y-3">
              <p className="text-sm font-medium text-foreground">Copy Link</p>
              <Button type="button" variant="outline" onClick={copyShareLink} className="w-full" disabled={!shareTarget?.id}>
                Copy design URL
              </Button>
            </section>

            <section className="space-y-3">
              <p className="text-sm font-medium text-foreground">Share with Friends</p>

              {isGuest && (
                <Card>
                  <CardContent className="py-4 text-sm text-muted-foreground">
                    Login first to access this feature.
                  </CardContent>
                </Card>
              )}

              {!isGuest && isLoadingFriends && (
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <Card key={idx}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-40" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <Skeleton className="h-9 w-28" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {!isGuest && !isLoadingFriends && friends.length === 0 && (
                <Card>
                  <CardContent className="py-4 text-sm text-muted-foreground">
                    No accepted friends found.
                  </CardContent>
                </Card>
              )}

              {!isGuest && !isLoadingFriends && friends.length > 0 && (
                <div className="max-h-[340px] overflow-y-auto space-y-2 pr-1">
                  {friends.map((friend) => (
                    <Card key={friend.id}>
                      <CardContent className="p-3 flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          {friend.avatar ? <AvatarImage src={friend.avatar} alt={friend.display_name} /> : null}
                          <AvatarFallback>{getFriendInitials(friend.display_name)}</AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm truncate">{friend.display_name}</p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => sendSharedDesignToFriend(friend.id)}
                          disabled={Boolean(isSendingToFriendId) || !shareTarget?.id}
                        >
                          {isSendingToFriendId === friend.id ? "Sending..." : "Send Design"}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
