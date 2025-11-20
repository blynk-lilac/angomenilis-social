import { NavLink } from '@/components/NavLink';
import { Home, Users, MessageSquare, Video, User } from 'lucide-react';

export const BottomNav = () => {
  const navItems = [
    { to: '/feed', icon: Home, label: 'Feed' },
    { to: '/friends', icon: Users, label: 'Amigos' },
    { to: '/messages', icon: MessageSquare, label: 'Mensagens' },
    { to: '/videos', icon: Video, label: 'Vídeos' },
    { to: '/settings', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50 safe-area-bottom shadow-lg">
      <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto px-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/feed'}
            className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground hover:text-foreground transition-all rounded-lg hover:bg-muted/50 py-2 relative group"
            activeClassName="text-primary font-semibold"
          >
            <div className="relative">
              <Icon className="h-6 w-6 group-hover:scale-110 transition-transform" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full opacity-0 group-[.active]:opacity-100 animate-pulse-ring"></span>
            </div>
            <span className="text-[11px] mt-1 font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
