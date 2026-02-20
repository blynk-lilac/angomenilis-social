import { Link, useLocation } from "react-router-dom";
import { Home, Film, PlusSquare, Search, Sun, Moon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";

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

  const hiddenPaths = ["/auth", "/", "/signup", "/reset-password", "/two-factor-verification", "/blocked"];
  if (hiddenPaths.some(p => location.pathname === p)) return null;
  if (location.pathname.startsWith("/chat/")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 safe-area-bottom liquid-glass-bottom">
      <div className="flex items-center justify-around h-[50px] max-w-lg mx-auto px-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-col items-center justify-center h-[50px] w-14 rounded-xl press-effect",
              isActive(to) ? "text-foreground" : "text-muted-foreground"
            )}
          >
            <Icon
              className="h-[22px] w-[22px]"
              strokeWidth={isActive(to) ? 2.5 : 1.5}
              fill={isActive(to) && to !== "/create" ? "currentColor" : "none"}
            />
            {isActive(to) && (
              <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />
            )}
          </Link>
        ))}

        {/* Liquid Glass Theme Toggle */}
        <button
          onClick={toggleTheme}
          className={cn(
            "flex items-center justify-center h-8 w-8 rounded-full transition-all duration-300 press-effect",
            isDarkMode
              ? "bg-white/[0.08] border border-white/[0.12]"
              : "bg-black/[0.04] border border-black/[0.06]"
          )}
          style={{
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
          }}
        >
          {isDarkMode ? (
            <Sun className="h-3.5 w-3.5 text-amber-400" />
          ) : (
            <Moon className="h-3.5 w-3.5 text-foreground/70" />
          )}
        </button>

        {/* Profile */}
        <Link
          to="/profile"
          className="flex items-center justify-center h-[50px] w-14 press-effect"
        >
          <Avatar className={cn(
            "h-[26px] w-[26px] transition-all",
            isActive("/profile") && "ring-[1.5px] ring-foreground ring-offset-1 ring-offset-background"
          )}>
            <AvatarImage src={profile?.avatar_url || undefined} className="object-cover" />
            <AvatarFallback className="bg-muted text-[10px] font-semibold">U</AvatarFallback>
          </Avatar>
        </Link>
      </div>
    </nav>
  );
}
