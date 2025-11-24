import { NavLink } from '@/components/NavLink';
import { Home, UserPlus, PlusSquare, Video, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

export const BottomNav = () => {
  const navItems = [
    { to: '/feed', icon: Home, label: 'Início' },
    { to: '/friends', icon: UserPlus, label: 'Amigos' },
    { to: '/create', icon: PlusSquare, label: 'Criar' },
    { to: '/videos', icon: Video, label: 'Vídeos' },
    { to: '/app-settings', icon: Menu, label: 'Menu' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-14 max-w-screen-xl mx-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/feed'}
            className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground transition-colors py-2"
            activeClassName="text-primary"
          >
            {({ isActive }) => (
              <>
                <Icon 
                  className="h-6 w-6" 
                  strokeWidth={isActive ? 2.5 : 2}
                  fill={isActive ? "currentColor" : "none"}
                />
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
