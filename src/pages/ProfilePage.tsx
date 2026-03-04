import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
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
  Share2
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { getMyProfile } from "@/services/profiles.service";
import { deleteDesign, getMyDesigns, updateDesignVisibility } from "@/services/designs.service";

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

export default function ProfilePage() {
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileBio, setProfileBio] = useState<string | null>(null);
  const [profileEmail, setProfileEmail] = useState<string | null>(null);
  const [postedDesigns, setPostedDesigns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"public" | "private">("public");
  const [savedAvatar, setSavedAvatar] = useState("\u{1F600}");
  const [selectedAvatar, setSelectedAvatar] = useState("\u{1F600}");
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [isAvatarEditMode, setIsAvatarEditMode] = useState(false);
  const viewedUserId = new URLSearchParams(location.search).get("userId");
  const isViewingOther = Boolean(viewedUserId && user?.id && viewedUserId !== user.id);

  useEffect(() => {
    if (!user || isGuest) return;
    let isMounted = true;

    const loadDesigns = async () => {
      if (isViewingOther) {
        if (isMounted) setPostedDesigns([]);
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
  }, [user, isGuest, isViewingOther]);

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
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, bio")
        .eq("id", targetId)
        .single();

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
        setProfileName(data.full_name);
        setProfileBio(data.bio);
        setProfileEmail(data.email);
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
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-4xl leading-none">{savedAvatar}</span>
                </div>
                <div className="flex-1">
                  <h1 className="text-2xl font-bold text-foreground">
                    {profileName ||
                      user?.user_metadata?.full_name ||
                      user?.user_metadata?.display_name ||
                      user?.user_metadata?.name ||
                      user?.email?.split("@")[0] ||
                      "Designer"}
                  </h1>
                  <p className="text-muted-foreground">{profileEmail || user?.email}</p>
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
                  <div className="flex items-center gap-4 mt-3">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <FolderOpen className="w-4 h-4" />
                      {postedDesigns.length} designs
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      {publicDesigns.length} public
                    </div>
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
              {displayedDesigns.map((design, index) => (
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
                            design.visibility === "public"
                              ? "bg-success/10 text-success"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {design.visibility === "public" ? "Public" : "Private"}
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

                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" className="flex-1 gap-1">
                          <Eye className="w-3 h-3" />
                          View
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => toggleVisibility(design.id, design.visibility)}
                        >
                          {design.visibility === "public" ? (
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
              ))}
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
    </AppLayout>
  );
}

