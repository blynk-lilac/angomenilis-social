import { NavLink } from '@/components/NavLink';
import { MessageCircle, Phone, Users, Settings } from 'lucide-react';

export const BottomNav = () => {
  const navItems = [
    { to: '/', icon: MessageCircle, label: 'Conversas' },
    { to: '/stories', icon: Users, label: 'Atualizações' },
    { to: '/grupos', icon: Users, label: 'Comunidades' },
    { to: '/chamadas', icon: Phone, label: 'Chamadas' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-screen-xl mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground hover:text-foreground transition-colors"
            activeClassName="text-primary font-medium"
          >
            <Icon className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
