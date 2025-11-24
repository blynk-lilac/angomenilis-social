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
      "hidden md:flex flex-col fixed left-0 top-0 h-screen bg-background border-r border-border transition-all duration-300 z-50",
      collapsed ? "w-20" : "w-64"
    )}>
      <div className="flex-1 flex flex-col py-8 px-3">
        {/* Logo */}
        <div className="mb-10 px-3">
          <h1 className={cn(
            "text-2xl font-bold transition-opacity",
            collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
          )}>
            Blynk
          </h1>
          {collapsed && <Menu className="h-6 w-6 mx-auto" />}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-4 px-3 py-3 rounded-lg transition-all group",
                isActive(item.path)
                  ? "font-bold"
                  : "hover:bg-muted/50"
              )}
            >
              <item.icon 
                className={cn(
                  "h-6 w-6 transition-all",
                  isActive(item.path) ? "stroke-[2.5]" : "stroke-[1.5]"
                )} 
              />
              <span className={cn(
                "text-base transition-opacity",
                collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
              )}>
                {item.label}
              </span>
            </Link>
          ))}

          {/* Profile */}
          <Link
            to="/profile"
            className={cn(
              "flex items-center gap-4 px-3 py-3 rounded-lg transition-all group",
              isActive("/profile")
                ? "font-bold"
                : "hover:bg-muted/50"
            )}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="text-xs">
                {profile?.username?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className={cn(
              "text-base transition-opacity",
              collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}>
              Perfil
            </span>
          </Link>
        </nav>

        {/* Bottom Actions */}
        <div className="space-y-1 pt-4 border-t border-border">
          <Button
            variant="ghost"
            onClick={() => setCollapsed(!collapsed)}
            className="w-full justify-start gap-4 px-3 py-3 h-auto"
          >
            <Menu className="h-6 w-6" />
            <span className={cn(
              "text-base transition-opacity",
              collapsed ? "opacity-0 w-0 overflow-hidden" : "opacity-100"
            )}>
              Mais
            </span>
          </Button>

          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start gap-4 px-3 py-3 h-auto text-red-600 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            <LogOut className="h-6 w-6" />
            <span className={cn(
              "text-base transition-opacity",
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
