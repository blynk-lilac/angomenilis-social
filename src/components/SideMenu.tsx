import { Link, useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { 
  Menu, 
  User, 
  Users, 
  MessageCircle, 
  Video, 
  Heart,
  Calendar,
  Gift,
  Bookmark,
  Clock,
  Settings as SettingsIcon,
  HelpCircle,
  FileText,
  LogOut,
  Shield,
  BadgeCheck,
  ChevronRight,
  Palette,
  Globe,
  Database
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Profile {
  username: string;
  full_name: string;
  avatar_url: string;
}

export default function SideMenu() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    loadProfile();
    checkAdmin();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("username, full_name, avatar_url")
      .eq("id", user.id)
      .single();

    if (data) setProfile(data);
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

  const menuSections = [
    {
      title: "Seus atalhos",
      items: [
        { icon: User, label: "Meu Perfil", path: "/profile", color: "text-blue-600", bgColor: "bg-gradient-to-br from-blue-500/10 to-blue-600/10" },
        { icon: Users, label: "Amigos", path: "/friends", color: "text-cyan-600", bgColor: "bg-gradient-to-br from-cyan-500/10 to-cyan-600/10" },
        { icon: MessageCircle, label: "Mensagens", path: "/messages", color: "text-pink-600", bgColor: "bg-gradient-to-br from-pink-500/10 to-pink-600/10" },
        { icon: Video, label: "Vídeos", path: "/videos", color: "text-purple-600", bgColor: "bg-gradient-to-br from-purple-500/10 to-purple-600/10" },
        { icon: BadgeCheck, label: "Verificação", path: "/verification", color: "text-green-600", bgColor: "bg-gradient-to-br from-green-500/10 to-green-600/10" },
      ]
    },
    {
      title: "Profissional",
      items: [
        { icon: FileText, label: "Criar Anúncio", path: "/create-ad", color: "text-orange-600", bgColor: "bg-gradient-to-br from-orange-500/10 to-orange-600/10" },
      ]
    },
    {
      title: "Pessoal",
      items: [
        { icon: Bookmark, label: "Guardados", path: "/saved", color: "text-purple-600", bgColor: "bg-gradient-to-br from-purple-500/10 to-purple-600/10" },
        { icon: Clock, label: "Memórias", path: "#", color: "text-blue-600", bgColor: "bg-gradient-to-br from-blue-500/10 to-blue-600/10" },
        { icon: Gift, label: "Aniversários", path: "#", color: "text-pink-600", bgColor: "bg-gradient-to-br from-pink-500/10 to-pink-600/10" },
        { icon: Calendar, label: "Eventos", path: "#", color: "text-red-600", bgColor: "bg-gradient-to-br from-red-500/10 to-red-600/10" },
      ]
    }
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="hover:bg-muted rounded-full">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-full sm:max-w-md p-0 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80">
        <ScrollArea className="h-full">
          <div className="p-5">
            {/* Header com título e gradiente */}
            <div className="mb-8 pt-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <Menu className="h-5 w-5 text-white" />
                </div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
                  Menu
                </h1>
              </div>
              <p className="text-sm text-muted-foreground ml-13">Acesso rápido às suas páginas</p>
            </div>

            {/* Profile Card - Design Moderno */}
            <Link 
              to="/profile" 
              className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-br from-muted/50 to-muted/30 hover:from-muted/70 hover:to-muted/50 transition-all duration-300 mb-6 group border border-border/50 shadow-sm"
            >
              <Avatar className="h-16 w-16 ring-2 ring-primary/20 group-hover:ring-primary/40 transition-all">
                <AvatarImage src={profile?.avatar_url} />
                <AvatarFallback className="bg-gradient-to-br from-primary via-accent to-primary/80 text-white font-bold text-xl">
                  {profile?.username?.[0]?.toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-lg truncate text-foreground group-hover:text-primary transition-colors">
                  {profile?.full_name || profile?.username}
                </p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  Ver perfil 
                  <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </p>
              </div>
            </Link>

            <Separator className="my-4" />

            {/* Menu Sections - Design Aprimorado */}
            {menuSections.map((section, idx) => (
              <div key={idx} className="mb-7">
                <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-4 px-3">
                  {section.title}
                </h2>
                <div className="space-y-2">
                  {section.items.map((item) => (
                    <Link
                      key={item.label}
                      to={item.path}
                      className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/60 transition-all duration-200 group hover:shadow-sm"
                    >
                      <div className={`w-11 h-11 rounded-xl ${item.bgColor} flex items-center justify-center shadow-sm group-hover:shadow-md transition-all`}>
                        <item.icon className={`h-5 w-5 ${item.color}`} />
                      </div>
                      <span className="text-[15px] font-medium text-foreground group-hover:text-primary transition-colors flex-1">
                        {item.label}
                      </span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                    </Link>
                  ))}
                </div>
              </div>
            ))}

            <Separator className="my-5 opacity-50" />

            {/* Configurações e Sair - Design Aprimorado */}
            <div className="space-y-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground/80 mb-4 px-3">
                Configurações e suporte
              </h2>
              
              {isAdmin && (
                <Link
                  to="/admin"
                  className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/60 transition-all duration-200 group hover:shadow-sm"
                >
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/10 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                    <Shield className="h-5 w-5 text-red-600" />
                  </div>
                  <span className="text-[15px] font-medium text-foreground group-hover:text-primary transition-colors flex-1">
                    Painel Admin
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                </Link>
              )}
              
              <Link
                to="/app-settings"
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/60 transition-all duration-200 group hover:shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-600/10 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                  <Palette className="h-5 w-5 text-purple-600" />
                </div>
                <span className="text-[15px] font-medium text-foreground group-hover:text-primary transition-colors flex-1">
                  Configurações do App
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>
              
              <Link
                to="/settings"
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/60 transition-all duration-200 group hover:shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gray-500/10 to-gray-600/10 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                  <Shield className="h-5 w-5 text-gray-600" />
                </div>
                <span className="text-[15px] font-medium text-foreground group-hover:text-primary transition-colors flex-1">
                  Definições e privacidade
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>
              
              <Link
                to="/help"
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/60 transition-all duration-200 group hover:shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500/10 to-blue-600/10 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                  <HelpCircle className="h-5 w-5 text-blue-600" />
                </div>
                <span className="text-[15px] font-medium text-foreground group-hover:text-primary transition-colors flex-1">
                  Ajuda e suporte
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>
              
              <Link
                to="/terms"
                className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/60 transition-all duration-200 group hover:shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-600/10 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                  <FileText className="h-5 w-5 text-yellow-600" />
                </div>
                <span className="text-[15px] font-medium text-foreground group-hover:text-primary transition-colors flex-1">
                  Termos e políticas
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
              </Link>
              
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 p-3 rounded-xl hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-all duration-200 group hover:shadow-sm"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-red-500/10 to-red-600/10 flex items-center justify-center shadow-sm group-hover:shadow-md transition-all">
                  <LogOut className="h-5 w-5 text-red-600" />
                </div>
                <span className="text-[15px] font-medium text-foreground group-hover:text-red-600 transition-colors flex-1 text-left">
                  Terminar sessão
                </span>
              </button>
            </div>

            <div className="pt-6 pb-4 px-3">
              <p className="text-xs text-muted-foreground/60 leading-relaxed text-center">
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
