import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ChevronDown, Cpu, Layers, Zap, Shield, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Sparkles,
    title: "AI-Powered Design",
    description: "Natural language processing understands your product vision and generates optimized designs.",
  },
  {
    icon: Cpu,
    title: "ML Feasibility Analysis",
    description: "Machine learning models analyze constraints, materials, and budget to predict project success.",
  },
  {
    icon: Layers,
    title: "Multiple Concepts",
    description: "Generate and compare multiple design concepts before committing to manufacturing.",
  },
  {
    icon: TrendingUp,
    title: "Cost Optimization",
    description: "Intelligent material suggestions to reduce costs while maintaining quality.",
  },
  {
    icon: Zap,
    title: "Instant Workflows",
    description: "Automatically generated step-by-step workflows with time and effort estimations.",
  },
  {
    icon: Shield,
    title: "Safety First",
    description: "Built-in safety checks and environmental constraint analysis for every design.",
  },
];

export default function AboutUsPage() {
  return (
    <div className="min-h-screen bg-background">
      <section className="relative min-h-[70vh] flex items-center justify-center px-6">
        <div className="text-center max-w-3xl">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground">About Smart Product Design Assistant</h1>
          </div>
          <p className="text-lg text-muted-foreground leading-relaxed">
            The platform uses natural language processing and machine learning to help engineers and designers optimize product designs before manufacturing.
          </p>

          <motion.a
            href="#about-details"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground mt-10"
            animate={{ y: [0, 6, 0] }}
            transition={{ repeat: Infinity, duration: 2 }}
          >
            Scroll to explore
            <ChevronDown className="w-4 h-4" />
          </motion.a>
        </div>
      </section>

      <section id="about-details" className="py-20 px-6 bg-background">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-foreground text-center mb-4">Intelligent Design Workflow</h2>
          <p className="text-muted-foreground text-center mb-12">
            From concept to manufacturing-ready design, the platform guides each step.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature) => (
              <div key={feature.title} className="p-6 rounded-2xl bg-card border border-border">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <feature.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-card-foreground mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-muted/50">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold text-foreground text-center mb-12">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Describe Your Idea", desc: "Use natural language to explain your concept and constraints." },
              { step: "02", title: "AI Analysis", desc: "Models estimate feasibility, suggest materials, and generate options." },
              { step: "03", title: "Optimize & Build", desc: "Select and refine a concept, then follow manufacturing workflow steps." },
            ].map((item) => (
              <div key={item.step} className="relative pt-10">
                <div className="text-7xl font-bold text-primary/10 absolute top-0 left-0">{item.step}</div>
                <h3 className="text-2xl font-semibold text-foreground mb-3">{item.title}</h3>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="container mx-auto max-w-4xl px-6 py-12">
        <div className="mt-2">
          <Link to="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
