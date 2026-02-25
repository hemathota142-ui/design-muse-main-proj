import { ReactNode } from "react";
import { AppSidebar } from "./AppSidebar";
import { FloatingActionButton } from "./FloatingActionButton";
import { motion } from "framer-motion";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      
      {/* Main Content Area */}
      <motion.main
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="ml-[260px] min-h-screen transition-all duration-300"
      >
        <div className="p-6 lg:p-8">
          {children}
        </div>
      </motion.main>

      {/* Floating Action Button */}
      <FloatingActionButton />
    </div>
  );
}
