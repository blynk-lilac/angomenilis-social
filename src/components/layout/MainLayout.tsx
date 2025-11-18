import { ReactNode } from 'react';
import { BottomNav } from './BottomNav';

interface MainLayoutProps {
  children: ReactNode;
  title: string;
}

export const MainLayout = ({ children, title }: MainLayoutProps) => {
  return (
    <div className="min-h-screen bg-background pb-16">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-center h-14 px-4 max-w-screen-xl mx-auto">
          <h1 className="text-xl font-bold text-primary">
            {title}
          </h1>
        </div>
      </header>
      
      <main className="max-w-screen-xl mx-auto">
        {children}
      </main>
      
      <BottomNav />
    </div>
  );
};
