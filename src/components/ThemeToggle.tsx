import { Moon, Sun, Monitor, Palette } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const accentColorMap = {
  teal: "bg-[hsl(173,58%,39%)]",
  blue: "bg-[hsl(217,91%,60%)]",
  purple: "bg-[hsl(262,83%,58%)]",
  orange: "bg-[hsl(25,95%,53%)]",
  pink: "bg-[hsl(330,81%,60%)]",
};

export function ThemeToggle() {
  const { theme, accentColor, setTheme, setAccentColor, availableAccents } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Theme</DropdownMenuLabel>
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={cn(theme === "light" && "bg-accent")}
        >
          <Sun className="mr-2 h-4 w-4" />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={cn(theme === "dark" && "bg-accent")}
        >
          <Moon className="mr-2 h-4 w-4" />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={cn(theme === "system" && "bg-accent")}
        >
          <Monitor className="mr-2 h-4 w-4" />
          System
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="flex items-center gap-2">
          <Palette className="h-4 w-4" />
          Accent Color
        </DropdownMenuLabel>
        <div className="flex gap-2 p-2">
          {availableAccents.map((color) => (
            <button
              key={color}
              onClick={() => setAccentColor(color)}
              className={cn(
                "w-6 h-6 rounded-full transition-all",
                accentColorMap[color],
                accentColor === color
                  ? "ring-2 ring-offset-2 ring-foreground"
                  : "hover:scale-110"
              )}
              title={color.charAt(0).toUpperCase() + color.slice(1)}
            />
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
