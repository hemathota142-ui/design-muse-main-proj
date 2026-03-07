import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const faqItems = [
  {
    question: "What does the AI analyze?",
    answer: "It analyzes your design inputs, constraints, materials, and workflow context to provide guidance.",
  },
  {
    question: "How does the design assistant work?",
    answer: "You provide project details, and the assistant returns structured help for creating and managing designs.",
  },
  {
    question: "Is my design data secure?",
    answer: "Design data is stored through the platform backend and protected by authenticated access controls.",
  },
  {
    question: "How do I create a design?",
    answer: "Go to New Design, complete the guided steps, and continue through the design flow.",
  },
  {
    question: "How do I post a design publicly?",
    answer: "On completion/save flow, choose public visibility and post to profile.",
  },
];

export default function FAQPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground mb-8">Frequently Asked Questions</h1>
        <div className="space-y-4">
          {faqItems.map((item) => (
            <div key={item.question} className="rounded-xl border border-border p-4">
              <h2 className="font-semibold text-foreground">{item.question}</h2>
              <p className="text-sm text-muted-foreground mt-1">{item.answer}</p>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <Link to="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
