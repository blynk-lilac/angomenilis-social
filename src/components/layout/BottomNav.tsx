import { NavLink } from '@/components/NavLink';
import { MessageCircle, Users, Image, Settings, UsersRound } from 'lucide-react';

export const BottomNav = () => {
  const navItems = [
    { to: '/', icon: MessageCircle, label: 'Mensagens' },
    { to: '/stories', icon: Image, label: 'Stories' },
    { to: '/grupos', icon: UsersRound, label: 'Grupos' },
    { to: '/friends', icon: Users, label: 'Amigos' },
    { to: '/settings', icon: Settings, label: 'Definições' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50">
      <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground hover:text-foreground transition-colors"
            activeClassName="text-primary font-medium"
          >
            <Icon className="h-6 w-6" />
            <span className="text-xs mt-1">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
