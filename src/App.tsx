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
import AuthPage from "./pages/AuthPage";
import DesignDetailPage from "./pages/DesignDetailPage";
import DashboardPage from "./pages/DashboardPage";
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
  <Route path="/login" element={<AuthPage mode="login" />} />
  <Route path="/signup" element={<AuthPage mode="signup" />} />
  <Route path="/design/workflow" element={<WorkflowPage />} />
<Route path="/design/optimize" element={<MaterialOptimizationPage />} />
<Route path="/design/preview" element={<DesignCompletePage />} />

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
  path="/designs/:id"
  element={
    //<ProtectedRoute>
      <DesignDetailPage />
    //</ProtectedRoute>
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
    path="/design/complete"
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
