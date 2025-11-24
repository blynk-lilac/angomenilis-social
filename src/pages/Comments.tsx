import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { TopBar } from "@/components/TopBar";
import { MainNav } from "@/components/MainNav";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MentionTextarea from "@/components/MentionTextarea";
import { useHashtagsAndMentions } from "@/hooks/useHashtagsAndMentions";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Heart, MessageCircle, Share2, Send, ArrowLeft, MoreHorizontal, Smile, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import VerificationBadge from "@/components/VerificationBadge";
import VoiceRecorder from "@/components/VoiceRecorder";
import { CommentCard } from "@/components/CommentCard";
import { ImageGalleryViewer } from "@/components/ImageGalleryViewer";
import { TranslateButton } from "@/components/TranslateButton";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  post_id: string;
  parent_comment_id?: string;
  audio_url?: string;
  profiles: {
    username: string;
    avatar_url: string;
    verified?: boolean;
    badge_type?: string | null;
  };
  likes: { count: number }[];
  replies?: Comment[];
  user_liked?: boolean;
}

interface Post {
  id: string;
  content: string;
  created_at: string;
  image_url?: string;
  video_url?: string;
  audio_url?: string;
  media_urls?: string[];
  user_id: string;
  profiles: {
    username: string;
    avatar_url: string;
    verified?: boolean;
    badge_type?: string | null;
  };
  likes: { count: number }[];
  comments: { count: number }[];
}

