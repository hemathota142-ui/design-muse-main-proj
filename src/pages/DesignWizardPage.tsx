import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Lightbulb,
  Target,
  Wrench,
  Sparkles,
  AlertCircle,
  IndianRupee
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { GuidedTooltip } from "@/components/ui/guided-tooltip";
import { useToast } from "@/hooks/use-toast";
import { useDesignDraft } from "@/contexts/DesignDraftContext";

const steps = [
  { id: 1, title: "Idea & Intent", icon: Lightbulb, description: "Describe your product vision" },
  { id: 2, title: "Constraints", icon: Target, description: "Set your boundaries" },
  { id: 3, title: "Materials", icon: Wrench, description: "Choose preferences" },
];

const productTypes = [
  "Consumer Electronics", "Furniture", "Tools", "Wearables", 
  "Home Decor", "Outdoor Gear", "Mechanical Parts", "Other"
];

const targetUsers = [
  "Students",
  "Professionals",
  "Hobbyists",
  "Children (5-12)",
  "Teenagers",
  "Senior Citizens",
  "Athletes",
  "Office Workers",
  "DIY Enthusiasts",
  "Other"
];

const operatingEnvironments = [
  "Indoor - Home",
  "Indoor - Office",
  "Indoor - Workshop",
  "Outdoor - Urban",
  "Outdoor - Rural",
  "Outdoor - Extreme Weather",
  "Underwater",
  "High Temperature",
  "Low Temperature",
  "Dusty/Dirty Environment",
  "Other"
];

const skillLevels = ["Beginner", "Intermediate", "Advanced", "Expert"];

const materials = [
  "Wood", "Metal", "Plastic", "Glass", "Fabric", 
  "Leather", "Ceramic", "Composite", "3D Printed"
];

const tools = [
  "3D Printer", "CNC Machine", "Laser Cutter", "Hand Tools",
  "Welding Equipment", "Woodworking Tools", "Sewing Machine", "Basic Kit Only"
];

