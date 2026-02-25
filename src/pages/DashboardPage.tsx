import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { getMyDesigns } from "@/services/designs.service";
import { motion } from "framer-motion";
import { 
  Plus, 
  FolderOpen, 
  TrendingUp, 
  Bookmark, 
  Target,
  ArrowRight,
  Clock,
  Sparkles,
  MessageSquare,
  Layers
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";




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
  const totalDesigns = designs.length;
  const { user, isGuest } = useAuth();

useEffect(() => {
  if (!user?.id || isGuest) return;

  const loadDesigns = async () => {
    try {
      const data = await getMyDesigns(user.id);
      setDesigns(data);
    } catch (err) {
      console.error("Failed to load designs", err);
    }
  };

  loadDesigns();
}, [user, isGuest]);



const displayName =
  user?.user_metadata?.full_name ||
  user?.email?.split("@")[0] ||
  "Designer";



  return (
    <AppLayout>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8"
      >
        {/* Welcome Section */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-1">
              Welcome back, {displayName}! 👋
            </h1>
            <p className="text-muted-foreground">
              Ready to create something amazing? Let's design smarter.
            </p>
            {isGuest && (
              <p className="text-sm text-warning mt-2">
                You're in guest mode. Sign up to save your work!
              </p>
            )}
          </div>
          <Link to="/design/new">
            <Button variant="gradient" size="lg" className="gap-2">
              <Plus className="w-5 h-5" />
              New Design
            </Button>
          </Link>
        </motion.div>

        {/* Stats Grid */}
        <motion.div variants={itemVariants} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          
           <Card className="card-hover">
  <CardContent className="p-6">
    <div className="flex items-start justify-between">
      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
        <FolderOpen className="w-6 h-6 text-primary" />
      </div>
    </div>
    <div className="mt-4">
      <p className="text-3xl font-bold text-foreground">{totalDesigns}</p>
      <p className="text-sm text-muted-foreground">Total Designs</p>
    </div>
  </CardContent>
</Card>

        </motion.div>

        {/* Quick Actions */}
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

        {/* Recent Designs */}
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
      <CardContent className="p-6 text-center text-muted-foreground">
        No designs yet. Create your first one!
      </CardContent>
    </Card>
  ) : (
    designs.slice(0, 3).map((design) => (
      <Card key={design.id} className="card-hover">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <p className="font-medium text-foreground">{design.title}</p>
            </div>
          </div>

          <Link to={`/design/${design.id}`}>
            <Button variant="ghost" size="sm">
              View
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    ))
  )}
</div>
        </motion.div>
      </motion.div>
    </AppLayout>
  );
}
