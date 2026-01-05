import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Send, Phone, Video, MoreVertical, Mic, Smile, Paperclip, Check, CheckCheck, Palette, Copy, Trash2, Heart, Clock, Edit3, X } from 'lucide-react';
import { format } from 'date-fns';
import CallInterface from '@/components/call/CallInterface';
import ChatPinProtection from '@/components/chat/ChatPinProtection';
import WallpaperPicker from '@/components/chat/WallpaperPicker';
import AudioWaveform from '@/components/chat/AudioWaveform';
import EmojiPicker from '@/components/chat/EmojiPicker';
import { ImageViewer } from '@/components/chat/ImageViewer';
import ChatPhotoEditor from '@/components/chat/ChatPhotoEditor';
import { showNotification } from '@/utils/pushNotifications';
import { useUserPresence } from '@/hooks/useUserPresence';
import { useTypingIndicator } from '@/hooks/useTypingIndicator';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { useTemporaryMessages } from '@/hooks/useTemporaryMessages';
import { ChatSkeleton } from '@/components/loading/ChatSkeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

interface Message {
  id: string;
  content: string;
  sender_id: string;
  receiver_id: string;
  created_at: string;
  message_type?: string;
  media_url?: string;
  duration?: number;
  read?: boolean;
  edited?: boolean;
}

interface Profile {
  id: string;
  username: string;
  first_name: string;
  avatar_url: string | null;
  verified?: boolean;
  badge_type?: string | null;
}

