import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import Stories from "./pages/Stories";
import Friends from "./pages/Friends";
import Settings from "./pages/Settings";
import ChangePassword from "./pages/settings/ChangePassword";
import EditProfile from "./pages/settings/EditProfile";
import ContactInfo from "./pages/settings/ContactInfo";
import Security from "./pages/settings/Security";
import Profile from "./pages/Profile";
import Groups from "./pages/Groups";
import GroupChat from "./pages/GroupChat";
import GroupSettings from './pages/GroupSettings';
import Report from './pages/Report';
import AddMembers from './pages/group-settings/AddMembers';
import ViewMembers from './pages/group-settings/ViewMembers';
import EditName from './pages/group-settings/EditName';
import EditPhoto from './pages/group-settings/EditPhoto';
import Nicknames from './pages/group-settings/Nicknames';
import GroupPermissions from './pages/group-settings/Permissions';
import NotFound from "./pages/NotFound";
import { requestNotificationPermission } from "./utils/pushNotifications";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }
  
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  requestNotificationPermission();
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Messages />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:friendId"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/stories"
              element={
                <ProtectedRoute>
                  <Stories />
                </ProtectedRoute>
              }
            />
            <Route
              path="/friends"
              element={
                <ProtectedRoute>
                  <Friends />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/change-password"
              element={
                <ProtectedRoute>
                  <ChangePassword />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/edit-profile"
              element={
                <ProtectedRoute>
                  <EditProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/contact-info"
              element={
                <ProtectedRoute>
                  <ContactInfo />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings/security"
              element={
                <ProtectedRoute>
                  <Security />
                </ProtectedRoute>
              }
            />
            <Route
              path="/profile/:userId"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/grupos"
              element={
                <ProtectedRoute>
                  <Groups />
                </ProtectedRoute>
              }
            />
            <Route
              path="/grupo/:groupId"
              element={
                <ProtectedRoute>
                  <GroupChat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/grupo/:groupId/configuracoes"
              element={
                <ProtectedRoute>
                  <GroupSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="/grupo/:groupId/adicionar-membros"
              element={
                <ProtectedRoute>
                  <AddMembers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/grupo/:groupId/membros"
              element={
                <ProtectedRoute>
                  <ViewMembers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/grupo/:groupId/editar-nome"
              element={
                <ProtectedRoute>
                  <EditName />
                </ProtectedRoute>
              }
            />
            <Route
              path="/grupo/:groupId/editar-foto"
              element={
                <ProtectedRoute>
                  <EditPhoto />
                </ProtectedRoute>
              }
            />
            <Route
              path="/grupo/:groupId/alcunhas"
              element={
                <ProtectedRoute>
                  <Nicknames />
                </ProtectedRoute>
              }
            />
            <Route
              path="/grupo/:groupId/permissoes"
              element={
                <ProtectedRoute>
                  <GroupPermissions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/denunciar/:type/:id"
              element={
                <ProtectedRoute>
                  <Report />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
