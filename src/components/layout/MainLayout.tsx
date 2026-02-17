import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import YouTubeSidebar from '@/components/layout/YouTubeSidebar';
import { useContentProtection } from '@/hooks/useContentProtection';

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
  action?: ReactNode;
}

export const MainLayout = ({ children, title, showBackButton = false, action }: MainLayoutProps) => {
  const navigate = useNavigate();
  
  // Enable content protection (no download/copy except in chat)
  useContentProtection();

  return (
    <div className="flex h-screen bg-background">
      <YouTubeSidebar />
      
      <div className="flex flex-col flex-1 md:ml-[240px] h-screen transition-all duration-300">
        {title && (
          <header className="app-header safe-area-top">
            <div className="flex items-center justify-between h-12 px-4">
              <div className="flex items-center gap-3">
                {showBackButton && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(-1)}
                    className="h-9 w-9 rounded-full press-effect"
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                )}
                <h1 className="text-lg font-semibold">
                  {title}
                </h1>
              </div>
              {action && <div className="flex items-center gap-2">{action}</div>}
            </div>
          </header>
        )}
        <main className="flex-1 overflow-hidden md:pb-0">
          {children}
        </main>
      </div>
    </div>
  );
};
