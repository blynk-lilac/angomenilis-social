import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { useStoryReactions } from "@/hooks/useStoryReactions";
import { MessageNotification } from "@/components/MessageNotification";
import Auth from "./pages/Auth";
import SavedAccounts from "./pages/SavedAccounts";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import TwoFactorVerification from "./pages/TwoFactorVerification";
import Messages from "./pages/Messages";
import Chat from "./pages/Chat";
import ChatSettings from "./pages/ChatSettings";
import Stories from "./pages/Stories";
import Friends from "./pages/Friends";
import Settings from "./pages/Settings";
import ChangePassword from "./pages/settings/ChangePassword";
import ContactInfo from "./pages/settings/ContactInfo";
import Security from "./pages/settings/Security";
import Profile from "./pages/Profile";
import Feed from "./pages/Feed";
import Create from "./pages/Create";
import Comments from "./pages/Comments";
import CommentsVideo from "./pages/CommentsVideo";
import Videos from "./pages/Videos";
import RequestVerification from "./pages/RequestVerification";
import Report from './pages/Report';
import SavedPosts from './pages/SavedPosts';
import PostDetail from './pages/PostDetail';
import Notifications from './pages/Notifications';
import InstallPWA from './pages/InstallPWA';
import Hashtag from './pages/Hashtag';
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

const AppContent = () => {
  useStoryReactions();
  return (
    <>
      <MessageNotification />
      <Routes>
        <Route path="/" element={<SavedAccounts />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/two-factor-verification" element={<TwoFactorVerification />} />
        
        <Route
          path="/feed"
          element={
            <ProtectedRoute>
              <Feed />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create"
          element={
            <ProtectedRoute>
              <Create />
            </ProtectedRoute>
          }
        />
        <Route
          path="/videos"
          element={
            <ProtectedRoute>
              <Videos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/videos/:shareCode"
          element={
            <ProtectedRoute>
              <Videos />
            </ProtectedRoute>
          }
        />
        <Route
          path="/comments/:postId"
          element={
            <ProtectedRoute>
              <Comments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/comments-video/:videoId"
          element={
            <ProtectedRoute>
              <CommentsVideo />
            </ProtectedRoute>
          }
        />
        <Route
          path="/verification"
          element={
            <ProtectedRoute>
              <RequestVerification />
            </ProtectedRoute>
          }
        />
        
        {/* Messages Routes */}
        <Route
          path="/messages"
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
          path="/chat/:friendId/settings"
          element={
            <ProtectedRoute>
              <ChatSettings />
            </ProtectedRoute>
          }
        />
        
        {/* Stories Routes */}
        <Route
          path="/stories"
          element={
            <ProtectedRoute>
              <Stories />
            </ProtectedRoute>
          }
        />
        
        {/* Friends Routes */}
        <Route
          path="/friends"
          element={
            <ProtectedRoute>
              <Friends />
            </ProtectedRoute>
          }
        />
        
        {/* Profile Routes */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <Profile />
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
          path="/perfil/:username"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        
        {/* Settings Routes */}
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
        
        {/* Report Route */}
        <Route
          path="/report"
          element={
            <ProtectedRoute>
              <Report />
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
        
        {/* Saved Posts Route */}
        <Route
          path="/saved"
          element={
            <ProtectedRoute>
              <SavedPosts />
            </ProtectedRoute>
          }
        />
        
        {/* Post Detail Route */}
        <Route
          path="/post/:postId"
          element={
            <ProtectedRoute>
              <PostDetail />
            </ProtectedRoute>
          }
        />
        
        {/* Notifications Route */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <Notifications />
            </ProtectedRoute>
          }
        />
        
        {/* Install PWA Route */}
        <Route path="/install" element={<InstallPWA />} />
        
        {/* Hashtag Route */}
        <Route
          path="/hashtag/:name"
          element={
            <ProtectedRoute>
              <Hashtag />
            </ProtectedRoute>
          }
        />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
