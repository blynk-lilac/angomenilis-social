import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Image as ImageIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function Create() {
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleCreatePost = async () => {
    if (!content.trim()) {
      toast.error("Digite algo para publicar");
      return;
    }

    if (!user) {
      toast.error("Você precisa estar logado");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from("posts").insert({
        user_id: user.id,
        content: content.trim(),
      });

      if (error) throw error;

      toast.success("Post criado com sucesso!");
      navigate("/feed");
    } catch (error) {
      console.error("Erro ao criar post:", error);
      toast.error("Erro ao criar post");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <header className="sticky top-0 z-40 bg-card border-b border-border">
        <div className="flex items-center justify-between h-14 px-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-bold">Criar Post</h1>
          <Button
            onClick={handleCreatePost}
            disabled={!content.trim() || loading}
            size="sm"
          >
            {loading ? "Publicando..." : "Publicar"}
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        <Textarea
          placeholder="No que estás a pensar?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="min-h-[200px] resize-none border-0 text-lg focus-visible:ring-0"
          autoFocus
        />
        
        <div className="mt-4">
          <Button variant="outline" size="sm" disabled>
            <ImageIcon className="h-4 w-4 mr-2" />
            Adicionar Foto (em breve)
          </Button>
        </div>
      </div>
    </div>
  );
}
