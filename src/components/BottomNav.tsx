import { Link, useLocation } from "react-router-dom";
import { Home, Film, PlusSquare, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { Sun, Moon } from "lucide-react";

export default function BottomNav() {
  const location = useLocation();
  const { settings, updateSettings } = useSettings();
  const [profile, setProfile] = useState<{ avatar_url: string | null; id: string } | null>(null);
  const isDarkMode = settings.theme === 'dark';

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("avatar_url, id").eq("id", user.id).single();
      if (data) setProfile(data);
    };
    loadProfile();
  }, []);

  const isActive = (path: string) => location.pathname === path;

  const toggleTheme = () => {
    updateSettings({ theme: isDarkMode ? 'light' : 'dark' });
  };

  const navItems = [
    { to: "/feed", icon: Home, label: "Início" },
    { to: "/videos", icon: Film, label: "Reels" },
    { to: "/create", icon: PlusSquare, label: "Criar" },
    { to: "/friends", icon: Search, label: "Explorar" },
  ];

  // Don't show on certain pages
  const hiddenPaths = ["/auth", "/", "/signup", "/reset-password", "/two-factor-verification", "/blocked"];
  if (hiddenPaths.some(p => location.pathname === p)) return null;
  // Hide on chat pages
  if (location.pathname.startsWith("/chat/")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-12 max-w-lg mx-auto px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex items-center justify-center h-12 w-12 rounded-lg transition-colors",
              isActive(to) ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Icon
              className="h-6 w-6"
              strokeWidth={isActive(to) ? 2.5 : 1.5}
              fill={isActive(to) && to !== "/create" ? "currentColor" : "none"}
            />
          </Link>
        ))}

        {/* Dark mode toggle - Liquid Glass iOS */}
        <button
          onClick={toggleTheme}
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded-full transition-all duration-300",
            isDarkMode
              ? "bg-white/10 backdrop-blur-xl border border-white/20 shadow-[0_0_15px_rgba(255,255,255,0.1)]"
              : "bg-black/5 backdrop-blur-xl border border-black/10 shadow-[0_0_15px_rgba(0,0,0,0.05)]"
          )}
        >
          {isDarkMode ? (
            <Sun className="h-4 w-4 text-yellow-400" />
          ) : (
            <Moon className="h-4 w-4 text-foreground" />
          )}
        </button>

        {/* Profile Avatar */}
        <Link
          to="/profile"
          className={cn(
            "flex items-center justify-center h-12 w-12",
          )}
        >
          <Avatar className={cn(
            "h-7 w-7 transition-all",
            isActive("/profile") ? "ring-2 ring-foreground" : ""
          )}>
            <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
            <AvatarFallback className="bg-muted text-xs font-semibold">U</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </nav>
  );
}
