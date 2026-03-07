import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground mb-4">Support Center</h1>
        <div className="space-y-3 text-muted-foreground">
          <p>
            Start with the in-platform assistant for quick help on design creation, saving, sharing, and account actions.
          </p>
          <p>
            Use FAQ for common questions and Common Issues for troubleshooting steps.
          </p>
          <p>
            If the problem persists, contact support with the exact error message and where it happened.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/faq">
            <Button variant="outline">Go to FAQ</Button>
          </Link>
          <Link to="/contact">
            <Button>Contact Support</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
