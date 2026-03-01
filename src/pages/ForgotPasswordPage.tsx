import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);

  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hasRecoveryToken =
      !!hashParams.get("access_token") ||
      hashParams.get("type") === "recovery";
    setIsRecoveryMode(hasRecoveryToken);
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    setIsSubmitting(true);
    try {
      if (isRecoveryMode) {
        if (!newPassword || !confirmPassword) {
          toast({
            title: "Password required",
            description: "Enter and confirm your new password.",
            variant: "destructive",
          });
          return;
        }
        if (newPassword.length < 6) {
          toast({
            title: "Weak password",
            description: "Password must be at least 6 characters.",
            variant: "destructive",
          });
          return;
        }
        if (newPassword !== confirmPassword) {
          toast({
            title: "Passwords do not match",
            description: "Please enter the same password in both fields.",
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;

        window.location.hash = "";
        setNewPassword("");
        setConfirmPassword("");
        setIsRecoveryMode(false);
        toast({
          title: "Password updated",
          description: "Your password was changed. You can now log in.",
        });
      } else {
        const normalizedEmail = email.trim();
        if (!normalizedEmail) {
          toast({
            title: "Email required",
            description: "Please enter your email address.",
            variant: "destructive",
          });
          return;
        }

        const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
          redirectTo: `${window.location.origin}/forgot-password`,
        });
        if (error) throw error;

        toast({
          title: "Reset link sent",
          description: "Check your email and open the reset link to set a new password.",
        });
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Unable to send reset email. Please try again.";
      toast({
        title: "Request failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold text-foreground">Reset Password</h1>
          <p className="text-sm text-muted-foreground">
            {isRecoveryMode
              ? "Enter your new password below."
              : "Enter your email and we will send you a reset link."}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRecoveryMode ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? isRecoveryMode
                ? "Updating..."
                : "Sending..."
              : isRecoveryMode
                ? "Update Password"
                : "Send Reset Link"}
          </Button>
        </form>

        <div className="text-center">
          <Link to="/login" className="text-sm text-primary hover:underline">
            Back to login
          </Link>
        </div>
      </div>
    </div>
  );
}
