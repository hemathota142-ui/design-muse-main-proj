import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function ContactUsPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitted(false);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedName || !trimmedEmail || !trimmedSubject || !trimmedMessage) {
      toast({
        title: "Required fields missing",
        description: "Please fill in name, email, subject, and message.",
        variant: "destructive",
      });
      return;
    }
    if (!emailRegex.test(trimmedEmail)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email format.",
        variant: "destructive",
      });
      return;
    }
    if (trimmedMessage.length < 10) {
      toast({
        title: "Message too short",
        description: "Message must be at least 10 characters.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          email: trimmedEmail,
          subject: trimmedSubject,
          message: trimmedMessage,
        }),
      });

      const result = await response.json();
      if (!response.ok || !result?.success) {
        throw new Error("Failed");
      }

      setSubmitted(true);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (_error) {
      toast({
        title: "Submission failed",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-3xl font-bold text-foreground mb-2">Contact Us</h1>
        <p className="text-muted-foreground mb-2">Email: support@smartdesign.ai</p>
        <p className="text-muted-foreground mb-8">Send your complaint or issue and our team will reply soon.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <Textarea
            placeholder="Message / Complaint"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={5}
            required
          />
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send Message"}
          </Button>
        </form>

        {submitted && (
          <p className="mt-4 text-sm text-muted-foreground">
            Your message has been sent successfully. Our team will contact you soon.
          </p>
        )}

        <div className="mt-8">
          <Link to="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
