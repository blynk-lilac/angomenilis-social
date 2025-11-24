import { NavLink } from '@/components/NavLink';
import { Home, Users, MessageSquare, Video, User, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

export const BottomNav = () => {
  const navItems = [
    { to: '/feed', icon: Home, label: 'Início' },
    { to: '/friends', icon: Users, label: 'Amigos' },
    { to: '/messages', icon: MessageSquare, label: 'Mensagens' },
    { to: '/videos', icon: Video, label: 'Vídeos' },
    { to: '/profile', icon: User, label: 'Perfil' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-2xl border-t border-border/50 z-50 safe-area-bottom">
      <div className="flex items-center justify-around h-[72px] max-w-screen-xl mx-auto px-4 relative">
        {navItems.slice(0, 2).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/feed'}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground transition-all group relative"
            activeClassName="text-primary"
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "relative p-2.5 rounded-2xl transition-all duration-300",
                  isActive && "bg-primary/10"
                )}>
                  <Icon className={cn(
                    "h-6 w-6 transition-all duration-300",
                    isActive ? "scale-110" : "group-hover:scale-110"
                  )} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <div className="absolute inset-0 bg-primary/20 rounded-2xl animate-ping" />
                  )}
                </div>
                <span className={cn(
                  "text-[11px] font-medium transition-all duration-300",
                  isActive && "font-bold"
                )}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
        
        {/* Botão FAB - Estilo Material Design */}
        <Link
          to="/create"
          className="flex flex-col items-center justify-center flex-1 h-full -mt-10"
        >
          <div className="relative group">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary via-primary/90 to-primary/80 flex items-center justify-center shadow-2xl hover:shadow-primary/50 hover:scale-110 transition-all duration-300 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent" />
              <Plus className="h-8 w-8 text-white relative z-10" strokeWidth={2.5} />
            </div>
            <div className="absolute inset-0 rounded-full bg-primary/30 blur-xl group-hover:blur-2xl transition-all" />
          </div>
        </Link>

        {navItems.slice(2).map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/feed'}
            className="flex flex-col items-center justify-center gap-1 flex-1 h-full text-muted-foreground transition-all group relative"
            activeClassName="text-primary"
          >
            {({ isActive }) => (
              <>
                <div className={cn(
                  "relative p-2.5 rounded-2xl transition-all duration-300",
                  isActive && "bg-primary/10"
                )}>
                  <Icon className={cn(
                    "h-6 w-6 transition-all duration-300",
                    isActive ? "scale-110" : "group-hover:scale-110"
                  )} strokeWidth={isActive ? 2.5 : 2} />
                  {isActive && (
                    <div className="absolute inset-0 bg-primary/20 rounded-2xl animate-ping" />
                  )}
                </div>
                <span className={cn(
                  "text-[11px] font-medium transition-all duration-300",
                  isActive && "font-bold"
                )}>{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
};
