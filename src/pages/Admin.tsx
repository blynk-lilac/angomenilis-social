import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  Users, 
  FileWarning, 
  Shield, 
  Ban, 
  CheckCircle2, 
  Search,
  Trash2,
  Eye,
  AlertTriangle
} from "lucide-react";
import ProtectedRoute from "@/components/ProtectedRoute";
import VerificationBadge from "@/components/VerificationBadge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface User {
  id: string;
  username: string;
  full_name: string;
  first_name: string;
  avatar_url: string;
  verified: boolean;
  badge_type: string | null;
  created_at: string;
}

interface Report {
  id: string;
  reporter_id: string;
  reported_content_id: string;
  content_type: string;
  reason: string;
  status: string;
  created_at: string;
  reporter?: {
    username: string;
    avatar_url: string;
  };
}

export default function Admin() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; userId: string; username: string }>({ 
    open: false, 
    userId: "", 
    username: "" 
  });
  const [stats, setStats] = useState({
    totalUsers: 0,
    verifiedUsers: 0,
    pendingReports: 0,
    blockedAccounts: 0
  });

  useEffect(() => {
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      toast.error("Acesso negado");
      navigate("/feed");
      return;
    }

    setIsAdmin(true);
    await loadData();
    setLoading(false);
  };

  const loadData = async () => {
    await Promise.all([loadUsers(), loadReports(), loadStats()]);
  };

  const loadUsers = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    
    setUsers(data || []);
  };

  const loadReports = async () => {
    const { data } = await supabase
      .from("reports")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });
    
    setReports(data || []);
  };

  const loadStats = async () => {
    const [usersCount, verifiedCount, reportsCount, blockedCount] = await Promise.all([
      supabase.from("profiles").select("*", { count: "exact", head: true }),
      supabase.from("profiles").select("*", { count: "exact", head: true }).eq("verified", true),
      supabase.from("reports").select("*", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("blocked_accounts").select("*", { count: "exact", head: true })
    ]);

    setStats({
      totalUsers: usersCount.count || 0,
      verifiedUsers: verifiedCount.count || 0,
      pendingReports: reportsCount.count || 0,
      blockedAccounts: blockedCount.count || 0
    });
  };

  const handleVerifyUser = async (userId: string, verify: boolean) => {
    const { error } = await supabase
      .from("profiles")
      .update({ verified: verify, badge_type: verify ? "blue" : null })
      .eq("id", userId);

    if (error) {
      toast.error("Erro ao atualizar verificação");
      return;
    }

    toast.success(verify ? "Usuário verificado!" : "Verificação removida");
    loadUsers();
    loadStats();
  };

  const handleBlockUser = async (userId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Check if this is the protected account
    const { data: profileData } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (profileData?.email === "isaacmuaco582@gmail.com") {
      toast.error("Esta conta não pode ser bloqueada");
      return;
    }

    const { error } = await supabase
      .from("blocked_accounts")
      .insert({ user_id: userId, blocked_by: user.id, reason: "Bloqueado pelo admin" });

    if (error) {
      toast.error("Erro ao bloquear usuário");
      return;
    }

    toast.success("Usuário bloqueado");
    loadStats();
  };

  const handleDeleteUser = async (userId: string) => {
    // Check if this is the protected account
    const { data: profileData } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    if (profileData?.email === "isaacmuaco582@gmail.com") {
      toast.error("Esta conta não pode ser excluída");
      setDeleteDialog({ open: false, userId: "", username: "" });
      return;
    }

    // Delete user's posts first
    await supabase.from("posts").delete().eq("user_id", userId);
    await supabase.from("stories").delete().eq("user_id", userId);
    await supabase.from("verification_videos").delete().eq("user_id", userId);
    
    // Delete profile
    const { error } = await supabase.from("profiles").delete().eq("id", userId);

    if (error) {
      toast.error("Erro ao excluir usuário");
      return;
    }

    toast.success("Usuário excluído");
    setDeleteDialog({ open: false, userId: "", username: "" });
    loadUsers();
    loadStats();
  };

  const handleResolveReport = async (reportId: string, action: "resolved" | "dismissed") => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("reports")
      .update({ 
        status: action, 
        resolved_by: user.id, 
        resolved_at: new Date().toISOString() 
      })
      .eq("id", reportId);

    if (error) {
      toast.error("Erro ao resolver denúncia");
      return;
    }

    toast.success(action === "resolved" ? "Denúncia resolvida" : "Denúncia ignorada");
    loadReports();
    loadStats();
  };

  const filteredUsers = users.filter(user => 
    user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      </ProtectedRoute>
    );
  }

  if (!isAdmin) return null;

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-b">
          <div className="flex items-center justify-between px-4 h-14">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="font-semibold text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Painel Admin
            </h1>
            <div className="w-10" />
          </div>
        </div>

        <div className="pt-16 pb-8 px-4 max-w-4xl mx-auto">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card className="p-4 bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Usuários</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.verifiedUsers}</p>
                  <p className="text-xs text-muted-foreground">Verificados</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <FileWarning className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pendingReports}</p>
                  <p className="text-xs text-muted-foreground">Denúncias</p>
                </div>
              </div>
            </Card>
            
            <Card className="p-4 bg-card">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center">
                  <Ban className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.blockedAccounts}</p>
                  <p className="text-xs text-muted-foreground">Bloqueados</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="users" className="w-full">
            <TabsList className="w-full grid grid-cols-2 mb-4">
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                Usuários
              </TabsTrigger>
              <TabsTrigger value="reports" className="gap-2">
                <FileWarning className="h-4 w-4" />
                Denúncias
                {stats.pendingReports > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 px-1.5">
                    {stats.pendingReports}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="users" className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Pesquisar usuários..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Users List */}
              <div className="space-y-2">
                {filteredUsers.map((user, index) => (
                  <motion.div
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                  >
                    <Card className="p-4">
                      <div className="flex items-center gap-3">
                        <Avatar 
                          className="h-12 w-12 cursor-pointer"
                          onClick={() => navigate(`/profile/${user.id}`)}
                        >
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                            {user.first_name?.[0] || user.username?.[0]}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold truncate">
                              {user.full_name || user.first_name || user.username}
                            </span>
                            {user.verified && (
                              <VerificationBadge 
                                verified={user.verified} 
                                badgeType={user.badge_type} 
                                className="h-4 w-4" 
                              />
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">@{user.username}</p>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => navigate(`/profile/${user.id}`)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant={user.verified ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleVerifyUser(user.id, !user.verified)}
                          >
                            {user.verified ? "Remover" : "Verificar"}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-orange-500"
                            onClick={() => handleBlockUser(user.id)}
                          >
                            <Ban className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => setDeleteDialog({ open: true, userId: user.id, username: user.username })}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="reports" className="space-y-4">
              {reports.length === 0 ? (
                <Card className="p-8 text-center">
                  <CheckCircle2 className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-medium">Nenhuma denúncia pendente</p>
                  <p className="text-sm text-muted-foreground">Todas as denúncias foram resolvidas</p>
                </Card>
              ) : (
                reports.map((report, index) => (
                  <motion.div
                    key={report.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                  >
                    <Card className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-4 w-4 text-orange-500" />
                            <Badge variant="outline">{report.content_type}</Badge>
                          </div>
                          <p className="text-sm mb-2">{report.reason}</p>
                          <p className="text-xs text-muted-foreground">
                            ID: {report.reported_content_id}
                          </p>
                        </div>
                        
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolveReport(report.id, "dismissed")}
                          >
                            Ignorar
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => handleResolveReport(report.id, "resolved")}
                          >
                            Resolver
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Delete Dialog */}
        <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog(prev => ({ ...prev, open }))}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir usuário?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir @{deleteDialog.username}? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => handleDeleteUser(deleteDialog.userId)}
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </ProtectedRoute>
  );
}
