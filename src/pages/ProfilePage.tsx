import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
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
import { getMyProfile } from "@/services/profiles.service";
import { deleteDesign, getMyDesigns, updateDesignVisibility } from "@/services/designs.service";

export default function ProfilePage() {
  const { user, isGuest } = useAuth();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [profileBio, setProfileBio] = useState<string | null>(null);
  const [postedDesigns, setPostedDesigns] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<"public" | "private">("public");

  useEffect(() => {
    if (!user || isGuest) return;
    let isMounted = true;

    const loadDesigns = async () => {
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
  }, [user, isGuest]);

  useEffect(() => {
    if (!user || isGuest) return;
    let isMounted = true;

    const loadProfile = async () => {
      try {
        const profile = await getMyProfile();
        if (isMounted) {
          setProfileName(profile.full_name);
          setProfileBio(profile.bio);
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
  }, [user, isGuest]);

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
                  <User className="w-12 h-12 text-primary" />
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
                  <p className="text-muted-foreground">{user?.email}</p>
                  {profileBio && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {profileBio}
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
                </div>
                <Link to="/settings">
                  <Button variant="outline" className="gap-2">
                    <Edit className="w-4 h-4" />
                    Edit Profile
                  </Button>
                </Link>
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
      </div>
    </AppLayout>
  );
}
