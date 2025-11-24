import { Link, useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Film, MessageCircle, Heart, PlusSquare, Menu, User, LogOut, Settings, Bookmark } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Profile {
  username: string;
  avatar_url: string;
}

export default function InstagramSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url")
      .eq("id", user.id)
      .single();

    if (data) setProfile(data);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Desconectado");
    navigate("/auth");
  };

  const navItems = [
    { icon: Home, label: "Início", path: "/feed" },
    { icon: Search, label: "Pesquisa", path: "/search" },
    { icon: Film, label: "Vídeos", path: "/videos" },
    { icon: MessageCircle, label: "Mensagens", path: "/messages" },
    { icon: Heart, label: "Notificações", path: "/notifications" },
    { icon: PlusSquare, label: "Criar", path: "/create" },
    { icon: Bookmark, label: "Guardados", path: "/saved" },
    { icon: Settings, label: "Configurações", path: "/app-settings" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <aside className={cn(
      "hidden md:flex flex-col fixed left-0 top-0 h-screen bg-card/50 backdrop-blur-xl border-r border-border/40 transition-all duration-300 z-50 shadow-sm",
      collapsed ? "w-20" : "w-[280px]"
    )}>
      <div className="flex-1 flex flex-col py-6 px-2">
        {/* Logo */}
        <div className="mb-8 px-4">
          <h1 className={cn(
            "text-3xl font-extrabold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent transition-opacity",
            collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          )}>
            Blynk
          </h1>
          {collapsed && <Menu className="h-7 w-7 mx-auto text-primary" />}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5">
          {navItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden",
                  active
                    ? "bg-foreground/10 font-bold text-foreground shadow-sm"
                    : "hover:bg-muted/70 text-muted-foreground hover:text-foreground"
                )}
              >
                {active && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
                )}
                <item.icon 
                  className={cn(
                    "h-[26px] w-[26px] transition-all flex-shrink-0",
                    active ? "stroke-[2.5] text-foreground" : "stroke-[2] group-hover:scale-110"
                  )} 
                />
                <span className={cn(
                  "text-[15px] transition-opacity font-medium",
                  collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
                )}>
                  {item.label}
                </span>
              </Link>
            );
          })}

          {/* Profile */}
          <Link
            to="/profile"
            className={cn(
              "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all duration-200 group relative overflow-hidden",
              isActive("/profile")
                ? "bg-foreground/10 font-bold text-foreground shadow-sm"
                : "hover:bg-muted/70 text-muted-foreground hover:text-foreground"
            )}
          >
            {isActive("/profile") && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
            )}
            <Avatar className="h-[26px] w-[26px] border-2 border-border/50 group-hover:scale-110 transition-transform">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-xs bg-gradient-to-br from-primary/20 to-secondary/20 text-foreground font-bold">
                {profile?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className={cn(
              "text-[15px] transition-opacity font-medium",
              collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}>
              Perfil
            </span>
          </Link>
        </nav>

        {/* Bottom Actions */}
        <div className="space-y-0.5 pt-4 border-t border-border/40 mt-4">
          <Button
            variant="ghost"
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "w-full justify-start gap-4 px-4 py-3.5 h-auto rounded-xl hover:bg-muted/70 text-muted-foreground hover:text-foreground transition-all",
              collapsed && "justify-center"
            )}
          >
            <Menu className="h-[26px] w-[26px]" />
            <span className={cn(
              "text-[15px] transition-opacity font-medium",
              collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}>
              Mais
            </span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className={cn(
              "w-full justify-start gap-4 px-4 py-3.5 h-auto rounded-xl transition-all",
              "text-destructive hover:text-destructive hover:bg-destructive/10",
              collapsed && "justify-center"
            )}
          >
            <LogOut className="h-[26px] w-[26px]" />
            <span className={cn(
              "text-[15px] transition-opacity font-medium",
              collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}>
              Sair
            </span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
