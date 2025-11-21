import { Link } from "react-router-dom";
import { Bell, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png";
import SideMenu from "@/components/SideMenu";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { NotificationBadge } from "@/components/NotificationBadge";

export const TopBar = () => {
  const notificationCount = useNotificationCount();
  const unreadMessages = useUnreadMessages();

  return (
    <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border z-50">
      <div className="flex items-center justify-between h-16 px-4 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-2">
          <SideMenu />
          <img src={logo} alt="Logo" className="h-8 w-8 rounded-full" />
          <span className="text-xl font-bold hidden sm:inline">Angomenilis</span>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/search">
              <Search className="h-5 w-5" />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className="relative">
            <Link to="/messages">
              <MessageCircle className="h-5 w-5" />
              <NotificationBadge count={unreadMessages} />
            </Link>
          </Button>
          <Button variant="ghost" size="icon" asChild className="relative">
            <Link to="/notifications">
              <Bell className="h-5 w-5" />
              <NotificationBadge count={notificationCount} />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
};
