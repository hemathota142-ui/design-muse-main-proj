import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/lib/supabase";
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
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { createDesign } from "@/services/designs.service";


export default function DesignCompletePage() {
  const navigate = useNavigate();
  const location = useLocation();
const state = location.state as any;
const title = state?.title ?? "Untitled Design";
const workflow = state?.workflow ?? [];
const constraints = state?.constraints ?? {};
  
  const { user, isGuest } = useAuth();
  const { toast } = useToast();
  
  const concept = location.state?.concept;
  const formData = location.state?.formData;
  
  const [visibility, setVisibility] = useState<"public" | "private">("private");
  const [isSaving, setIsSaving] = useState(false);

 const handlePostDesign = async () => {
  if (!user || isGuest) {
    toast({
      title: "Login required",
      description: "Please sign in to save your design.",
      variant: "destructive",
    });
    return;
  }

  setIsSaving(true);

  try {
    const data = await createDesign({
  title,
  workflow,
  constraints,
  status: "draft",
  visibility,
});

    console.log("CREATED DESIGN:", data);

    if (!data?.id) {
      throw new Error("No design ID returned");
    }

    navigate(`/designs/${data.id}`);
  } catch (error) {
    console.error(error);
    toast({
      title: "Error saving design",
      description: "Please try again.",
      variant: "destructive",
    });
  } finally {
    setIsSaving(false);
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
            Congratulations! 🎉
          </h1>
          <p className="text-muted-foreground">
            You've completed your design workflow for{" "}
            <span className="font-medium text-foreground">
              {formData?.productName || concept?.name || "your design"}
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
                  <span className="font-medium text-foreground">{formData?.productName || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Concept</span>
                  <span className="font-medium text-foreground">{concept?.name || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Cost</span>
                  <span className="font-medium text-foreground">
                    ₹{concept?.estimatedCost?.toLocaleString() || "N/A"}
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
              ⚠️ Guest users: Your design will be saved locally but may be lost on browser refresh.
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
  className={cn("w-full gap-2", isGuest ? "opacity-50 cursor-not-allowed" : "")}
  onClick={handlePostDesign}
  disabled={isSaving || isGuest} // disable for guests
  title={isGuest ? "Sign up to save your design" : ""} // tooltip for guests
>
  {isSaving ? (
    <>Saving...</>
  ) : (
    <>
      {visibility === "public" ? (
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
    </>
  )}
</Button>


          <div className="flex gap-3">
            <Button variant="outline" className="flex-1 gap-2">
              <Download className="w-4 h-4" />
              Export Design
            </Button>
            <Button variant="outline" className="flex-1 gap-2">
              <Share2 className="w-4 h-4" />
              Share with Friends
            </Button>
          </div>

          <Button 
            variant="ghost" 
            className="w-full"
            onClick={() => navigate("/dashboard")}
          >
            Return to Dashboard
          </Button>
        </motion.div>
      </div>
    </AppLayout>
  );
}
