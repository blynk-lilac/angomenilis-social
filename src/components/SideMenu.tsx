import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { 
  Menu, 
  User, 
  Users, 
  MessageCircle, 
  Video, 
  Bookmark,
  Clock,
  Settings as SettingsIcon,
  HelpCircle,
  FileText,
  LogOut,
  Shield,
  BadgeCheck,
  ChevronRight,
  ChevronDown,
  BarChart3,
  Megaphone,
  Home,
  Bell,
  RefreshCw,
  CircleDot
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useActiveProfile } from "@/contexts/ActiveProfileContext";
import VerificationBadge from "@/components/VerificationBadge";
import { useOnlineFriendsCount } from "@/hooks/useOnlineFriendsCount";

interface Profile {
  username: string;
  full_name: string;
  first_name: string;
  avatar_url: string;
  verified: boolean;
  badge_type: string | null;
}

export default function SideMenu() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const { activeProfile } = useActiveProfile();
  const onlineFriendsCount = useOnlineFriendsCount();

  useEffect(() => {
    loadProfile();
    checkAdmin();
  }, [activeProfile]);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    if (activeProfile?.type === 'page') {
      const { data } = await supabase
        .from("page_profiles")
        .select("name, avatar_url")
        .eq("id", activeProfile.id)
        .single();

      if (data) {
        setProfile({
          username: data.name,
          full_name: data.name,
          first_name: data.name,
          avatar_url: data.avatar_url,
          verified: false,
          badge_type: null
        });
      }
    } else {
      const { data } = await supabase
        .from("profiles")
        .select("username, full_name, first_name, avatar_url, verified, badge_type")
        .eq("id", user.id)
        .single();

      if (data) setProfile(data);
    }
  };

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const adminEmails = ["isaacmuaco582@gmail.com", "isaacmilagre9@gmail.com"];
    setIsAdmin(adminEmails.includes(user.email || ""));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Desconectado com sucesso");
    navigate("/auth");
  };

  const profilePath = activeProfile?.type === 'page' ? `/profile/${activeProfile.id}` : "/profile";

  const shortcuts = [
    { label: profile?.full_name || profile?.first_name || "Meu Perfil", icon: null, avatar: profile?.avatar_url, path: profilePath },
  ];

  const mainMenuItems = [
    { icon: CircleDot, label: `Amigos Online (${onlineFriendsCount})`, path: "/online-friends", color: "text-green-500", showDot: onlineFriendsCount > 0 },
    { icon: Users, label: "Amigos", path: "/friends", color: "text-cyan-500" },
    { icon: Shield, label: "Painel Admin", path: "/admin", color: "text-red-500", adminOnly: true },
    { icon: Clock, label: "Memórias", path: "#", color: "text-blue-500" },
    { icon: Bookmark, label: "Guardados", path: "/saved", color: "text-purple-500" },
    { icon: Users, label: "Grupos", path: "/groups", color: "text-cyan-500" },
    { icon: Video, label: "Reels", path: "/videos", color: "text-red-500" },
    { icon: Home, label: "Marketplace", path: "#", color: "text-teal-500" },
    { icon: Home, label: "Feeds", path: "/", color: "text-orange-500" },
  ];

  const moreMenuItems = [
    { icon: BadgeCheck, label: "Verificação", path: "/verification", color: "text-blue-500" },
    { icon: Megaphone, label: "Criar Anúncio", path: "/create-ad", color: "text-green-500" },
    { icon: MessageCircle, label: "Mensagens", path: "/messages", color: "text-pink-500" },
    { icon: Bell, label: "Notificações", path: "/notifications", color: "text-red-500" },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-muted rounded-full">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md p-0 bg-background">
        <ScrollArea className="h-full">
          <div className="p-4">
            {/* Profile Card */}
            <Link 
              to={profilePath}
              className="flex items-center gap-3 p-4 rounded-xl bg-card border border-border shadow-sm mb-4 hover:bg-muted/50 transition-colors"
            >
              <Avatar className="h-14 w-14">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-primary text-primary-foreground font-bold text-xl">
                  {profile?.first_name?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="font-bold text-lg truncate text-foreground">
                    {profile?.full_name || profile?.first_name}
                  </p>
                  {profile?.verified && <VerificationBadge verified={profile.verified} badgeType={profile.badge_type} size="sm" />}
                </div>
                <p className="text-sm text-muted-foreground">@{profile?.username}</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <RefreshCw className="h-5 w-5 text-muted-foreground" />
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>

            {/* Os teus atalhos */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-3 px-2">Os teus atalhos</p>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {shortcuts.map((item, idx) => (
                  <Link
                    key={idx}
                    to={item.path}
                    className="flex flex-col items-center gap-1 min-w-[72px]"
                  >
                    <Avatar className="h-16 w-16 rounded-xl">
                      <AvatarImage src={item.avatar || undefined} className="rounded-xl" />
                      <AvatarFallback className="bg-muted rounded-xl">
                        {item.label[0]}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs text-center line-clamp-2 w-16">{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Main Menu Grid */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {mainMenuItems
                .filter(item => !item.adminOnly || isAdmin)
                .map((item, idx) => (
                <Link
                  key={idx}
                  to={item.path}
                  className="flex flex-col items-start gap-2 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors shadow-sm relative"
                >
                  <div className="relative">
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                    {item.showDot && (
                      <span className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full border-2 border-card animate-pulse" />
                    )}
                  </div>
                  <span className="text-sm font-medium text-foreground">{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Ver mais Button */}
            <Button
              variant="secondary"
              className="w-full mb-6 rounded-xl h-12"
              onClick={() => setShowMore(!showMore)}
            >
              {showMore ? "Ver menos" : "Ver mais"}
              <ChevronDown className={`h-4 w-4 ml-2 transition-transform ${showMore ? "rotate-180" : ""}`} />
            </Button>

            {/* More Items */}
            {showMore && (
              <div className="grid grid-cols-2 gap-2 mb-6 animate-in slide-in-from-top-2">
                {moreMenuItems.map((item, idx) => (
                  <Link
                    key={idx}
                    to={item.path}
                    className="flex flex-col items-start gap-2 p-4 rounded-xl bg-card border border-border hover:bg-muted/50 transition-colors shadow-sm"
                  >
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                  </Link>
                ))}
              </div>
            )}

            {/* Bottom Section */}
            <div className="space-y-1 border-t border-border pt-4">
              <button
                onClick={() => navigate("/help")}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Ajuda e apoio técnico</span>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </button>

              <button
                onClick={() => navigate("/settings")}
                className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <SettingsIcon className="h-5 w-5 text-muted-foreground" />
                  <span className="font-medium">Definições e privacidade</span>
                </div>
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              </button>

              {isAdmin && (
                <button
                  onClick={() => navigate("/admin/verification-requests")}
                  className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-red-500" />
                    <span className="font-medium">Pedidos de Verificação</span>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </button>
              )}

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-600"
              >
                <LogOut className="h-5 w-5" />
                <span className="font-medium">Terminar sessão</span>
              </button>
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-border">
              <p className="text-xs text-muted-foreground text-center">
                Privacidade · Termos · Publicidade · Cookies<br />
                © Blynk 2024
              </p>
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
