import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const issues = [
  {
    title: "Login problems",
    solution: "Verify email/password and use Forgot Password if needed before retrying sign-in.",
  },
  {
    title: "Design upload errors",
    solution: "Retry with stable internet, ensure required fields are filled, and refresh if upload stalls.",
  },
  {
    title: "Slow analysis response",
    solution: "Large inputs may take longer; wait briefly, then retry if no response is returned.",
  },
  {
    title: "Unable to post design",
    solution: "Verify the design is completed and your account has permission to post publicly.",
  },
  {
    title: "Guest limitations",
    solution: "Guest mode is limited; sign in to unlock saving, posting, messaging, and account features.",
  },
];

export default function CommonIssuesPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground mb-8">Common Issues</h1>
        <div className="space-y-4">
          {issues.map((item) => (
            <div key={item.title} className="rounded-xl border border-border p-4">
              <h2 className="font-semibold text-foreground">{item.title}</h2>
              <p className="text-sm text-muted-foreground mt-1">{item.solution}</p>
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
