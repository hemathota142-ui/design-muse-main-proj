import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  Check, 
  RefreshCw, 
  TrendingUp, 
  DollarSign,
  Zap,
  ArrowRight,
  Sliders,
  IndianRupee
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useDesignDraft } from "@/contexts/DesignDraftContext";
import { generateDesignData, type DesignOption } from "@/services/designGenerator.service";

// Generate concepts based on input data
const generateConcepts = (formData?: any) => {
  const baseComplexity = formData?.skillLevel === "Beginner" ? "Low" : 
                         formData?.skillLevel === "Expert" ? "High" : "Medium";
  
  return [
    {
      id: 1,
      name: "Compact Modular Design",
      description: "A compact, modular approach focusing on ease of assembly and minimal material usage.",
      feasibilityScore: 92,
      estimatedCost: formData?.budget ? Math.round(formData.budget * 0.7) : 25000,
      complexity: "Low",
      timeEstimate: "3 weeks",
      materials: formData?.preferredMaterials?.slice(0, 3) || ["Aluminum", "ABS Plastic", "Silicon"],
      highlights: ["Easy to manufacture", "Low cost", "Beginner-friendly"],
    },
    {
      id: 2,
      name: "Premium Integrated Build",
      description: "High-quality integrated design with premium materials and professional finish.",
      feasibilityScore: 78,
      estimatedCost: formData?.budget ? Math.round(formData.budget * 1.2) : 50000,
      complexity: "Medium",
      timeEstimate: "5 weeks",
      materials: ["Stainless Steel", "Carbon Fiber", "Glass"],
      highlights: ["Premium quality", "Durable", "Professional look"],
    },
    {
      id: 3,
      name: "Eco-Sustainable Edition",
      description: "Environmentally conscious design using recycled and biodegradable materials.",
      feasibilityScore: 85,
      estimatedCost: formData?.budget ? Math.round(formData.budget * 0.85) : 35000,
      complexity: baseComplexity,
      timeEstimate: "4 weeks",
      materials: ["Recycled Plastic", "Bamboo", "Cork"],
      highlights: ["Eco-friendly", "Sustainable", "Modern aesthetic"],
    },
  ];
};

