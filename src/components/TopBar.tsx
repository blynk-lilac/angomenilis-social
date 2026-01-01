import { Link, useLocation } from "react-router-dom";
import { Home, Users, MessageSquare, Video, Bell, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import SideMenu from "@/components/SideMenu";
import { Logo2026 } from "@/components/Logo2026";

interface Profile {
  avatar_url: string | null;
  username: string;
}

export const TopBar = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [friendRequests, setFriendRequests] = useState(0);
  const [notifications, setNotifications] = useState(0);
  const location = useLocation();

  useEffect(() => {
    loadProfile();
    loadCounts();
  }, []);

  const loadProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("profiles")
      .select("avatar_url, username")
      .eq("id", user.id)
      .single();

    if (data) setProfile(data);
  };

  const loadCounts = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { count: msgCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("read", false);

    const { count: reqCount } = await supabase
      .from("friend_requests")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", user.id)
      .eq("status", "pending");

    const { count: notifCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_read", false);

    setUnreadMessages(msgCount || 0);
    setFriendRequests(reqCount || 0);
    setNotifications(notifCount || 0);
  };

  const navItems = [
    { to: '/feed', icon: Home, badge: 0 },
    { to: '/friends', icon: Users, badge: friendRequests },
    { to: '/messages', icon: MessageSquare, badge: unreadMessages },
    { to: '/videos', icon: Video, badge: 0 },
    { to: '/notifications', icon: Bell, badge: notifications },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-card border-b border-border">
      <div className="flex items-center justify-between h-14 px-3 max-w-screen-2xl mx-auto">
        {/* Logo 2026 */}
        <Link to="/feed" className="flex items-center">
          <Logo2026 size="md" />
        </Link>

        {/* Ações do topo */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80"
            asChild
          >
            <Link to="/create">
              <Plus className="h-5 w-5" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-muted hover:bg-muted/80"
          >
            <Search className="h-5 w-5" />
          </Button>
          <SideMenu />
        </div>
      </div>

      {/* Navegação principal */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-around h-12 max-w-screen-2xl mx-auto">
          {navItems.map(({ to, icon: Icon, badge }) => (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center justify-center flex-1 h-full relative transition-colors",
                isActive(to) 
                  ? "text-primary" 
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <div className="relative">
                <Icon className="h-6 w-6" strokeWidth={isActive(to) ? 2.5 : 2} />
                {badge > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-2 -right-2 h-5 min-w-[20px] flex items-center justify-center px-1 text-xs rounded-full"
                  >
                    {badge > 99 ? '99+' : badge}
                  </Badge>
                )}
              </div>
              {isActive(to) && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </Link>
          ))}
        </div>
      </div>
    </header>
  );
};