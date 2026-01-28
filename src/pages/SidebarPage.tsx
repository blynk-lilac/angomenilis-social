import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Home, Search, Film, MessageCircle, Heart, PlusSquare, 
  User, LogOut, Settings, Bookmark, Shield, Users, 
  Sun, Moon, Target, Trophy, Play, Bell, Compass,
  Video, Image, TrendingUp, Zap, Award, Lock
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useSettings } from "@/contexts/SettingsContext";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import VerificationBadge from "@/components/VerificationBadge";

interface Profile {
  username: string;
  avatar_url: string;
  verified?: boolean;
  badge_type?: string;
}

export default function SidebarPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [onlineFriends, setOnlineFriends] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [unreadMessages, setUnreadMessages] = useState(0);

  const isDarkMode = settings.theme === 'dark';

  const toggleTheme = () => {
    const newTheme = isDarkMode ? 'light' : 'dark';
    updateSettings({ theme: newTheme });
    toast.success(newTheme === 'dark' ? 'Modo escuro ativado' : 'Modo claro ativado');
  };

  useEffect(() => {
    loadProfile();
    checkAdminStatus();
    loadOnlineFriends();
    loadUnreadCounts();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url, verified, badge_type")
      .eq("id", user.id)
      .single();

    if (data) setProfile(data);
  };

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const loadOnlineFriends = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const { count } = await supabase
      .from("user_presence")
      .select("*", { count: 'exact', head: true })
      .gt("last_seen", fiveMinutesAgo);

    setOnlineFriends(count || 0);
  };

  const loadUnreadCounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Unread notifications
    const { count: notifCount } = await supabase
      .from("notifications")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setUnreadNotifications(notifCount || 0);

    // Unread messages
    const { count: msgCount } = await supabase
      .from("messages")
      .select("*", { count: 'exact', head: true })
      .eq("receiver_id", user.id)
      .eq("read", false);

    setUnreadMessages(msgCount || 0);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Desconectado");
    navigate("/auth");
  };

  const navSections = [
    {
      title: "Principal",
      items: [
        { icon: Home, label: "Início", path: "/feed" },
        { icon: Compass, label: "Explorar", path: "/friends" },
        { icon: Film, label: "Vídeos", path: "/videos" },
        { icon: Image, label: "Stories", path: "/stories" },
      ]
    },
    {
      title: "Social",
      items: [
        { icon: MessageCircle, label: "Mensagens", path: "/messages", badge: unreadMessages },
        { icon: Bell, label: "Notificações", path: "/notifications", badge: unreadNotifications },
        { icon: Users, label: "Amigos Online", path: "/online-friends", badge: onlineFriends },
      ]
    },
    {
      title: "CTF Hacking",
      items: [
        { icon: Target, label: "Desafios CTF", path: "/ctf-hacking", highlight: true },
        { icon: Trophy, label: "Ranking", path: "/ctf-hacking?tab=leaderboard" },
        { icon: Award, label: "Recompensas", path: "/ctf-hacking?tab=rewards" },
      ]
    },
    {
      title: "Criar",
      items: [
        { icon: PlusSquare, label: "Nova Publicação", path: "/create" },
        { icon: TrendingUp, label: "Criar Anúncio", path: "/create-ad" },
        { icon: Video, label: "Editor de Vídeo", path: "/video-editor" },
      ]
    },
    {
      title: "Configurações",
      items: [
        { icon: Bookmark, label: "Guardados", path: "/saved" },
        { icon: Settings, label: "Configurações", path: "/app-settings" },
        { icon: Lock, label: "Segurança", path: "/settings/security" },
      ]
    },
  ];

  const isActive = (path: string) => {
    if (path.includes('?')) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between h-16 px-6">
          <Link to="/feed" className="flex items-center gap-3">
            <div className="h-10 w-10 bg-gradient-to-br from-primary to-primary/60 rounded-xl flex items-center justify-center shadow-lg">
              <Play className="h-5 w-5 text-white fill-white" />
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
              Blynk
            </span>
          </Link>
          
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="rounded-xl"
            >
              {isDarkMode ? <Sun className="h-5 w-5 text-yellow-500" /> : <Moon className="h-5 w-5 text-blue-500" />}
            </Button>
          </div>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="max-w-lg mx-auto p-4 space-y-6">
          {/* Profile Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-2xl p-6 shadow-sm"
          >
            <Link to="/profile" className="flex items-center gap-4">
              <Avatar className="h-16 w-16 ring-4 ring-primary/20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="text-xl bg-primary/10 text-primary">
                  {profile?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold truncate">
                    {profile?.username || 'Utilizador'}
                  </h2>
                  {profile?.verified && (
                    <VerificationBadge badgeType={profile.badge_type} />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Ver perfil</p>
              </div>
              <User className="h-5 w-5 text-muted-foreground" />
            </Link>
          </motion.div>

          {/* Navigation Sections */}
          {navSections.map((section, sectionIndex) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: sectionIndex * 0.1 }}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="px-4 py-3 bg-muted/30 border-b border-border">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {section.title}
                </h3>
              </div>
              <div className="divide-y divide-border">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={cn(
                        "flex items-center gap-4 px-4 py-4 transition-all",
                        active
                          ? "bg-primary/10 text-primary"
                          : "hover:bg-muted/50",
                        item.highlight && !active && "text-primary"
                      )}
                    >
                      <div className={cn(
                        "h-10 w-10 rounded-xl flex items-center justify-center transition-colors",
                        active
                          ? "bg-primary text-primary-foreground"
                          : item.highlight
                            ? "bg-primary/10 text-primary"
                            : "bg-muted/50"
                      )}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <span className={cn(
                        "flex-1 font-medium",
                        active && "font-semibold"
                      )}>
                        {item.label}
                      </span>
                      {item.badge && item.badge > 0 && (
                        <span className="px-2.5 py-1 bg-primary text-primary-foreground text-xs font-bold rounded-full">
                          {item.badge > 99 ? '99+' : item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </motion.div>
          ))}

          {/* Admin Panel */}
          {isAdmin && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="px-4 py-3 bg-red-500/10 border-b border-border">
                <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                  Administração
                </h3>
              </div>
              <Link
                to="/admin"
                className="flex items-center gap-4 px-4 py-4 hover:bg-muted/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-red-500" />
                </div>
                <span className="font-medium text-red-500">Painel Admin</span>
              </Link>
            </motion.div>
          )}

          {/* Logout Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full h-14 rounded-2xl border-destructive/50 text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Terminar Sessão
            </Button>
          </motion.div>

          {/* Copyright */}
          <div className="text-center py-6">
            <p className="text-xs text-muted-foreground/60">
              © 2026/2027 Blynk • Todos os direitos reservados
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