export default function ConceptGenerationPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { designDraft, updateDraft } = useDesignDraft();
  
  const [concepts, setConcepts] = useState<DesignOption[]>(
    Array.isArray(location.state?.designOptions) && location.state.designOptions.length === 3
      ? location.state.designOptions
      : (generateConcepts(designDraft) as DesignOption[])
  );
  const [selectedConcept, setSelectedConcept] = useState<number | null>(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const generationPayload = {
    productType: (designDraft.customProductType || designDraft.productType || "").trim(),
    purpose: designDraft.purpose,
    targetUser: (designDraft.customTargetUser || designDraft.targetUser || "").trim(),
    environment: (designDraft.customEnvironment || designDraft.environment || "").trim(),
    skillLevel: designDraft.skillLevel,
    budget: designDraft.budget,
    timeWeeks: Array.isArray(designDraft.timeWeeks) ? designDraft.timeWeeks[0] ?? "" : designDraft.timeWeeks,
    safetyRequirements: designDraft.safetyRequirements,
    preferredMaterials: designDraft.preferredMaterials,
    availableTools: designDraft.availableTools,
    sustainabilityPriority: designDraft.sustainabilityPriority,
  };

  useEffect(() => {
    if (Array.isArray(location.state?.designOptions) && location.state.designOptions.length === 3) {
      setConcepts(location.state.designOptions as DesignOption[]);
      setSelectedConcept(null);
    }
  }, [location.state]);

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    setSelectedConcept(null);

    try {
      const result = await generateDesignData(generationPayload);
      setConcepts(result.designOptions);
      toast({
        title: "Concepts regenerated",
        description: "New design concepts have been generated based on your constraints."
      });
    } catch (_error) {
      toast({
        title: "Regeneration failed",
        description: "Unable to fetch new model outputs right now.",
        variant: "destructive",
      });
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleModifyConstraints = () => {
    // Navigate back to design wizard to modify constraints
    navigate("/design/new", { state: { returnToStep: 2 } });
  };

  const handleSelectConcept = () => {
    if (!designDraft?.productName || !designDraft.productName.trim()) {
      toast({
        title: "Product name required",
        description: "Please provide a product name before continuing.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedConcept) return;
    const concept = concepts.find(c => c.id === selectedConcept);
    if (!concept) return;

    const continueWithSelection = (workflowSteps: any[] = []) => {
      updateDraft({
        selectedConceptName: concept.name,
        estimatedCost: concept.estimatedCost,
        workflowSteps,
      });
      navigate("/design/optimize", { 
        state: { 
          conceptId: selectedConcept,
          concept,
          workflowSteps,
        } 
      });
    };

    generateDesignData(generationPayload, concept)
      .then((result) => continueWithSelection(result.workflowSteps))
      .catch(() => continueWithSelection());
  };

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4"
        >
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Generated Concepts
            </h1>
            <p className="text-muted-foreground">
              Our AI has created 3 design concepts based on your requirements. Select one to proceed.
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleRegenerate}
              disabled={isRegenerating}
              className="gap-2"
            >
              <RefreshCw className={cn("w-4 h-4", isRegenerating && "animate-spin")} />
              Regenerate
            </Button>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={handleModifyConstraints}
            >
              <Sliders className="w-4 h-4" />
              Modify Constraints
            </Button>
          </div>
        </motion.div>

        {/* Concept Cards */}
        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          {concepts.map((concept, index) => (
            <motion.div
              key={concept.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card
                className={cn(
                  "relative cursor-pointer transition-all duration-300 card-hover h-full",
                  selectedConcept === concept.id
                    ? "ring-2 ring-primary shadow-glow-sm"
                    : "hover:border-primary/50"
                )}
                onClick={() => setSelectedConcept(concept.id)}
              >
                {/* Best Match Badge */}
                {concept.feasibilityScore >= 90 && (
                  <div className="absolute -top-3 left-4 px-3 py-1 bg-success text-success-foreground text-xs font-medium rounded-full">
                    Best Match
                  </div>
                )}

                {/* Selection Indicator */}
                {selectedConcept === concept.id && (
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-4 h-4 text-primary-foreground" />
                  </div>
                )}

                <CardHeader>
                  <CardTitle className="text-lg">{concept.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{concept.description}</p>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Stats Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-success/10">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-success" />
                        <span className="text-xs text-muted-foreground">Feasibility</span>
                      </div>
                      <p className="text-xl font-bold text-success">{concept.feasibilityScore}%</p>
                    </div>
                    <div className="p-3 rounded-xl bg-primary/10">
                      <div className="flex items-center gap-2 mb-1">
                        <IndianRupee className="w-4 h-4 text-primary" />
                        <span className="text-xs text-muted-foreground">Est. Cost</span>
                      </div>
                      <p className="text-xl font-bold text-primary">₹{concept.estimatedCost.toLocaleString()}</p>
                    </div>
                  </div>

                  {/* Complexity & Time */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <Zap className="w-4 h-4 text-warning" />
                      <span className="text-muted-foreground">Complexity:</span>
                      <span className="font-medium">{concept.complexity}</span>
                    </div>
                    <span className="text-muted-foreground">{concept.timeEstimate}</span>
                  </div>

                  {/* Materials */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Materials:</p>
                    <div className="flex flex-wrap gap-1">
                      {concept.materials.map((material) => (
                        <span
                          key={material}
                          className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground"
                        >
                          {material}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Highlights */}
                  <div className="pt-3 border-t border-border">
                    <div className="flex flex-wrap gap-2">
                      {concept.highlights.map((highlight) => (
                        <span
                          key={highlight}
                          className="text-xs text-primary font-medium"
                        >
                          ✓ {highlight}
                        </span>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Action Button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="flex justify-center"
        >
          <Button
            variant="gradient"
            size="xl"
            onClick={handleSelectConcept}
            disabled={!selectedConcept}
            className="gap-2"
          >
            Continue with Selected Concept
            <ArrowRight className="w-5 h-5" />
          </Button>
        </motion.div>
      </div>
    </AppLayout>
  );
}
