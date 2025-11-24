import { Link } from "react-router-dom";
import { Bell, Search, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import blynkLogo from "@/assets/blynk-logo.jpg";
import SideMenu from "@/components/SideMenu";
import { useNotificationCount } from "@/hooks/useNotificationCount";
import { useUnreadMessages } from "@/hooks/useUnreadMessages";
import { NotificationBadge } from "@/components/NotificationBadge";
import ProfileSwitcher from "@/components/ProfileSwitcher";

export const TopBar = () => {
  const notificationCount = useNotificationCount();
  const { messageCount } = useUnreadMessages();

  return (
    <header className="fixed top-0 left-0 right-0 bg-background/95 backdrop-blur-md border-b border-border z-50">
      <div className="flex items-center justify-between h-16 px-4 max-w-screen-xl mx-auto">
        <div className="flex items-center gap-3">
          <SideMenu />
          <Link to="/feed" className="flex items-center gap-2">
            <img src={blynkLogo} alt="Blynk" className="h-8 w-auto" />
          </Link>
          <ProfileSwitcher />
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
              <NotificationBadge count={messageCount} />
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
