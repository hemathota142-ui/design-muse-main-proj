import { useState, useEffect, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ChatBot } from "@/components/chat/ChatBot";
import { useAuth } from "@/contexts/AuthContext";
import { useDesignDraft } from "@/contexts/DesignDraftContext";
import { getMyDesigns } from "@/services/designs.service";
import { getGuestDesigns } from "@/services/designStorage";
import { useLocation } from "react-router-dom";

export default function AISuggestionsPage() {
  const { user, isGuest } = useAuth();
  const { designDraft } = useDesignDraft();
  const location = useLocation();
  const [designs, setDesigns] = useState<any[]>([]);
  const [isLoadingContext, setIsLoadingContext] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadDesigns = async () => {
      try {
        setIsLoadingContext(true);
        const data = isGuest
          ? await getGuestDesigns()
          : user?.id
            ? await getMyDesigns(user.id)
            : [];
        if (isMounted) {
          setDesigns(data || []);
        }
      } catch (error) {
        console.error("Failed to load designs for AI context", error);
      } finally {
        if (isMounted) setIsLoadingContext(false);
      }
    };

    loadDesigns();
    return () => {
      isMounted = false;
    };
  }, [user, isGuest]);

  const context = useMemo(() => {
    const productTitle =
      typeof location.state?.title === "string" && location.state.title.trim()
        ? location.state.title.trim()
        : typeof location.state?.design?.title === "string" &&
            location.state.design.title.trim()
          ? location.state.design.title.trim()
          : typeof designDraft.productName === "string" &&
              designDraft.productName.trim()
            ? designDraft.productName.trim()
            : typeof designs[0]?.title === "string" && designs[0].title.trim()
              ? designs[0].title.trim()
              : undefined;

    const locationMaterials = Array.isArray(location.state?.design?.materials)
      ? location.state.design.materials
      : [];
    const draftMaterials = Array.isArray(designDraft.preferredMaterials)
      ? designDraft.preferredMaterials
      : [];
    const savedMaterials = Array.isArray(designs[0]?.canonicalDesign?.materials)
      ? designs[0].canonicalDesign.materials
      : [];

    const selectedMaterials = Array.from(
      new Set(
        [...locationMaterials, ...draftMaterials, ...savedMaterials]
          .filter(
            (material): material is string =>
              typeof material === "string" && material.trim().length > 0
          )
          .map((material) => material.trim())
      )
    ).slice(0, 12);

    const getStepLabel = (step: any) => {
      if (!step) return null;
      if (typeof step === "string" && step.trim()) return step.trim();
      if (typeof step?.title === "string" && step.title.trim()) {
        return step.title.trim();
      }
      if (typeof step?.description === "string" && step.description.trim()) {
        return step.description.trim();
      }
      return null;
    };

    const locationSteps = Array.isArray(location.state?.design?.workflow)
      ? location.state.design.workflow
      : Array.isArray(location.state?.design?.steps)
        ? location.state.design.steps
        : [];
    const draftSteps = Array.isArray(designDraft.workflowSteps)
      ? designDraft.workflowSteps
      : [];
    const savedSteps = Array.isArray(designs[0]?.workflow) ? designs[0].workflow : [];

    const workflowSteps = Array.from(
      new Set(
        [...locationSteps, ...draftSteps, ...savedSteps]
          .map(getStepLabel)
          .filter((label): label is string => typeof label === "string" && label.length > 0)
      )
    ).slice(0, 12);

    return {
      productTitle,
      selectedMaterials,
      workflowSteps,
    };
  }, [designDraft, designs, location.state]);

  return (
    <AppLayout>
      <div className="-m-2 sm:-m-4 lg:-m-6 h-[calc(100vh-3rem)]">
        <ChatBot context={context} isLoadingContext={isLoadingContext} />
      </div>
    </AppLayout>
  );
}
