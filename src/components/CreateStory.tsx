import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface CreateStoryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateStory({ open, onOpenChange }: CreateStoryProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Criar Story</DialogTitle>
        </DialogHeader>
        <div className="p-4 text-center text-muted-foreground">
          Funcionalidade em desenvolvimento
        </div>
        <Button onClick={() => onOpenChange(false)}>Fechar</Button>
      </DialogContent>
    </Dialog>
  );
}
