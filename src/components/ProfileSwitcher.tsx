import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, Plus, Check } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface PageProfile {
  id: string;
  name: string;
  avatar_url: string | null;
  page_type: string;
}

interface Profile {
  id: string;
  first_name: string;
  avatar_url: string | null;
  verified: boolean;
  badge_type: string | null;
}

export default function ProfileSwitcher() {
  const navigate = useNavigate();
  const [mainProfile, setMainProfile] = useState<Profile | null>(null);
  const [pageProfiles, setPageProfiles] = useState<PageProfile[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");

  useEffect(() => {
    fetchProfiles();
    // Recuperar perfil selecionado do localStorage
    const saved = localStorage.getItem("selectedProfileId");
    if (saved) setSelectedProfileId(saved);
  }, []);

  const fetchProfiles = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar perfil principal
      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (profile) {
        setMainProfile(profile);
        if (!selectedProfileId) {
          setSelectedProfileId(user.id);
          localStorage.setItem("selectedProfileId", user.id);
        }
      }

      // Buscar perfis de páginas
      const { data: pages } = await supabase
        .from("page_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (pages) setPageProfiles(pages);
    } catch (error) {
      console.error("Error fetching profiles:", error);
    }
  };

  const handleSelectProfile = (profileId: string) => {
    setSelectedProfileId(profileId);
    localStorage.setItem("selectedProfileId", profileId);
    // Não recarrega a página, apenas atualiza o estado
  };

  const getCurrentProfile = () => {
    if (selectedProfileId === mainProfile?.id) {
      return {
        name: mainProfile.first_name,
        avatar: mainProfile.avatar_url,
        verified: mainProfile.verified,
        badge_type: mainProfile.badge_type
      };
    }
    const page = pageProfiles.find(p => p.id === selectedProfileId);
    return {
      name: page?.name || mainProfile?.first_name || "",
      avatar: page?.avatar_url || mainProfile?.avatar_url || null,
      verified: false,
      badge_type: null
    };
  };

  const current = getCurrentProfile();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 hover:opacity-80 transition-opacity">
        <span className="font-semibold text-foreground text-lg">
          {current.name}
        </span>
        {current.verified && (
          <Badge variant="default" className="h-5 w-5 p-0 rounded-full">
            ✓
          </Badge>
        )}
        <ChevronDown className="h-5 w-5 text-foreground" />
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="start" className="w-80">
        {/* Perfil Principal */}
        {mainProfile && (
          <DropdownMenuItem
            onClick={() => handleSelectProfile(mainProfile.id)}
            className="p-4 cursor-pointer"
          >
            <div className="flex items-center gap-3 w-full">
              <Avatar className="h-12 w-12">
                <AvatarImage src={mainProfile.avatar_url || ""} />
                <AvatarFallback>
                  {mainProfile.first_name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{mainProfile.first_name}</span>
                  {mainProfile.verified && (
                    <Badge variant="default" className="h-4 w-4 p-0 rounded-full text-xs">
                      ✓
                    </Badge>
                  )}
                  {selectedProfileId === mainProfile.id && (
                    <Check className="h-5 w-5 text-primary ml-auto" />
                  )}
                </div>
              </div>
            </div>
          </DropdownMenuItem>
        )}


        {/* Páginas Criadas */}
        {pageProfiles.map((page) => (
          <DropdownMenuItem
            key={page.id}
            onClick={() => handleSelectProfile(page.id)}
            className="p-4 cursor-pointer"
          >
            <div className="flex items-center gap-3 w-full">
              <Avatar className="h-12 w-12">
                <AvatarImage src={page.avatar_url || ""} />
                <AvatarFallback>{page.name.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="font-semibold">{page.name}</div>
                {selectedProfileId === page.id && (
                  <Check className="h-5 w-5 text-primary ml-auto" />
                )}
              </div>
            </div>
          </DropdownMenuItem>
        ))}

        {/* Criar Novo Perfil */}
        <DropdownMenuItem
          onClick={() => navigate("/create-page-profile")}
          className="p-4 cursor-pointer"
        >
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
              <Plus className="h-6 w-6" />
            </div>
            <span className="font-semibold">Criar perfil do Blynk</span>
          </div>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Centro de Contas */}
        <DropdownMenuItem
          onClick={() => navigate("/settings")}
          className="p-3 cursor-pointer text-center"
        >
          <span className="w-full font-medium">Ir para o Centro de Contas</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
