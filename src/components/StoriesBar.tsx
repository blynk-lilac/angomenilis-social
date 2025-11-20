import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus } from 'lucide-react';

interface StoriesBarProps {
  onCreateClick?: () => void;
}

export default function StoriesBar({ onCreateClick }: StoriesBarProps) {
  return (
    <div className="flex gap-3 overflow-x-auto p-4 bg-card border-b border-border scrollbar-hide">
      <button 
        onClick={onCreateClick}
        className="flex flex-col items-center gap-2 flex-shrink-0"
      >
        <div className="relative">
          <Avatar className="h-16 w-16 border-2 border-primary">
            <AvatarFallback className="bg-muted">
              <Plus className="h-6 w-6" />
            </AvatarFallback>
          </Avatar>
        </div>
        <span className="text-xs">Criar</span>
      </button>
    </div>
  );
}
