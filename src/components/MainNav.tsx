import { Link, useLocation } from "react-router-dom";
import { Home, MessageSquare, Video, User, Users } from "lucide-react";
import { cn } from "@/lib/utils";

export const MainNav = () => {
  const location = useLocation();

  const navItems = [
    { to: "/feed", icon: Home, label: "Feed" },
    { to: "/friends", icon: Users, label: "Amigos" },
    { to: "/messages", icon: MessageSquare, label: "Mensagens" },
    { to: "/videos", icon: Video, label: "Vídeos" },
    { to: "/profile", icon: User, label: "Perfil" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50 md:hidden">
      <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto px-2">
        {navItems.map(({ to, icon: Icon, label }) => {
          const isActive = location.pathname === to || location.pathname.startsWith(to + "/");
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full transition-colors rounded-lg py-2",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="text-[10px] mt-1 font-medium">{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
