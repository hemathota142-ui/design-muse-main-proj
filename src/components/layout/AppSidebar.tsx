import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Home,
  Activity,
  FolderOpen,
  Layers,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Inbox,
  UserCircle,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  guestBlocked?: boolean;
}

const mainNavItems: NavItem[] = [
  { icon: Home, label: "Dashboard", path: "/dashboard" },
  { icon: Sparkles, label: "New Design", path: "/design/new" },
  { icon: FolderOpen, label: "My Designs", path: "/designs" },
  { icon: Layers, label: "Templates", path: "/templates" },
  { icon: Users, label: "Friends", path: "/friends", guestBlocked: true },
  { icon: Inbox, label: "Messages", path: "/messages", guestBlocked: true },
  { icon: Activity, label: "Activity Feed", path: "/activity-feed" },
];

const bottomNavItems: NavItem[] = [
  { icon: Settings, label: "Settings", path: "/settings" },
];

export function AppSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isGuest, logout } = useAuth();
  const { toast } = useToast();

  const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(path + "/");

  const handleLogout = async () => {
    await logout();
    toast({
      title: "Logged out",
      description: "You've been successfully logged out.",
    });
    navigate("/");
  };

  const handleGuestBlockedFeature = () => {
    toast({
      title: "Login required",
      description: "Login first to access this feature.",
      variant: "destructive",
    });
    navigate("/login");
  };

  return (
    <>
      <motion.aside
        initial={false}
        animate={{ width: isCollapsed ? 72 : 260 }}
        transition={{ duration: 0.3, ease: "easeInOut" }}
        className="fixed left-0 top-0 h-screen bg-sidebar z-50 flex flex-col border-r border-sidebar-border"
      >
      {/* Logo Section */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex items-center gap-3"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-sm">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sidebar-foreground text-sm">Smart Design</span>
                <span className="text-[10px] text-sidebar-foreground/60">AI Assistant</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {isCollapsed && (
          <div className="w-9 h-9 rounded-xl bg-gradient-primary flex items-center justify-center shadow-glow-sm mx-auto">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
        )}

        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent",
            isCollapsed && "absolute -right-3 top-5 w-6 h-6 rounded-full bg-sidebar border border-sidebar-border shadow-md"
          )}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 py-4 px-3 space-y-1">
        {mainNavItems.map((item) => {
          const baseClass = cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
            isActive(item.path)
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-glow-sm"
              : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
          );

          if (isGuest && item.guestBlocked) {
            return (
              <button key={item.path} onClick={handleGuestBlockedFeature} className={cn(baseClass, "w-full text-left opacity-60")}>
                <item.icon className="w-5 h-5 shrink-0" />
                {!isCollapsed && <span className="font-medium text-sm">{item.label}</span>}
                {isCollapsed && (
                  <div className="absolute left-full ml-2 px-3 py-1.5 bg-popover text-popover-foreground text-sm font-medium rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                    {item.label}
                  </div>
                )}
              </button>
            );
          }

          return (
            <NavLink key={item.path} to={item.path} className={baseClass}>
              <item.icon className={cn("w-5 h-5 shrink-0", isActive(item.path) && "drop-shadow-sm")} />
              <AnimatePresence mode="wait">
                {!isCollapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    className="font-medium text-sm whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
              {isCollapsed && (
                <div className="absolute left-full ml-2 px-3 py-1.5 bg-popover text-popover-foreground text-sm font-medium rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </NavLink>
          );
        })}

      </nav>

      {/* Bottom Navigation */}
      <div className="p-3 border-t border-sidebar-border space-y-1">
        {/* User Info */}
        {(user || isGuest) && !isCollapsed && (
          <NavLink
            to="/profile"
            className="flex items-center gap-3 px-3 py-2 mb-2 rounded-xl hover:bg-sidebar-accent transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
              <UserCircle className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-sidebar-foreground truncate">
                {isGuest ? "Guest User" : user?.user_metadata?.full_name}
              </p>
              <p className="text-xs text-sidebar-foreground/60 truncate">
                {isGuest ? "Guest User" : user.email}
              </p>
            </div>
          </NavLink>
        )}
        {isGuest && !isCollapsed && (
          <p className="px-3 pb-2 text-[11px] text-warning">
            Guest Mode (data will be lost on logout/close)
          </p>
        )}

        {/* Theme Toggle */}
        <div className={cn(
          "flex items-center gap-3 px-3 py-2",
          isCollapsed && "justify-center"
        )}>
          <ThemeToggle />
          {!isCollapsed && (
            <span className="text-sm text-sidebar-foreground/70">Theme</span>
          )}
        </div>

        {bottomNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group relative",
              isActive(item.path)
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            <item.icon className="w-5 h-5 shrink-0" />
            {!isCollapsed && (
              <span className="font-medium text-sm">{item.label}</span>
            )}
          </NavLink>
        ))}

        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 w-full text-sidebar-foreground/70 hover:text-destructive hover:bg-destructive/10"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!isCollapsed && (
            <span className="font-medium text-sm">Log Out</span>
          )}
        </button>
      </div>
    </motion.aside>
  </>
  );
}