export default function Comments() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState("");
  const [galleryImages, setGalleryImages] = useState<string[] | null>(null);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [translatedContent, setTranslatedContent] = useState("");
  const { processCommentHashtagsAndMentions } = useHashtagsAndMentions();

  useEffect(() => {
    loadPost();
    loadComments();
    loadCurrentUser();

    const channel = supabase
      .channel(`comments-${postId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comments", filter: `post_id=eq.${postId}` },
        () => {
          loadComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [postId]);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);
  };

  const loadPost = async () => {
    const { data } = await supabase
      .from("posts")
      .select(`
        *,
        profiles (username, avatar_url, verified, badge_type),
        likes:post_likes(count),
        comments:comments(count)
      `)
      .eq("id", postId)
      .single();

    if (data) setPost(data);
  };

  const loadComments = async () => {
    const { data } = await supabase
      .from("comments")
      .select(`
        *,
        profiles (username, avatar_url, verified, badge_type),
        likes:comment_likes(count)
      `)
      .eq("post_id", postId)
      .is("parent_comment_id", null)
      .order("created_at", { ascending: true });

    if (data) {
      const { data: { user } } = await supabase.auth.getUser();
      
      const commentsWithLikesAndReplies = await Promise.all(
        data.map(async (comment) => {
          const { data: replies } = await supabase
            .from("comments")
            .select(`
              *,
              profiles (username, avatar_url, verified, badge_type),
              likes:comment_likes(count)
            `)
            .eq("parent_comment_id", comment.id)
            .order("created_at", { ascending: true });

          const { data: userLike } = await supabase
            .from("comment_likes")
            .select("*")
            .eq("comment_id", comment.id)
            .eq("user_id", user?.id)
            .maybeSingle();

          return {
            ...comment,
            replies: replies || [],
            user_liked: !!userLike,
          };
        })
      );

      setComments(commentsWithLikesAndReplies);
    }
  };

  const handleComment = async (audioUrl?: string) => {
    if (!newComment.trim() && !audioUrl) return;

    const { data: newCommentData, error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: currentUserId,
      content: audioUrl ? "🎤 Comentário de voz" : newComment,
      audio_url: audioUrl,
      parent_comment_id: replyingTo,
    }).select().single();

    if (error) {
      toast.error("Erro ao comentar");
      return;
    }

    // Processar menções no comentário
    if (newCommentData && !audioUrl) {
      await processCommentHashtagsAndMentions(
        newCommentData.id,
        newComment,
        currentUserId,
        postId!
      );
    }

    setNewComment("");
    setReplyingTo(null);
    loadComments();
  };

  const handleLikeComment = async (commentId: string) => {
    const comment = comments.find(c => c.id === commentId);
    if (!comment) return;

    if (comment.user_liked) {
      await supabase
        .from("comment_likes")
        .delete()
        .eq("comment_id", commentId)
        .eq("user_id", currentUserId);
    } else {
      await supabase.from("comment_likes").insert({
        comment_id: commentId,
        user_id: currentUserId,
      });
    }

    loadComments();
  };

  const handleImageClick = (images: string[], index: number) => {
    setGalleryImages(images);
    setGalleryIndex(index);
  };

  if (!post) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background pb-20">
          <TopBar />
          <MainNav />
          <div className="flex items-center justify-center h-screen">
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="fixed inset-0 bg-background z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">
              Publicação de {post.profiles.username}
            </h1>
          </div>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Search className="h-5 w-5" />
          </Button>
        </div>

        {/* Post e Comments */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto">
            {/* Post Card */}
            <Card className="m-4 border">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={post.profiles.avatar_url} />
                      <AvatarFallback>
                        {post.profiles.username?.[0]?.toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-sm">
                          {post.profiles.username}
                        </span>
                        {post.profiles.verified && (
                          <VerificationBadge
                            verified={post.profiles.verified}
                            badgeType={post.profiles.badge_type}
                            className="w-4 h-4"
                          />
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>
                          {formatDistanceToNow(new Date(post.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </span>
                        <span>•</span>
                        <span>🌍</span>
                      </div>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <MoreHorizontal className="h-5 w-5" />
                  </Button>
                </div>

                <p className="text-[15px] mb-3 whitespace-pre-wrap break-words leading-relaxed">{translatedContent || post.content}</p>
                
                <TranslateButton
                  text={post.content}
                  onTranslated={setTranslatedContent}
                />

                {/* Media Grid */}
                {post.media_urls && post.media_urls.length > 0 && (
                  <div className="mb-3">
                    {post.media_urls.length === 1 ? (
                      <img
                        src={post.media_urls[0]}
                        alt="Post"
                        onClick={() => handleImageClick(post.media_urls!, 0)}
                        className="w-full max-h-[500px] object-contain bg-muted cursor-pointer"
                      />
                    ) : post.media_urls.length === 2 ? (
                      <div className="grid grid-cols-2 gap-0.5">
                        {post.media_urls.map((url: string, idx: number) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Media ${idx + 1}`}
                            onClick={() => handleImageClick(post.media_urls!, idx)}
                            className="w-full aspect-square object-cover cursor-pointer"
                          />
                        ))}
                      </div>
                    ) : post.media_urls.length === 3 ? (
                      <div className="grid grid-cols-2 gap-0.5">
                        <img
                          src={post.media_urls[0]}
                          alt="Media 1"
                          onClick={() => handleImageClick(post.media_urls!, 0)}
                          className="row-span-2 w-full h-full object-cover cursor-pointer"
                        />
                        {post.media_urls.slice(1).map((url: string, idx: number) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Media ${idx + 2}`}
                            onClick={() => handleImageClick(post.media_urls!, idx + 1)}
                            className="w-full aspect-square object-cover cursor-pointer"
                          />
                        ))}
                      </div>
                    ) : post.media_urls.length === 4 ? (
                      <div className="grid grid-cols-2 gap-0.5">
                        {post.media_urls.map((url: string, idx: number) => (
                          <img
                            key={idx}
                            src={url}
                            alt={`Media ${idx + 1}`}
                            onClick={() => handleImageClick(post.media_urls!, idx)}
                            className="w-full aspect-square object-cover cursor-pointer"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-0.5">
                        <img
                          src={post.media_urls[0]}
                          alt="Media 1"
                          onClick={() => handleImageClick(post.media_urls!, 0)}
                          className="col-span-2 w-full aspect-video object-cover cursor-pointer"
                        />
                        {post.media_urls.slice(1, 5).map((url: string, idx: number) => {
                          const actualIdx = idx + 1;
                          const isLast = actualIdx === 4 && post.media_urls!.length > 5;
                          return (
                            <div key={idx} className="relative">
                              <img
                                src={url}
                                alt={`Media ${actualIdx + 1}`}
                                onClick={() => handleImageClick(post.media_urls!, actualIdx)}
                                className="w-full aspect-square object-cover cursor-pointer"
                              />
                              {isLast && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                                  <span className="text-white text-3xl font-bold">+{post.media_urls!.length - 5}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {post.image_url && !post.media_urls && (
                  <img
                    src={post.image_url}
                    alt="Post"
                    className="w-full rounded-lg mb-3"
                  />
                )}
                {post.video_url && (
                  <video
                    src={post.video_url}
                    controls
                    className="w-full rounded-lg mb-3"
                  />
                )}
                {post.audio_url && (
                  <audio src={post.audio_url} controls className="w-full mb-3" />
                )}

                <div className="flex items-center justify-between text-sm text-muted-foreground py-2">
                  <span>{post.likes[0]?.count || 0} gostos</span>
                  <span>{post.comments[0]?.count || 0} comentários</span>
                </div>

                <div className="border-t pt-2 flex items-center justify-around">
                  <Button variant="ghost" size="sm" className="flex-1 gap-2">
                    <Heart className="h-5 w-5" />
                    <span className="font-semibold text-sm">Gosto</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 gap-2">
                    <MessageCircle className="h-5 w-5" />
                    <span className="font-semibold text-sm">Comentar</span>
                  </Button>
                  <Button variant="ghost" size="sm" className="flex-1 gap-2">
                    <Share2 className="h-5 w-5" />
                    <span className="font-semibold text-sm">Partilhar</span>
                  </Button>
                </div>
              </div>
            </Card>

            {/* Seção de Comentários */}
            <div className="bg-card border-t border-border mt-4">
              <div className="p-4">
                <h3 className="font-bold text-lg mb-1">Mais relevantes</h3>
                <button className="text-sm text-muted-foreground hover:underline mb-4">
                  ▼
                </button>
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <CommentCard
                      key={comment.id}
                      comment={comment}
                      onLike={handleLikeComment}
                      onReply={setReplyingTo}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Image Gallery */}
        {galleryImages && (
          <ImageGalleryViewer
            images={galleryImages}
            initialIndex={galleryIndex}
            onClose={() => setGalleryImages(null)}
          />
        )}

        {/* Input de comentário */}
        <div className="border-t p-3 bg-background">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleComment();
            }}
            className="flex items-center gap-2 max-w-3xl mx-auto"
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={post.profiles.avatar_url} />
              <AvatarFallback>U</AvatarFallback>
            </Avatar>
            <div className="flex-1 flex items-center gap-2 bg-muted rounded-full px-4 py-2">
              <MentionTextarea
                value={newComment}
                onChange={setNewComment}
                placeholder={
                  replyingTo
                    ? "Escrever uma resposta... Use @ para mencionar"
                    : `Comentar como ${post.profiles.username}. Use @ para mencionar`
                }
                className="border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-auto min-h-0"
                rows={1}
              />
              <VoiceRecorder onAudioRecorded={(audioUrl) => handleComment(audioUrl)} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8"
              >
                <Smile className="h-5 w-5 text-muted-foreground" />
              </Button>
            </div>
          </form>
        </div>
      </div>
    </ProtectedRoute>
  );
}