export default function Chat() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [friend, setFriend] = useState<Profile | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [activeCall, setActiveCall] = useState<{ id: string; type: 'voice' | 'video' } | null>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [chatSettings, setChatSettings] = useState<any>(null);
  const [sendingMessages, setSendingMessages] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [showWallpaperPicker, setShowWallpaperPicker] = useState(false);
  const [wallpaper, setWallpaper] = useState<string>('');
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMessageActions, setShowMessageActions] = useState(false);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [editText, setEditText] = useState('');
  const [imageViewerOpen, setImageViewerOpen] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState('');

  // Photo editor state
  const [showPhotoEditor, setShowPhotoEditor] = useState(false);
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const recordingTimeRef = useRef(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordStreamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  const { isOnline } = useUserPresence(friendId);
  const { typingUsers, setTyping } = useTypingIndicator(friendId || '');
  
  useScreenshotProtection(true);
  
  useTemporaryMessages({
    chatPartnerId: friendId || '',
    userId: user?.id || '',
    duration: chatSettings?.temporary_messages_duration || 'disabled',
  });

  useEffect(() => {
    if (!friendId) return;

    const loadData = async () => {
      const startTime = Date.now();
      await Promise.all([loadFriend(), loadChatSettings(), loadMessages(), loadWallpaper()]);
      
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 1500 - elapsed);
      setTimeout(() => {
        setLoading(false);
      }, remaining);
    };
    
    loadData();
    const messagesCleanup = subscribeToMessages();
    const settingsCleanup = subscribeToChatSettings();

    return () => {
      messagesCleanup && messagesCleanup();
      settingsCleanup && settingsCleanup();
    };
  }, [friendId]);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      loadChatSettings();
    };

    window.addEventListener('chatSettingsUpdated', handleSettingsUpdate);
    
    return () => {
      window.removeEventListener('chatSettingsUpdated', handleSettingsUpdate);
    };
  }, [friendId]);

  const subscribeToChatSettings = () => {
    if (!user || !friendId) return;

    const channel = supabase
      .channel('chat-settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_settings',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newData = payload.new as any;
          if (newData && newData.chat_partner_id === friendId) {
            loadChatSettings();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadChatSettings = async () => {
    if (!user || !friendId) return;

    const { data } = await supabase
      .from('chat_settings')
      .select('*')
      .eq('user_id', user.id)
      .eq('chat_partner_id', friendId)
      .single();

    if (data) {
      setChatSettings(data);
      if (data.is_locked && !isUnlocked) {
        setIsUnlocked(false);
      } else {
        setIsUnlocked(true);
      }
    } else {
      setIsUnlocked(true);
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadFriend = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', friendId)
      .single();
    
    if (data) setFriend(data);
  };

  const loadWallpaper = async () => {
    if (!user || !friendId) return;

    const { data } = await supabase
      .from('chat_wallpapers')
      .select('wallpaper_url')
      .eq('user_id', user.id)
      .eq('chat_partner_id', friendId)
      .single();

    if (data) {
      setWallpaper(data.wallpaper_url);
    }
  };

  const loadMessages = async () => {
    if (!user || !friendId) return;

    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${friendId}),and(sender_id.eq.${friendId},receiver_id.eq.${user.id})`)
      .order('created_at', { ascending: true });

    if (data) setMessages(data);

    await supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', user.id)
      .eq('sender_id', friendId);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        async (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === user?.id && newMsg.receiver_id === friendId) ||
            (newMsg.sender_id === friendId && newMsg.receiver_id === user?.id)
          ) {
            setMessages(prev => [...prev, newMsg]);
            
            if (newMsg.sender_id === friendId && document.hidden) {
              const { data: senderProfile } = await supabase
                .from('profiles')
                .select('avatar_url, first_name')
                .eq('id', friendId)
                .single();

              showNotification(senderProfile?.first_name || 'Nova mensagem', {
                body: newMsg.content || 'Mídia recebida',
                icon: senderProfile?.avatar_url || '/logo-192.png',
                data: {
                  avatar: senderProfile?.avatar_url,
                },
              });
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    if (value.trim()) {
      setTyping(true);
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(false);
      }, 2000);
    } else {
      setTyping(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user || !friendId) return;

    const messageText = newMessage.trim();
    
    if (sendingMessages.has(messageText)) {
      return;
    }

    setTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    setSendingMessages(prev => new Set(prev).add(messageText));
    setNewMessage('');

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: friendId,
      content: messageText,
      message_type: 'text',
    });

    setSendingMessages(prev => {
      const newSet = new Set(prev);
      newSet.delete(messageText);
      return newSet;
    });

    if (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleMediaSelect = async (url: string, type: 'image' | 'video' | 'audio', duration?: number) => {
    if (!user || !friendId) return;

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: friendId,
      content: '',
      message_type: type,
      media_url: url,
      duration,
    });

    if (error) {
      console.error('Error sending media:', error);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    if (isImage) {
      setSelectedPhotoFile(file);
      setShowPhotoEditor(true);
    } else {
      handleFileUpload(file, 'video');
    }
    
    e.target.value = '';
  };

  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    if (!user) return;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
      const folder = type === 'image' ? 'images' : 'videos';

      const { error: uploadError } = await supabase.storage
        .from('chat-media')
        .upload(`${folder}/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('chat-media')
        .getPublicUrl(`${folder}/${fileName}`);

      handleMediaSelect(data.publicUrl, type);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  const handlePhotoSend = async (file: File, singleView: boolean) => {
    // For now, just upload and send - singleView would need backend support
    await handleFileUpload(file, 'image');
    if (singleView) {
      toast.info('Foto enviada em visualização única');
    }
  };

  const uploadChatAudio = async (file: File) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random()}.${fileExt}`;
    const filePath = `audios/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-media')
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from('chat-media').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const startVoiceRecording = async () => {
    if (isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      recordStreamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        try {
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const file = new File([blob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });

          const url = await uploadChatAudio(file);
          await handleMediaSelect(url, 'audio', recordingTimeRef.current);
        } catch (error) {
          console.error('Error sending voice message:', error);
          toast.error('Erro ao enviar áudio');
        } finally {
          recordStreamRef.current?.getTracks().forEach((t) => t.stop());
          recordStreamRef.current = null;
          chunksRef.current = [];
          setRecordingTime(0);
          recordingTimeRef.current = 0;
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success('Gravando...');

      recordTimerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);
      }, 1000);

    } catch (error) {
      console.error('Microphone access error:', error);
      toast.error('Permita o acesso ao microfone');
    }
  };

  const stopVoiceRecording = () => {
    if (!isRecording) return;

    if (recordTimerRef.current) {
      clearInterval(recordTimerRef.current);
      recordTimerRef.current = null;
    }

    setIsRecording(false);
    mediaRecorderRef.current?.stop();
  };

  const startCall = async (type: 'voice' | 'video') => {
    if (!user || !friendId) return;

    const { data, error } = await supabase
      .from('calls')
      .insert({
        caller_id: user.id,
        receiver_id: friendId,
        call_type: type,
        status: 'calling',
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (!error && data) {
      setActiveCall({ id: data.id, type });
    }
  };

  // Long press handlers for message actions
  const handleMessageTouchStart = (message: Message) => {
    longPressTimerRef.current = setTimeout(() => {
      setSelectedMessage(message);
      setShowMessageActions(true);
    }, 2000); // 2 seconds
  };

  const handleMessageTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  // Message Actions
  const handleCopyMessage = (message: Message) => {
    navigator.clipboard.writeText(message.content || message.media_url || '');
    toast.success('Mensagem copiada!');
    setShowMessageActions(false);
  };

  const handleDeleteMessage = async (message: Message) => {
    await supabase.from('messages').delete().eq('id', message.id);
    setMessages(prev => prev.filter(m => m.id !== message.id));
    toast.success('Mensagem eliminada!');
    setShowMessageActions(false);
  };

  const handleEditMessage = (message: Message) => {
    setEditingMessage(message);
    setEditText(message.content);
    setShowMessageActions(false);
  };

  const saveEditedMessage = async () => {
    if (!editingMessage || !editText.trim()) return;

    await supabase
      .from('messages')
      .update({ content: editText.trim() })
      .eq('id', editingMessage.id);

    setMessages(prev => prev.map(m => 
      m.id === editingMessage.id ? { ...m, content: editText.trim(), edited: true } : m
    ));
    
    setEditingMessage(null);
    setEditText('');
    toast.success('Mensagem editada!');
  };

  const handleReactToMessage = async (message: Message, emoji: string) => {
    if (!user) return;
    
    // Check if reaction exists
    const { data: existing } = await supabase
      .from('message_reactions')
      .select('*')
      .eq('message_id', message.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      if (existing.emoji === emoji) {
        await supabase.from('message_reactions').delete().eq('id', existing.id);
      } else {
        await supabase.from('message_reactions').update({ emoji }).eq('id', existing.id);
      }
    } else {
      await supabase.from('message_reactions').insert({
        message_id: message.id,
        user_id: user.id,
        emoji,
      });
    }
    
    toast.success('Reação adicionada!');
    setShowMessageActions(false);
  };

  const openImageViewer = (url: string) => {
    setSelectedImageUrl(url);
    setImageViewerOpen(true);
  };

  if (chatSettings?.is_locked && !isUnlocked && chatSettings?.pin_code) {
    return (
      <ChatPinProtection
        correctPin={chatSettings.pin_code}
        chatPartnerName={friend?.first_name || 'Usuário'}
        chatPartnerId={friendId || ''}
        onUnlock={() => setIsUnlocked(true)}
      />
    );
  }

  if (activeCall) {
    return (
      <CallInterface
        callId={activeCall.id}
        isVideo={activeCall.type === 'video'}
        onEnd={() => setActiveCall(null)}
      />
    );
  }

  if (loading || !friend) {
    return <ChatSkeleton />;
  }

  const isTyping = typingUsers.size > 0;

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg) => {
    const date = format(new Date(msg.created_at), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  const formatDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === format(today, 'yyyy-MM-dd')) {
      return 'Hoje';
    } else if (dateStr === format(yesterday, 'yyyy-MM-dd')) {
      return 'Ontem';
    } else {
      return format(date, 'dd/MM/yyyy');
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 z-50 bg-card border-b border-border px-3 py-2 safe-area-top">
        <div className="flex items-center gap-3 w-full">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/messages')}
            className="h-9 w-9 rounded-full"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          
          <div 
            className="relative flex-shrink-0 cursor-pointer"
            onClick={() => navigate(`/profile/${friend.id}`)}
          >
            <Avatar className="h-10 w-10 border-2 border-primary/20">
              <AvatarImage src={friend.avatar_url || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {friend.first_name[0]}
              </AvatarFallback>
            </Avatar>
            {isOnline && (
              <div className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
            )}
          </div>
          
          <div 
            className="flex-1 min-w-0 cursor-pointer"
            onClick={() => navigate(`/profile/${friend.id}`)}
          >
            <p className="font-semibold text-sm truncate">{friend.first_name}</p>
            <AnimatePresence mode="wait">
              {isTyping ? (
                <motion.p 
                  key="typing"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-primary"
                >
                  digitando...
                </motion.p>
              ) : (
                <motion.p 
                  key="status"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-muted-foreground"
                >
                  {isOnline ? 'online' : 'offline'}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => startCall('video')}
            >
              <Video className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => startCall('voice')}
            >
              <Phone className="h-5 w-5" />
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
                  <MoreVertical className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setShowWallpaperPicker(true)}>
                  <Palette className="h-4 w-4 mr-2" />
                  Mudar papel de parede
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/chat/${friendId}/settings`)}>
                  <Clock className="h-4 w-4 mr-2" />
                  Mensagens temporárias
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate(`/profile/${friend.id}`)}>
                  Ver perfil
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Messages Area */}
      <div 
        className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-2"
        style={{
          backgroundImage: wallpaper ? `url(${wallpaper})` : 'none',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundColor: wallpaper ? undefined : 'hsl(var(--muted) / 0.3)',
        }}
      >
        <div className="max-w-3xl mx-auto space-y-1">
          {Object.entries(groupedMessages).map(([date, msgs]) => (
            <div key={date}>
              {/* Date Label */}
              <div className="flex justify-center my-3">
                <span className="px-3 py-1 text-xs bg-card/90 backdrop-blur-sm text-muted-foreground rounded-lg shadow-sm">
                  {formatDateLabel(date)}
                </span>
              </div>

              {/* Messages */}
              {msgs.map((message, index) => {
                const isOwn = message.sender_id === user?.id;
                const showAvatar = !isOwn && (index === 0 || msgs[index - 1]?.sender_id !== message.sender_id);
                
                return (
                  <motion.div
                    key={message.id}
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-1`}
                  >
                    <div className={`flex items-end gap-1 max-w-[80%] ${isOwn ? 'flex-row-reverse' : 'flex-row'}`}>
                      {!isOwn && showAvatar && (
                        <Avatar className="h-6 w-6 flex-shrink-0">
                          <AvatarImage src={friend.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">{friend.first_name[0]}</AvatarFallback>
                        </Avatar>
                      )}
                      {!isOwn && !showAvatar && <div className="w-6" />}
                      
                      {/* Image messages - no bubble */}
                      {message.message_type === 'image' && message.media_url ? (
                        <motion.div
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openImageViewer(message.media_url!)}
                          onTouchStart={() => handleMessageTouchStart(message)}
                          onTouchEnd={handleMessageTouchEnd}
                          onMouseDown={() => handleMessageTouchStart(message)}
                          onMouseUp={handleMessageTouchEnd}
                          onMouseLeave={handleMessageTouchEnd}
                          className="relative cursor-pointer rounded-2xl overflow-hidden shadow-md select-none"
                        >
                          <img 
                            src={message.media_url} 
                            alt="Image" 
                            className="max-w-[250px] max-h-[300px] object-cover"
                            draggable={false}
                          />
                          <div className={`absolute bottom-1 right-1 flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/50`}>
                            <span className="text-[10px] text-white">
                              {format(new Date(message.created_at), 'HH:mm')}
                            </span>
                            {isOwn && (
                              message.read ? (
                                <CheckCheck className="h-3 w-3 text-blue-400" />
                              ) : (
                                <Check className="h-3 w-3 text-white" />
                              )
                            )}
                          </div>
                        </motion.div>
                      ) : (
                        <div
                          className={`relative px-3 py-2 rounded-2xl shadow-sm select-none ${
                            isOwn
                              ? 'bg-primary text-primary-foreground rounded-br-md'
                              : 'bg-card text-foreground rounded-bl-md'
                          }`}
                          onTouchStart={() => handleMessageTouchStart(message)}
                          onTouchEnd={handleMessageTouchEnd}
                          onMouseDown={() => handleMessageTouchStart(message)}
                          onMouseUp={handleMessageTouchEnd}
                          onMouseLeave={handleMessageTouchEnd}
                        >
                          {message.message_type === 'video' && message.media_url && (
                            <video 
                              src={message.media_url} 
                              controls 
                              className="rounded-lg max-w-full max-h-64 mb-1"
                            />
                          )}
                          
                          {message.message_type === 'audio' && message.media_url && (
                            <div className="mb-1">
                              <AudioWaveform
                                src={message.media_url}
                                duration={message.duration}
                                isSent={isOwn}
                              />
                            </div>
                          )}
                          
                          {message.content && (
                            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                          )}
                          
                          <div className={`flex items-center gap-1 justify-end mt-1 ${isOwn ? 'text-primary-foreground/60' : 'text-muted-foreground'}`}>
                            {message.edited && (
                              <span className="text-[9px]">editado</span>
                            )}
                            <span className="text-[10px]">
                              {format(new Date(message.created_at), 'HH:mm')}
                            </span>
                            {isOwn && (
                              message.read ? (
                                <CheckCheck className="h-3 w-3 text-blue-400" />
                              ) : (
                                <Check className="h-3 w-3" />
                              )
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ))}
          
          {/* Typing Indicator */}
          <AnimatePresence>
            {isTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex justify-start mb-2"
              >
                <div className="flex items-center gap-1 px-4 py-2 bg-card rounded-2xl shadow-sm">
                  <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <motion.div
                        key={i}
                        className="w-2 h-2 bg-muted-foreground rounded-full"
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }}
                      />
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Edit Message Bar */}
      <AnimatePresence>
        {editingMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-muted/50 border-t border-border px-4 py-2"
          >
            <div className="flex items-center gap-2">
              <Edit3 className="h-4 w-4 text-primary" />
              <div className="flex-1">
                <p className="text-xs text-primary font-medium">A editar mensagem</p>
                <p className="text-sm text-muted-foreground truncate">{editingMessage.content}</p>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditingMessage(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input Area */}
      <div className="flex-shrink-0 bg-card border-t border-border px-2 py-2 safe-area-bottom">
        <form onSubmit={editingMessage ? (e) => { e.preventDefault(); saveEditedMessage(); } : sendMessage} className="flex items-center gap-2 max-w-3xl mx-auto">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => setShowEmojiPicker(true)}
          >
            <Smile className="h-5 w-5" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              type="text"
              value={editingMessage ? editText : newMessage}
              onChange={(e) => editingMessage ? setEditText(e.target.value) : handleTyping(e.target.value)}
              placeholder="Mensagem"
              className="h-10 rounded-full bg-muted/50 border-0 pr-12 focus-visible:ring-1 focus-visible:ring-primary/30"
            />
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              onClick={() => imageInputRef.current?.click()}
            >
              <Paperclip className="h-5 w-5" />
            </Button>
          </div>
          
          {(editingMessage ? editText.trim() : newMessage.trim()) ? (
            <Button
              type="submit"
              size="icon"
              className="h-10 w-10 rounded-full bg-primary hover:bg-primary/90"
            >
              <Send className="h-5 w-5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={() => {
                if (isRecording) stopVoiceRecording();
                else startVoiceRecording();
              }}
              className={`h-10 w-10 rounded-full ${isRecording ? 'bg-red-500 hover:bg-red-600' : 'bg-primary hover:bg-primary/90'}`}
            >
              {isRecording ? (
                <span className="text-xs font-semibold tabular-nums">{recordingTime}s</span>
              ) : (
                <Mic className="h-5 w-5" />
              )}
            </Button>
          )}
        </form>
      </div>

      <EmojiPicker
        open={showEmojiPicker}
        onOpenChange={setShowEmojiPicker}
        onSelect={(emoji) => {
          if (editingMessage) {
            setEditText(prev => prev + emoji);
          } else {
            handleTyping(`${newMessage}${emoji}`);
          }
          setShowEmojiPicker(false);
        }}
      />

      {/* Wallpaper Picker */}
      <WallpaperPicker
        open={showWallpaperPicker}
        chatPartnerId={friendId || ''}
        onClose={() => setShowWallpaperPicker(false)}
        currentWallpaper={wallpaper}
        onWallpaperChange={(url) => setWallpaper(url)}
      />

      {/* Image Viewer */}
      <ImageViewer
        open={imageViewerOpen}
        onClose={() => setImageViewerOpen(false)}
        imageUrl={selectedImageUrl}
        senderName={friend.first_name}
      />

      {/* Photo Editor */}
      <ChatPhotoEditor
        open={showPhotoEditor}
        onClose={() => {
          setShowPhotoEditor(false);
          setSelectedPhotoFile(null);
        }}
        imageFile={selectedPhotoFile}
        onSend={handlePhotoSend}
      />

      {/* Message Actions Sheet */}
      <Sheet open={showMessageActions} onOpenChange={setShowMessageActions}>
        <SheetContent side="bottom" className="rounded-t-3xl">
          <SheetHeader>
            <SheetTitle className="sr-only">Ações da mensagem</SheetTitle>
          </SheetHeader>
          
          {selectedMessage && (
            <div className="space-y-2 py-4">
              {/* Quick Reactions */}
              <div className="flex justify-center gap-4 pb-4 border-b border-border">
                {['❤️', '😂', '😮', '😢', '😡', '👍'].map((emoji) => (
                  <button
                    key={emoji}
                    className="text-2xl hover:scale-125 transition-transform"
                    onClick={() => handleReactToMessage(selectedMessage, emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                className="w-full justify-start gap-3 h-12"
                onClick={() => handleCopyMessage(selectedMessage)}
              >
                <Copy className="h-5 w-5" />
                Copiar mensagem
              </Button>

              {selectedMessage.sender_id === user?.id && selectedMessage.message_type === 'text' && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12"
                  onClick={() => handleEditMessage(selectedMessage)}
                >
                  <Edit3 className="h-5 w-5" />
                  Editar mensagem
                </Button>
              )}

              {selectedMessage.sender_id === user?.id && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-12 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteMessage(selectedMessage)}
                >
                  <Trash2 className="h-5 w-5" />
                  Eliminar mensagem
                </Button>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
