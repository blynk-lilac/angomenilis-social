import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Home, Search, PlusSquare, User, Menu } from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-0 left-0 right-0 bg-card border-b border-border z-50 safe-area-top">
      <div className="flex items-center justify-between h-14 px-4 max-w-screen-xl mx-auto">
        <h1 className="text-xl font-bold cursor-pointer" onClick={() => navigate('/feed')}>
          Blynk
        </h1>
        
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate('/feed')}>
            <Home className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/create')}>
            <PlusSquare className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => navigate('/settings')}>
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </nav>
  );
}
