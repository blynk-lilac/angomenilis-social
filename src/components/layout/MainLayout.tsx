import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { BottomNav } from './BottomNav';
import { Button } from '@/components/ui/button';
import InstagramSidebar from '@/components/InstagramSidebar';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
  action?: ReactNode;
}

export const MainLayout = ({ children, title, showBackButton = false, action }: MainLayoutProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex h-screen bg-background">
      <InstagramSidebar />
      
      <div className="flex flex-col flex-1 md:ml-64 h-screen">
        {title && (
          <header className="sticky top-0 z-10 glass-effect border-b border-border/50 safe-area-top shadow-sm backdrop-blur-xl">
            <div className="flex items-center justify-between h-16 px-4">
              <div className="flex items-center gap-3">
                {showBackButton && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(-1)}
                    className="h-10 w-10 rounded-full hover:bg-primary/10 hover:text-primary transition-all hover-lift"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                <h1 className="text-xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-fade-in font-display">
                  {title}
                </h1>
              </div>
              {action && <div className="flex items-center gap-2 animate-fade-in">{action}</div>}
            </div>
          </header>
        )}
        <main className="flex-1 overflow-hidden pb-16 md:pb-0 animate-fade-in">
          {children}
        </main>
        <BottomNav />
      </div>
    </div>
  );
};
