import { useEffect, useState } from "react";
import ProtectedRoute from "@/components/ProtectedRoute";
import { supabase } from "@/lib/supabase";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { DesignDraftProvider } from "@/contexts/DesignDraftContext";

// Pages
import LandingPage from "./pages/LandingPage";
import AboutUsPage from "./pages/AboutUsPage";
import ContactUsPage from "./pages/ContactUsPage";
import SupportPage from "./pages/SupportPage";
import FAQPage from "./pages/FAQPage";
import CommonIssuesPage from "./pages/CommonIssuesPage";
import AuthPage from "./pages/AuthPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DesignDetailPage from "./pages/DesignDetailPage";
import DashboardPage from "./pages/DashboardPage";
import ActivityFeedPage from "./pages/ActivityFeedPage";
import DesignWizardPage from "./pages/DesignWizardPage";
import AIAnalysisPage from "./pages/AIAnalysisPage";
import ConceptGenerationPage from "./pages/ConceptGenerationPage";
import WorkflowPage from "./pages/WorkflowPage";
import MaterialOptimizationPage from "./pages/MaterialOptimizationPage";
import PreviousDesignsPage from "./pages/PreviousDesignsPage";
import SettingsPage from "./pages/SettingsPage";
import AISuggestionsPage from "./pages/AISuggestionsPage";
import TemplatesPage from "./pages/TemplatesPage";
import ProfilePage from "./pages/ProfilePage";
import DesignCompletePage from "./pages/DesignCompletePage";
import FriendsPage from "./pages/FriendsPage";
import MessagesPage from "./pages/MessagesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
  supabase.auth.getUser().then(({ data }) => {
    setUser(data.user);
  });

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((_event, session) => {
    setUser(session?.user ?? null);
  });

  return () => subscription.unsubscribe();
}, []);
return (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DesignDraftProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <Routes>
  {/* Public Routes */}
  <Route path="/" element={<LandingPage />} />
  <Route path="/about" element={<AboutUsPage />} />
  <Route path="/contact" element={<ContactUsPage />} />
  <Route path="/about-us" element={<AboutUsPage />} />
  <Route path="/contact-us" element={<ContactUsPage />} />
  <Route path="/support" element={<SupportPage />} />
  <Route path="/faq" element={<FAQPage />} />
  <Route path="/common-issues" element={<CommonIssuesPage />} />
  <Route path="/login" element={<AuthPage mode="login" />} />
  <Route path="/signup" element={<AuthPage mode="signup" />} />
  <Route path="/forgot-password" element={<ForgotPasswordPage />} />

  {/* Protected Routes */}
  <Route
    path="/dashboard"
    element={
      <ProtectedRoute>
        <DashboardPage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/activity-feed"
    element={
      <ProtectedRoute>
        <ActivityFeedPage />
      </ProtectedRoute>
    }
  />
  <Route
  path="/designs/:id"
  element={
    <ProtectedRoute>
      <DesignDetailPage />
    </ProtectedRoute>
  }
/>


  {/* Design Flow */}
  <Route
    path="/design/new"
    element={
      <ProtectedRoute>
        <DesignWizardPage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/design/analyze"
    element={
      <ProtectedRoute>
        <AIAnalysisPage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/design/concepts"
    element={
      <ProtectedRoute>
        <ConceptGenerationPage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/design/workflow"
    element={
      <ProtectedRoute>
        <WorkflowPage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/design/optimize"
    element={
      <ProtectedRoute>
        <MaterialOptimizationPage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/design/preview"
    element={
      <ProtectedRoute>
        <DesignCompletePage />
      </ProtectedRoute>
    }
  />

  {/* Feature Pages */}
  <Route
    path="/ai-suggestions"
    element={
      <ProtectedRoute>
        <AISuggestionsPage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/templates"
    element={
      <ProtectedRoute>
        <TemplatesPage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/profile"
    element={
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/profile/:userId"
    element={
      <ProtectedRoute>
        <ProfilePage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/friends"
    element={
      <ProtectedRoute>
        <FriendsPage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/messages"
    element={
      <ProtectedRoute>
        <MessagesPage />
      </ProtectedRoute>
    }
  />

  {/* Other Pages */}
  <Route
    path="/designs"
    element={
      <ProtectedRoute>
        <PreviousDesignsPage />
      </ProtectedRoute>
    }
  />
  <Route
    path="/settings"
    element={
      <ProtectedRoute>
        <SettingsPage />
      </ProtectedRoute>
    }
  />

  {/* Catch-all */}
  <Route path="*" element={<NotFound />} />
</Routes>

          </BrowserRouter>
        </TooltipProvider>
      </DesignDraftProvider>
    </AuthProvider>
  </QueryClientProvider>
);
};
export default App;
