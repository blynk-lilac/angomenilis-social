import { Link, useLocation, useNavigate } from "react-router-dom";
import { 
  Home, Search, Film, MessageCircle, Bell, PlusSquare, 
  User, LogOut, Settings, Bookmark, Shield, Users, 
  Sun, Moon, Target, Trophy, Play, Compass, UserPlus,
  Video, TrendingUp, Award, Lock, Store, Calendar, Gamepad2,
  Heart, Image, Flag, HelpCircle, FileText, DollarSign, BadgeCheck,
  CreditCard
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
  first_name?: string;
  verified?: boolean;
  badge_type?: string;
}

export default function SidebarPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { settings, updateSettings } = useSettings();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
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
    loadUnreadCounts();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("username, avatar_url, first_name, verified, badge_type")
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

  const loadUnreadCounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count: notifCount } = await supabase
      .from("notifications")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setUnreadNotifications(notifCount || 0);

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

  // Facebook-style navigation sections
  const mainNav = [
    { icon: Home, label: "Início", path: "/feed", color: "text-blue-500" },
    { icon: Users, label: "Amigos", path: "/friends", color: "text-blue-500" },
    { icon: Film, label: "Watch", path: "/videos", color: "text-blue-500" },
    { icon: Store, label: "Marketplace", path: "/create-ad", color: "text-blue-500" },
  ];

  const shortcuts = [
    { icon: MessageCircle, label: "Mensagens", path: "/messages", badge: unreadMessages, color: "text-purple-500" },
    { icon: Bell, label: "Notificações", path: "/notifications", badge: unreadNotifications, color: "text-red-500" },
    { icon: Bookmark, label: "Guardados", path: "/saved", color: "text-purple-600" },
    { icon: Calendar, label: "Stories", path: "/stories", color: "text-pink-500" },
  ];

  const ctfSection = [
    { icon: Target, label: "CTF Hacking", path: "/ctf-hacking", color: "text-green-500" },
    { icon: Trophy, label: "Ranking", path: "/ctf-hacking?tab=leaderboard", color: "text-yellow-500" },
    { icon: Award, label: "Recompensas", path: "/ctf-hacking?tab=rewards", color: "text-orange-500" },
  ];

  const premiumSection = [
    { icon: DollarSign, label: "Monetização", path: "/monetization", color: "text-green-500" },
    { icon: BadgeCheck, label: "Pagar Verificação", path: "/verification-checkout", color: "text-blue-500" },
  ];

  const createSection = [
    { icon: PlusSquare, label: "Criar Publicação", path: "/create", color: "text-blue-500" },
    { icon: TrendingUp, label: "Criar Anúncio", path: "/create-ad", color: "text-green-500" },
    { icon: Video, label: "Editor de Vídeo", path: "/video-editor", color: "text-red-500" },
  ];

  const settingsSection = [
    { icon: Settings, label: "Configurações", path: "/app-settings" },
    { icon: Lock, label: "Privacidade", path: "/settings/security" },
    { icon: HelpCircle, label: "Ajuda", path: "/help" },
    { icon: FileText, label: "Termos", path: "/terms" },
  ];

  const isActive = (path: string) => {
    if (path.includes('?')) {
      return location.pathname + location.search === path;
    }
    return location.pathname === path;
  };

  const NavItem = ({ icon: Icon, label, path, badge, color }: any) => {
    const active = isActive(path);
    
    return (
      <Link
        to={path}
        className={cn(
          "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200",
          active
            ? "bg-primary/10 text-primary font-semibold"
            : "hover:bg-muted"
        )}
      >
        <div className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center",
          active ? "bg-primary/20" : "bg-muted"
        )}>
          <Icon className={cn("h-5 w-5", active ? "text-primary" : color || "text-foreground")} />
        </div>
        <span className="flex-1 font-medium">{label}</span>
        {badge && badge > 0 && (
          <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] text-center">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    );
  };

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="px-4 py-2 mt-4 first:mt-0">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Facebook-style Header */}
      <header className="sticky top-0 z-50 bg-card border-b border-border shadow-sm">
        <div className="flex items-center justify-between h-14 px-4">
          <Link to="/feed" className="flex items-center gap-2">
            <div className="h-10 w-10 bg-primary rounded-full flex items-center justify-center">
              <span className="text-xl font-bold text-primary-foreground">B</span>
            </div>
          </Link>
          
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-10 w-10 rounded-full bg-muted"
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/friends')}
              className="h-10 w-10 rounded-full bg-muted"
            >
              <Search className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <ScrollArea className="h-[calc(100vh-3.5rem)]">
        <div className="py-2">
          {/* Profile Card - Facebook Style */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-3 mb-4"
          >
            <Link
              to="/profile"
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted transition-colors"
            >
              <Avatar className="h-12 w-12 ring-2 ring-primary/20">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-lg">
                  {profile?.first_name?.[0] || profile?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold truncate">
                    {profile?.first_name || profile?.username || 'Utilizador'}
                  </span>
                  {profile?.verified && (
                    <VerificationBadge badgeType={profile.badge_type} />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">Ver o teu perfil</p>
              </div>
            </Link>
          </motion.div>

          {/* Divider */}
          <div className="h-px bg-border mx-4 mb-2" />

          {/* Main Navigation */}
          <nav className="px-2">
            {mainNav.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}
          </nav>

          <div className="h-px bg-border mx-4 my-2" />

          {/* Shortcuts */}
          <SectionHeader title="Atalhos" />
          <nav className="px-2">
            {shortcuts.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}
          </nav>

          <div className="h-px bg-border mx-4 my-2" />

          {/* CTF Hacking */}
          <SectionHeader title="CTF Hacking" />
          <nav className="px-2">
            {ctfSection.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}
          </nav>

          <div className="h-px bg-border mx-4 my-2" />

          {/* Create */}
          <SectionHeader title="Criar" />
          <nav className="px-2">
            {createSection.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}
          </nav>

          <div className="h-px bg-border mx-4 my-2" />

          {/* Premium */}
          <SectionHeader title="Premium" />
          <nav className="px-2">
            {premiumSection.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}
          </nav>

          <div className="h-px bg-border mx-4 my-2" />

          {/* Admin Panel */}
          {isAdmin && (
            <>
              <SectionHeader title="Administração" />
              <nav className="px-2">
                <NavItem icon={Shield} label="Painel Admin" path="/admin" color="text-red-500" />
                <NavItem icon={CreditCard} label="Pagamentos Verificação" path="/admin/verification" color="text-orange-500" />
              </nav>
              <div className="h-px bg-border mx-4 my-2" />
            </>
          )}

          {/* Settings */}
          <SectionHeader title="Definições e Ajuda" />
          <nav className="px-2">
            {settingsSection.map((item) => (
              <NavItem key={item.path} {...item} />
            ))}
          </nav>

          {/* Logout Button */}
          <div className="px-4 py-4">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="w-full h-12 rounded-xl border-destructive/30 text-destructive hover:bg-destructive/10"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Terminar Sessão
            </Button>
          </div>

          {/* Copyright */}
          <div className="text-center pb-6">
            <p className="text-xs text-muted-foreground/60">
              © 2026/2027 Blynk • Privacidade • Termos
            </p>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}
