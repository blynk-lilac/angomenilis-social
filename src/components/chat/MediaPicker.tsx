import { Image, Video, Mic, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface MediaPickerProps {
  onMediaSelect: (url: string, type: 'image' | 'video' | 'audio', duration?: number) => void;
}

export default function MediaPicker({ onMediaSelect }: MediaPickerProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const uploadFile = async (file: File, folder: string) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('stories')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('stories')
      .getPublicUrl(filePath);

    return data.publicUrl;
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadFile(file, 'chat-images');
      onMediaSelect(url, 'image');
    } catch (error) {
      toast({
        title: 'Erro ao enviar imagem',
        variant: 'destructive',
      });
    }
  };

  const handleVideoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const url = await uploadFile(file, 'chat-videos');
      onMediaSelect(url, 'video');
    } catch (error) {
      toast({
        title: 'Erro ao enviar vídeo',
        variant: 'destructive',
      });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const file = new File([blob], 'audio.webm', { type: 'audio/webm' });
        
        try {
          const url = await uploadFile(file, 'chat-audios');
          onMediaSelect(url, 'audio', recordingTime);
        } catch (error) {
          toast({
            title: 'Erro ao enviar áudio',
            variant: 'destructive',
          });
        }
        
        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast({
        title: 'Erro ao acessar microfone',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  return (
    <div className="flex gap-2 items-center">
      <input
        type="file"
        accept="image/*"
        className="hidden"
        id="image-upload"
        onChange={handleImageSelect}
      />
      <label htmlFor="image-upload">
        <Button type="button" variant="ghost" size="icon" className="h-10 w-10" asChild>
          <span>
            <Image className="h-5 w-5" />
          </span>
        </Button>
      </label>

      <input
        type="file"
        accept="video/*"
        className="hidden"
        id="video-upload"
        onChange={handleVideoSelect}
      />
      <label htmlFor="video-upload">
        <Button type="button" variant="ghost" size="icon" className="h-10 w-10" asChild>
          <span>
            <Video className="h-5 w-5" />
          </span>
        </Button>
      </label>

      {!isRecording ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10"
          onClick={startRecording}
        >
          <Mic className="h-5 w-5" />
        </Button>
      ) : (
        <Button
          type="button"
          variant="destructive"
          size="icon"
          className="h-10 w-10 animate-pulse"
          onClick={stopRecording}
        >
          <X className="h-5 w-5" />
          <span className="ml-1 text-xs">{recordingTime}s</span>
        </Button>
      )}
    </div>
  );
}