export default function DesignWizardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { designDraft, updateDraft, resetDraft } = useDesignDraft();
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load template data if coming from templates page
  useEffect(() => {
    const templateData = location.state?.template;
    const returnToStep = location.state?.returnToStep;

    // Fresh entry into "New Design" should start blank, not with stale persisted selections.
    if (!templateData && !returnToStep) {
      resetDraft();
    }

    if (templateData) {
      updateDraft({
        productType: templateData.productType || "",
        productName: templateData.productName || "",
        purpose: templateData.purpose || "",
        preferredMaterials: templateData.preferredMaterials || [],
      });
    }
    if (returnToStep) {
      setCurrentStep(returnToStep);
    }
  }, [location.state, updateDraft, resetDraft]);

  const updateFormData = (field: string, value: any) => {
    updateDraft({ [field]: value } as any);
    // Clear error when field is updated
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  };

  const toggleArrayItem = (field: string, item: string) => {
    const array = (designDraft as any)[field] as string[];
    if (array.includes(item)) {
      updateDraft({ [field]: array.filter((i) => i !== item) } as any);
      return;
    }
    updateDraft({ [field]: [...array, item] } as any);
  };

  // Validation for each step
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      if (!designDraft.productType) {
        newErrors.productType = "Please select a product type";
      }
      if (!designDraft.productName.trim()) {
        newErrors.productName = "Product name is required";
      } else if (designDraft.productName.length < 3) {
        newErrors.productName = "Product name must be at least 3 characters";
      }
      if (!designDraft.purpose.trim()) {
        newErrors.purpose = "Please describe the purpose";
      }
    }

    if (step === 2) {
      if (!designDraft.skillLevel) {
        newErrors.skillLevel = "Please select your skill level";
      }
    }

    if (step === 3) {
      if (designDraft.preferredMaterials.length === 0) {
        newErrors.preferredMaterials = "Please select at least one material";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      toast({
        title: "Please fill required fields",
        description: "Some fields need your attention before proceeding.",
        variant: "destructive",
      });
      return;
    }

    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    } else {
      // Navigate to AI analysis
      navigate("/design/analyze");
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Create New Design
          </h1>
          <p className="text-muted-foreground">
            Guide our AI with your requirements to generate optimized designs
          </p>
        </motion.div>

        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-6 left-0 right-0 h-0.5 bg-border">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: `${((currentStep - 1) / 2) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {steps.map((step) => (
              <div key={step.id} className="relative flex flex-col items-center">
                <motion.div
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center border-2 bg-background transition-colors z-10",
                    currentStep === step.id 
                      ? "border-primary bg-primary text-primary-foreground" 
                      : currentStep > step.id 
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground"
                  )}
                  animate={currentStep === step.id ? { scale: [1, 1.1, 1] } : {}}
                  transition={{ duration: 0.3 }}
                >
                  {currentStep > step.id ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </motion.div>
                <div className="mt-3 text-center">
                  <p className={cn(
                    "font-medium text-sm",
                    currentStep >= step.id ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <AnimatePresence mode="wait">
              {/* Step 1: Idea & Intent */}
              {currentStep === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label>Product Type</Label>
                      <GuidedTooltip content="Select the category that best describes your product" />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {productTypes.map((type) => (
                        <button
                          key={type}
                          onClick={() => updateFormData("productType", type)}
                          className={cn(
                            "px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                            designDraft.productType === type
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground",
                            errors.productType && "border-destructive/50"
                          )}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                    {designDraft.productType === "Other" && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-2"
                      >
                        <Input
                          placeholder="Specify your product type..."
                          value={designDraft.customProductType}
                          onChange={(e) => updateFormData("customProductType", e.target.value)}
                          className="h-10"
                        />
                      </motion.div>
                    )}
                    {errors.productType && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.productType}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="productName">Product Name / Title</Label>
                      <GuidedTooltip content="Give your product a clear, descriptive name" />
                    </div>
                    <Input
                      id="productName"
                      placeholder="e.g., Portable Solar Phone Charger"
                      value={designDraft.productName}
                      onChange={(e) => updateFormData("productName", e.target.value)}
                      className={cn("h-12", errors.productName && "border-destructive")}
                    />
                    {errors.productName && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.productName}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Label htmlFor="purpose">Purpose & Use Case</Label>
                      <GuidedTooltip content="Describe what problem your product solves and how it will be used" />
                    </div>
                    <Textarea
                      id="purpose"
                      placeholder="Describe what your product does and how it will be used..."
                      value={designDraft.purpose}
                      onChange={(e) => updateFormData("purpose", e.target.value)}
                      rows={3}
                      className={errors.purpose ? "border-destructive" : ""}
                    />
                    {errors.purpose && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.purpose}
                      </p>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Target User</Label>
                      <Select
                        value={designDraft.targetUser}
                        onValueChange={(value) => updateFormData("targetUser", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select target user" />
                        </SelectTrigger>
                        <SelectContent>
                          {targetUsers.map((user) => (
                            <SelectItem key={user} value={user}>{user}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {designDraft.targetUser === "Other" && (
                        <Input
                          placeholder="Specify target user..."
                          value={designDraft.customTargetUser}
                          onChange={(e) => updateFormData("customTargetUser", e.target.value)}
                          className="mt-2"
                        />
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Operating Environment</Label>
                      <Select
                        value={designDraft.environment}
                        onValueChange={(value) => updateFormData("environment", value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select environment" />
                        </SelectTrigger>
                        <SelectContent>
                          {operatingEnvironments.map((env) => (
                            <SelectItem key={env} value={env}>{env}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {designDraft.environment === "Other" && (
                        <Input
                          placeholder="Specify environment..."
                          value={designDraft.customEnvironment}
                          onChange={(e) => updateFormData("customEnvironment", e.target.value)}
                          className="mt-2"
                        />
                      )}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Step 2: Constraints */}
              {currentStep === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <Label>Your Skill Level</Label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {skillLevels.map((level) => (
                        <button
                          key={level}
                          onClick={() => updateFormData("skillLevel", level)}
                          className={cn(
                            "px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                            designDraft.skillLevel === level
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Label>Budget (INR)</Label>
                        <GuidedTooltip content="Enter your budget in Indian Rupees" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <IndianRupee className="w-5 h-5 text-muted-foreground" />
                      <Input
                        type="number"
                        value={designDraft.budget}
                        onChange={(e) => updateFormData("budget", parseInt(e.target.value) || 0)}
                        placeholder="Enter budget in INR"
                        className="h-12 text-lg"
                        min={0}
                        step={500}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Suggested range: ₹1,000 - ₹5,00,000
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Time Available</Label>
                      <span className="text-lg font-semibold text-primary">
                        {designDraft.timeWeeks[0]} weeks
                      </span>
                    </div>
                    <Slider
                      value={designDraft.timeWeeks}
                      onValueChange={(value) => updateFormData("timeWeeks", value)}
                      max={24}
                      min={1}
                      step={1}
                      className="py-4"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>1 week</span>
                      <span>24 weeks</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="safety">Safety & Environmental Constraints</Label>
                    <Textarea
                      id="safety"
                      placeholder="e.g., Must be child-safe, no sharp edges, eco-friendly materials preferred..."
                      value={designDraft.safetyRequirements}
                      onChange={(e) => updateFormData("safetyRequirements", e.target.value)}
                      rows={3}
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 3: Materials */}
              {currentStep === 3 && (
                <motion.div
                  key="step3"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-6"
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label>Preferred Materials (select all that apply)</Label>
                      <GuidedTooltip content="Choose materials you'd like to work with. This helps our AI suggest appropriate designs." />
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {materials.map((material) => (
                        <button
                          key={material}
                          onClick={() => toggleArrayItem("preferredMaterials", material)}
                          className={cn(
                            "px-4 py-3 rounded-xl border text-sm font-medium transition-all",
                            designDraft.preferredMaterials.includes(material)
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:border-primary/50 text-muted-foreground hover:text-foreground",
                            errors.preferredMaterials && "border-destructive/50"
                          )}
                        >
                          {material}
                        </button>
                      ))}
                    </div>
                    {errors.preferredMaterials && (
                      <p className="text-sm text-destructive flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.preferredMaterials}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Label>Available Tools</Label>
                      <GuidedTooltip content="Select the tools you have access to for building your product" />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {tools.map((tool) => (
                        <button
                          key={tool}
                          onClick={() => toggleArrayItem("availableTools", tool)}
                          className={cn(
                            "px-4 py-3 rounded-xl border text-sm font-medium transition-all text-left",
                            designDraft.availableTools.includes(tool)
                              ? "border-success bg-success/10 text-success"
                              : "border-border hover:border-success/50 text-muted-foreground hover:text-foreground"
                          )}
                        >
                          {tool}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 rounded-xl border bg-muted/50">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={designDraft.sustainabilityPriority}
                        onChange={(e) => updateFormData("sustainabilityPriority", e.target.checked)}
                        className="w-5 h-5 rounded border-border text-primary focus:ring-primary"
                      />
                      <div>
                        <p className="font-medium text-foreground">Prioritize Sustainability</p>
                        <p className="text-sm text-muted-foreground">
                          Prefer eco-friendly materials and processes even if slightly more expensive
                        </p>
                      </div>
                    </label>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>

          <Button
            variant="gradient"
            onClick={handleNext}
            className="gap-2"
          >
            {currentStep === 3 ? (
              <>
                <Sparkles className="w-4 h-4" />
                Analyze with AI
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
}
