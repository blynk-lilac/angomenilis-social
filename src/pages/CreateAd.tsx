import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { TopBar } from "@/components/TopBar";
import { ArrowLeft, Upload, Link as LinkIcon } from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";

export default function CreateAd() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    company_name: "",
    content: "",
    link_url: "",
    link_title: "",
    link_description: "",
  });
  const [companyLogo, setCompanyLogo] = useState<File | null>(null);
  const [linkImage, setLinkImage] = useState<File | null>(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState<string>("");
  const [linkImagePreview, setLinkImagePreview] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'logo' | 'link') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'logo') {
      setCompanyLogo(file);
      setCompanyLogoPreview(URL.createObjectURL(file));
    } else {
      setLinkImage(file);
      setLinkImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (file: File, path: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    const { error: uploadError, data } = await supabase.storage
      .from('ads')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('ads')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!companyLogo) {
      toast.error("Adicione o logo da empresa");
      return;
    }

    setLoading(true);

    try {
      // Upload company logo
      const logoUrl = await uploadImage(companyLogo, 'company-logos');

      // Upload link image if provided
      let linkImageUrl = null;
      if (linkImage) {
        linkImageUrl = await uploadImage(linkImage, 'ad-images');
      }

      // Insert ad
      const { error } = await supabase.from("sponsored_ads").insert({
        company_name: formData.company_name,
        company_logo: logoUrl,
        content: formData.content,
        link_url: formData.link_url,
        link_title: formData.link_title || null,
        link_description: formData.link_description || null,
        link_image: linkImageUrl,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Anúncio criado com sucesso!");
      navigate("/");
    } catch (error: any) {
      console.error("Erro ao criar anúncio:", error);
      toast.error("Erro ao criar anúncio");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background pb-20">
        <TopBar />
        
        <div className="max-w-2xl mx-auto p-4">
          <div className="flex items-center gap-4 mb-6">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Criar Anúncio Patrocinado</h1>
          </div>

          <Card className="p-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Company Info */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="company_name">Nome da Empresa *</Label>
                  <Input
                    id="company_name"
                    value={formData.company_name}
                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                    placeholder="Digite o nome da empresa"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="company_logo">Logo da Empresa *</Label>
                  <div className="mt-2 flex items-center gap-4">
                    {companyLogoPreview && (
                      <img src={companyLogoPreview} alt="Logo preview" className="h-20 w-20 rounded-full object-cover border-2" />
                    )}
                    <label htmlFor="company_logo" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Carregar Logo</span>
                      </div>
                      <input
                        id="company_logo"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'logo')}
                        className="hidden"
                        required
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <Label htmlFor="content">Texto do Anúncio *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Escreva o texto do seu anúncio"
                    rows={3}
                    required
                  />
                </div>
              </div>

              {/* Link Preview Section */}
              <div className="border-t pt-6 space-y-4">
                <h3 className="font-semibold flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  Link Preview (Opcional)
                </h3>

                <div>
                  <Label htmlFor="link_url">URL do Link *</Label>
                  <Input
                    id="link_url"
                    type="url"
                    value={formData.link_url}
                    onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                    placeholder="https://exemplo.com"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="link_title">Título do Link</Label>
                  <Input
                    id="link_title"
                    value={formData.link_title}
                    onChange={(e) => setFormData({ ...formData, link_title: e.target.value })}
                    placeholder="Título que aparece no preview"
                  />
                </div>

                <div>
                  <Label htmlFor="link_description">Descrição do Link</Label>
                  <Textarea
                    id="link_description"
                    value={formData.link_description}
                    onChange={(e) => setFormData({ ...formData, link_description: e.target.value })}
                    placeholder="Descrição que aparece no preview"
                    rows={2}
                  />
                </div>

                <div>
                  <Label htmlFor="link_image">Imagem do Link Preview</Label>
                  <div className="mt-2">
                    {linkImagePreview && (
                      <img src={linkImagePreview} alt="Link preview" className="w-full h-48 object-cover rounded-lg mb-2" />
                    )}
                    <label htmlFor="link_image" className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 bg-muted rounded-lg hover:bg-muted/80 inline-flex">
                        <Upload className="h-4 w-4" />
                        <span className="text-sm">Carregar Imagem</span>
                      </div>
                      <input
                        id="link_image"
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'link')}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando..." : "Criar Anúncio"}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  );
}
