import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { generateFullWorkflowPDF } from "@/utils/pdfExport";
import { 
  CheckCircle, 
  Globe, 
  Lock, 
  Download, 
  Share2,
  FolderOpen,
  ArrowRight,
  PartyPopper
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { createDesign as createRemoteDesign } from "@/services/designs.service";
import { saveGuestDesign } from "@/services/designStorage";
import { buildDesignShareMessage } from "@/services/designShareMessage";
import { getAcceptedFriendsForUser, sendMessageToFriend, type ChatFriend } from "@/services/messages.service";
import type { Design } from "@/types/design";
import { useDesignDraft } from "@/contexts/DesignDraftContext";


export default function DesignCompletePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { designDraft } = useDesignDraft();
  const title = String(designDraft.productName || "").trim();
  const workflow = Array.isArray(designDraft.workflowSteps)
    ? designDraft.workflowSteps
    : [];
  const constraints = {
    description: String(designDraft.purpose || ""),
    materials: Array.isArray(designDraft.preferredMaterials)
      ? designDraft.preferredMaterials
      : [],
    tools: Array.isArray(designDraft.availableTools)
      ? designDraft.availableTools
      : [],
    notes: String(designDraft.safetyRequirements || ""),
    productType: String(designDraft.productType || ""),
    purpose: String(designDraft.purpose || ""),
  };
  
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedDesignId, setLastSavedDesignId] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [friends, setFriends] = useState<ChatFriend[]>([]);
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);
  const [isSendingToFriendId, setIsSendingToFriendId] = useState<string | null>(null);
  const [hasSavedDesign, setHasSavedDesign] = useState(false);
  const [shareTitle, setShareTitle] = useState("Untitled design");
  const [sharePreviewImage, setSharePreviewImage] = useState<string | null>(null);
  const shareDesignId =
    lastSavedDesignId ||
    (typeof location.state?.designId === "string" ? location.state.designId : null);
  const saveStatusFromFlow =
    location.state?.saveStatus === "completed" ? "completed" : "saved";

  const calculateFeasibilityScore = () => {
    const steps = Array.isArray(workflow) ? workflow : [];
    const completedSteps = steps.filter((step: any) => step?.completed).length;
    const stepScore = steps.length > 0 ? (completedSteps / steps.length) * 40 : 0;
    const materialsScore = Math.min(
      (Array.isArray(designDraft.preferredMaterials)
        ? designDraft.preferredMaterials.length
        : 0) * 5,
      20
    );
    const toolsScore = Math.min(
      (Array.isArray(designDraft.availableTools)
        ? designDraft.availableTools.length
        : 0) * 3,
      15
    );
    const sustainabilityScore = designDraft.sustainabilityPriority ? 10 : 0;
    const budgetPenalty =
      typeof designDraft.budget === "number" && designDraft.budget < 1000 ? -8 : 0;
    const raw = 35 + stepScore + materialsScore + toolsScore + sustainabilityScore + budgetPenalty;
    return Math.max(35, Math.min(98, Math.round(raw)));
  };

  const buildCanonicalDesign = (
    draft: {
      title: string;
      workflow: any[];
      constraints: any;
      description?: string;
      feasibilityScore?: number | null;
    },
    nextVisibility: "public" | "private"
  ): Design => {
    const created_at = new Date().toISOString();
    const productName = String(draft.title || "").trim();
    const timeAvailable = Array.isArray(designDraft.timeWeeks)
      ? `${designDraft.timeWeeks[0]} weeks`
      : "";

    return {
      id: "pending",
      user_id: user?.id ?? null,
      title: productName,
      product_name: productName,
      product_type: String(designDraft.productType || ""),
      purpose: String(designDraft.purpose || ""),
      target_user: String(designDraft.targetUser || ""),
      environment: String(designDraft.environment || ""),
      skill_level: String(designDraft.skillLevel || ""),
      budget: typeof designDraft.budget === "number" ? designDraft.budget : 0,
      time_available: timeAvailable,
      safety_constraints: String(designDraft.safetyRequirements || ""),
      materials: Array.isArray(designDraft.preferredMaterials)
        ? designDraft.preferredMaterials
        : [],
      tools: Array.isArray(designDraft.availableTools)
        ? designDraft.availableTools
        : [],
      sustainability: Boolean(designDraft.sustainabilityPriority),
      estimated_cost:
        typeof designDraft.estimatedCost === "number"
          ? designDraft.estimatedCost
          : null,
      steps: Array.isArray(draft.workflow) ? draft.workflow : [],
      visibility: nextVisibility,
      created_at,
    };
  };

  const saveDesign = async (
    designDraft: {
      title: string;
      workflow: any[];
      constraints: any;
      description?: string;
      feasibilityScore?: number | null;
    },
    visibility: "public" | "private"
  ) => {
    if (!designDraft.title) {
      toast({
        title: "Product name required",
        description: "Please provide a product name before saving.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const canonicalDesign = buildCanonicalDesign(designDraft, visibility);

      if (!user || isGuest) {
        await saveGuestDesign({
          designDraft,
          canonicalDesign,
          visibility,
          status: saveStatusFromFlow,
        });

        toast({
          title: "Design saved for this guest session",
          description: "Guest data is temporary and will be cleared on logout/close.",
        });

        navigate("/designs");
        return;
      }

      const data = await createRemoteDesign({
        title: designDraft.title,
        workflow: designDraft.workflow,
        constraints: designDraft.constraints,
        status: saveStatusFromFlow,
        visibility,
        description: designDraft.description,
        feasibilityScore: designDraft.feasibilityScore ?? calculateFeasibilityScore(),
        canonicalDesign,
      });

      console.log("CREATED DESIGN:", data);

      if (!data?.id) {
        throw new Error("No design ID returned");
      }

      setLastSavedDesignId(data.id);
      setHasSavedDesign(true);
      setShareModalOpen(true);
      toast({
        title: "Design saved",
        description: "Now you can share it with friends before leaving this page.",
      });
    } catch (error) {
      console.error(error);
      toast({
        title: "Error saving design",
        description: "Save failed. Your design was not saved.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };


  const handleExportDesign = () => {
    const exportTitle =
      title ||
      (typeof designDraft.productName === "string" ? designDraft.productName : "") ||
      (typeof designDraft.selectedConceptName === "string" ? designDraft.selectedConceptName : "") ||
      "Design Workflow";

    generateFullWorkflowPDF(workflow, exportTitle);
    toast({
      title: "Workflow PDF Generated",
      description: "Your design workflow PDF is ready.",
    });
  };

  const handleShareDesign = async () => {
    setShareModalOpen(true);
  };

  const copyShareLink = async () => {
    const shareUrl = shareDesignId
      ? `${window.location.origin}/designs/${shareDesignId}?mode=read`
      : `${window.location.origin}${window.location.pathname}?mode=read`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied",
        description: "Link copied",
      });
    } catch (error) {
      console.error("Failed to copy share link:", error);
      toast({
        title: "Copy failed",
        description: "Unable to copy link. Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!shareModalOpen || !user?.id || isGuest) return;

    let isMounted = true;
    const loadFriends = async () => {
      setIsLoadingFriends(true);
      try {
        const list = await getAcceptedFriendsForUser(user.id);
        if (isMounted) setFriends(list);
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
  }, [shareModalOpen, user?.id, isGuest, toast]);

  useEffect(() => {
    const fallbackTitle =
      title ||
      (typeof designDraft.productName === "string" ? designDraft.productName : "") ||
      (typeof designDraft.selectedConceptName === "string" ? designDraft.selectedConceptName : "") ||
      "Untitled design";
    setShareTitle(fallbackTitle);
    setSharePreviewImage(null);

    if (!shareDesignId) return;
    let isMounted = true;
    const loadDesignForShare = async () => {
      const { data, error } = await supabase
        .from("designs")
        .select("id, title, preview_image, content")
        .eq("id", shareDesignId)
        .single();

      if (!isMounted || error || !data) return;

      const fromContent = data.content?.design ?? data.content ?? {};
      const resolvedPreview =
        data.preview_image ||
        fromContent?.previewImage ||
        fromContent?.preview_image ||
        fromContent?.imageUrl ||
        fromContent?.image_url ||
        fromContent?.thumbnail ||
        fromContent?.thumbnailUrl ||
        fromContent?.image ||
        null;
      setShareTitle(data.title || fallbackTitle);
      setSharePreviewImage(typeof resolvedPreview === "string" ? resolvedPreview : null);
    };

    loadDesignForShare();
    return () => {
      isMounted = false;
    };
  }, [shareDesignId, title, designDraft.productName, designDraft.selectedConceptName]);

  const getFriendInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "U";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  };

  const handleSendDesignToFriend = async (friendId: string) => {
    if (!user?.id || isGuest) {
      toast({
        title: "Login required",
        description: "Login first to access this feature.",
        variant: "destructive",
      });
      return;
    }
    if (!shareDesignId) {
      toast({
        title: "Save design first",
        description: "Please save this design before sharing with friends.",
        variant: "destructive",
      });
      return;
    }

    const shareUrl = `${window.location.origin}/designs/${shareDesignId}?mode=read`;
    const message = buildDesignShareMessage({
      text: "Shared a design with you",
      designId: shareDesignId,
      title: shareTitle,
      previewImage: sharePreviewImage,
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
      <div className="max-w-2xl mx-auto">
        {/* Success Animation */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-8"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="w-24 h-24 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6"
          >
            <PartyPopper className="w-12 h-12 text-success" />
          </motion.div>
          
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Congratulations!</h1>
          <p className="text-muted-foreground">
            You've completed your design workflow for{" "}
            <span className="font-medium text-foreground">
              {designDraft.productName || designDraft.selectedConceptName || "your design"}
            </span>
          </p>
        </motion.div>

        {/* Design Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="mb-6">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">Design Summary</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Product Name</span>
                  <span className="font-medium text-foreground">
                    {designDraft.productName || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Concept</span>
                  <span className="font-medium text-foreground">
                    {designDraft.selectedConceptName || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Cost</span>
                  <span className="font-medium text-foreground">
                    {"\u20B9"}{designDraft.estimatedCost?.toLocaleString() || "N/A"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Workflow Steps</span>
                  <span className="font-medium text-foreground">{workflow?.length || 7} steps</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Visibility Selection */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mb-6"
        >
          <h2 className="text-lg font-semibold text-foreground mb-4">
            How would you like to save your design?
          </h2>
          
          <div className="grid sm:grid-cols-2 gap-4">
            <Card
              className={cn(
                "cursor-pointer transition-all",
                visibility === "public" 
                  ? "ring-2 ring-primary bg-primary/5" 
                  : "hover:border-primary/50"
              )}
              onClick={() => setVisibility("public")}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  visibility === "public" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Globe className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Post Publicly</p>
                  <p className="text-sm text-muted-foreground">
                    Share on your profile for others to see
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card
              className={cn(
                "cursor-pointer transition-all",
                visibility === "private" 
                  ? "ring-2 ring-primary bg-primary/5" 
                  : "hover:border-primary/50"
              )}
              onClick={() => setVisibility("private")}
            >
              <CardContent className="p-4 flex items-start gap-4">
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center",
                  visibility === "private" ? "bg-primary text-primary-foreground" : "bg-muted"
                )}>
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-medium text-foreground">Keep Private</p>
                  <p className="text-sm text-muted-foreground">
                    Save only for yourself
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {isGuest && (
            <p className="text-sm text-warning mt-4">
              Guest Mode (data will be lost on logout/close).
            </p>
          )}
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="space-y-3"
        >
          <Button
            variant="gradient"
            size="lg"
            className="w-full gap-2"
            onClick={() =>
              saveDesign(
                {
                  title,
                  workflow,
                  constraints,
                  description:
                    typeof designDraft.purpose === "string"
                      ? designDraft.purpose
                      : "",
                  feasibilityScore: calculateFeasibilityScore(),
                },
                visibility
              )
            }
            disabled={isSaving}
            title={isGuest ? "Saves for this guest session only" : ""}
          >
            {isSaving ? (
              <>Saving...</>
            ) : visibility === "public" ? (
              <>
                <Globe className="w-5 h-5" />
                Post to Profile
              </>
            ) : (
              <>
                <FolderOpen className="w-5 h-5" />
                Save to My Designs
              </>
            )}
          </Button>


          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2" onClick={handleExportDesign}>
              <Download className="w-4 h-4" />
              Export Design
            </Button>
            <Button variant="outline" className="flex-1 gap-2" onClick={handleShareDesign}>
              <Share2 className="w-4 h-4" />
              Share with Friends
            </Button>
          </div>

          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => navigate(hasSavedDesign ? "/designs" : "/dashboard")}
          >
            {hasSavedDesign ? "Go to My Designs" : "Return to Dashboard"}
          </Button>
        </motion.div>
      </div>

      <Dialog open={shareModalOpen} onOpenChange={setShareModalOpen}>
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
              <Button type="button" variant="outline" onClick={copyShareLink} className="w-full">
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
                          onClick={() => handleSendDesignToFriend(friend.id)}
                          disabled={Boolean(isSendingToFriendId)}
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
