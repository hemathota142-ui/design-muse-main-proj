import { useState } from "react";
import { motion } from "framer-motion";
import { 
  User, 
  Palette, 
  Bell, 
  Shield, 
  Sparkles,
  ChevronRight,
  Moon,
  Sun,
  Monitor
} from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { GuidedTooltip } from "@/components/ui/guided-tooltip";

const settingsSections = [
  { id: "profile", icon: User, label: "Profile" },
  { id: "appearance", icon: Palette, label: "Appearance" },
  { id: "notifications", icon: Bell, label: "Notifications" },
  { id: "ai", icon: Sparkles, label: "AI Settings" },
  { id: "privacy", icon: Shield, label: "Privacy" },
];

const accentColors = [
  { value: "teal", color: "bg-[hsl(173,58%,39%)]", label: "Teal" },
  { value: "blue", color: "bg-[hsl(217,91%,60%)]", label: "Blue" },
  { value: "purple", color: "bg-[hsl(262,83%,58%)]", label: "Purple" },
  { value: "orange", color: "bg-[hsl(25,95%,53%)]", label: "Orange" },
  { value: "pink", color: "bg-[hsl(330,81%,60%)]", label: "Pink" },
];

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState("profile");
  const { theme, accentColor, setTheme, setAccentColor } = useTheme();
  const { user, isGuest } = useAuth();
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: false,
    aiSuggestions: true,
    autoSave: true,
    shareAnalytics: false,
  });

  const updateSetting = (key: string, value: boolean) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-foreground mb-1">Settings</h1>
          <p className="text-muted-foreground">
            Manage your account preferences and application settings
          </p>
        </motion.div>

        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar Navigation */}
          <motion.nav
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="md:w-56 space-y-1"
          >
            {settingsSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-colors",
                  activeSection === section.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <section.icon className="w-5 h-5" />
                <span className="font-medium">{section.label}</span>
                {activeSection === section.id && (
                  <ChevronRight className="w-4 h-4 ml-auto" />
                )}
              </button>
            ))}
          </motion.nav>

          {/* Settings Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex-1 space-y-6"
          >
            {/* Profile Section */}
            {activeSection === "profile" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Profile Information
                    {isGuest && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-warning/20 text-warning">
                        Guest Mode
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isGuest ? (
                    <div className="p-4 rounded-xl bg-warning/10 border border-warning/20">
                      <p className="text-sm text-warning-foreground">
                        You're using the app as a guest. Sign up to save your profile and designs!
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="w-10 h-10 text-primary" />
                        </div>
                        <div>
                          <Button variant="outline" size="sm">Change Avatar</Button>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Full Name</Label>
                          <Input id="name" defaultValue={user?.user_metadata?.name
 || "John Designer"} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" defaultValue={user?.email || "john@example.com"} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bio">Bio</Label>
                        <Input id="bio" placeholder="Tell us about yourself..." />
                      </div>

                      <Button variant="gradient">Save Changes</Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Appearance Section */}
            {activeSection === "appearance" && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    Appearance
                    <GuidedTooltip content="Customize how the app looks. Your preferences are saved locally." />
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="mb-3 block">Theme</Label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { value: "light", icon: Sun, label: "Light" },
                        { value: "dark", icon: Moon, label: "Dark" },
                        { value: "system", icon: Monitor, label: "System" },
                      ].map((option) => (
                        <button
                          key={option.value}
                          onClick={() => setTheme(option.value as "light" | "dark" | "system")}
                          className={cn(
                            "flex flex-col items-center gap-2 p-4 rounded-xl border transition-all",
                            theme === option.value
                              ? "border-primary bg-primary/10"
                              : "border-border hover:border-primary/50"
                          )}
                        >
                          <option.icon className={cn(
                            "w-6 h-6",
                            theme === option.value ? "text-primary" : "text-muted-foreground"
                          )} />
                          <span className={cn(
                            "text-sm font-medium",
                            theme === option.value ? "text-primary" : "text-muted-foreground"
                          )}>
                            {option.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label className="mb-3 block">Accent Color</Label>
                    <div className="flex gap-3">
                      {accentColors.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setAccentColor(color.value as any)}
                          className={cn(
                            "w-10 h-10 rounded-full transition-all",
                            color.color,
                            accentColor === color.value
                              ? "ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110"
                              : "hover:scale-105"
                          )}
                          title={color.label}
                        />
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notifications Section */}
            {activeSection === "notifications" && (
              <Card>
                <CardHeader>
                  <CardTitle>Notifications</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <p className="font-medium text-foreground">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Receive updates about your designs via email
                      </p>
                    </div>
                    <Switch
                      checked={settings.emailNotifications}
                      onCheckedChange={(checked) => updateSetting("emailNotifications", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-foreground">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">
                        Get browser notifications for important updates
                      </p>
                    </div>
                    <Switch
                      checked={settings.pushNotifications}
                      onCheckedChange={(checked) => updateSetting("pushNotifications", checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* AI Settings Section */}
            {activeSection === "ai" && (
              <Card>
                <CardHeader>
                  <CardTitle>AI Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <p className="font-medium text-foreground">AI Suggestions</p>
                      <p className="text-sm text-muted-foreground">
                        Enable AI-powered design suggestions
                      </p>
                    </div>
                    <Switch
                      checked={settings.aiSuggestions}
                      onCheckedChange={(checked) => updateSetting("aiSuggestions", checked)}
                    />
                  </div>

                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium text-foreground">Auto-Save Designs</p>
                      <p className="text-sm text-muted-foreground">
                        Automatically save your work in progress
                      </p>
                    </div>
                    <Switch
                      checked={settings.autoSave}
                      onCheckedChange={(checked) => updateSetting("autoSave", checked)}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Privacy Section */}
            {activeSection === "privacy" && (
              <Card>
                <CardHeader>
                  <CardTitle>Privacy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b border-border">
                    <div>
                      <p className="font-medium text-foreground">Share Usage Analytics</p>
                      <p className="text-sm text-muted-foreground">
                        Help us improve by sharing anonymous usage data
                      </p>
                    </div>
                    <Switch
                      checked={settings.shareAnalytics}
                      onCheckedChange={(checked) => updateSetting("shareAnalytics", checked)}
                    />
                  </div>

                  <div className="pt-4">
                    <Button variant="destructive">Delete Account</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.div>
        </div>
      </div>
    </AppLayout>
  );
}
