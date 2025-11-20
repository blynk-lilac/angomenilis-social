import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Trash, Flag } from 'lucide-react';

interface PostMenuProps {
  postId: string;
  isOwner: boolean;
  onDelete?: () => void;
  onReport?: () => void;
}

export default function PostMenu({ postId, isOwner, onDelete, onReport }: PostMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {isOwner && onDelete && (
          <DropdownMenuItem onClick={onDelete} className="text-destructive">
            <Trash className="h-4 w-4 mr-2" />
            Eliminar
          </DropdownMenuItem>
        )}
        {!isOwner && onReport && (
          <DropdownMenuItem onClick={onReport}>
            <Flag className="h-4 w-4 mr-2" />
            Denunciar
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
