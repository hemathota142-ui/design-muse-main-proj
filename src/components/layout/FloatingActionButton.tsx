import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Sparkles, Upload, FolderOpen, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface FabAction {
  icon: React.ElementType;
  label: string;
  path: string;
  color: string;
}

const actions: FabAction[] = [
  { icon: Sparkles, label: "Start AI Design", path: "/design/new", color: "bg-primary" },
  { icon: Upload, label: "Upload Sketch", path: "/design/new?mode=upload", color: "bg-success" },
  { icon: FolderOpen, label: "From Template", path: "/designs?filter=templates", color: "bg-warning" },
];

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="fixed bottom-24 right-6 z-50 flex flex-col-reverse items-end gap-3">
        {/* Action Items */}
        <AnimatePresence>
          {isOpen && actions.map((action, index) => (
            <motion.div
              key={action.path}
              initial={{ opacity: 0, scale: 0.8, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8, y: 20 }}
              transition={{ delay: index * 0.05, duration: 0.2 }}
            >
              <Link
                to={action.path}
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 group"
              >
                <span className="px-3 py-1.5 rounded-lg bg-card shadow-lg text-sm font-medium text-card-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {action.label}
                </span>
                <div className={cn(
                  "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110",
                  action.color, "text-primary-foreground"
                )}>
                  <action.icon className="w-5 h-5" />
                </div>
              </Link>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Main FAB */}
        <Button
          variant="fab"
          size="fab"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "transition-all duration-300",
            isOpen && "rotate-45"
          )}
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <Link
          to="/ai-suggestions"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
          aria-label="Open AI assistant page"
        >
          <Bot className="w-6 h-6" />
        </Link>
      </motion.div>
    </>
  );
}
