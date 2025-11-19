import { useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface CallInterfaceProps {
  callId: string;
  isVideo: boolean;
  onEnd: () => void;
}

export default function CallInterface({ callId, isVideo, onEnd }: CallInterfaceProps) {
  const { user } = useAuth();
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    initCall();
    return () => {
      cleanup();
    };
  }, []);

  const initCall = async () => {
    try {
      console.log('Iniciando chamada...', { callId, isVideo });
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: isVideo,
      });

      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      const configuration: RTCConfiguration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
        ],
      };

      const peerConnection = new RTCPeerConnection(configuration);
      peerConnectionRef.current = peerConnection;

      stream.getTracks().forEach(track => {
        peerConnection.addTrack(track, stream);
      });

      peerConnection.ontrack = (event) => {
        console.log('Recebendo stream remoto');
        if (remoteVideoRef.current && event.streams[0]) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      peerConnection.onicecandidate = async (event) => {
        if (event.candidate) {
          console.log('ICE candidate:', event.candidate);
          await supabase
            .from('calls')
            .update({ status: 'ongoing' })
            .eq('id', callId);

          if (channelRef.current) {
            channelRef.current.send({
              type: 'broadcast',
              event: 'signal',
              payload: { type: 'ice-candidate', candidate: event.candidate },
            });
          }
        }
      };

      peerConnection.onconnectionstatechange = () => {
        console.log('Connection state:', peerConnection.connectionState);
      };

      const channel = supabase
        .channel(`call-${callId}`)
        .on('broadcast', { event: 'signal' }, async ({ payload }) => {
          console.log('Sinal recebido:', payload.type);
          
          if (payload.type === 'offer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.offer));
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: { type: 'answer', answer },
            });
          } else if (payload.type === 'answer') {
            await peerConnection.setRemoteDescription(new RTCSessionDescription(payload.answer));
          } else if (payload.type === 'ice-candidate') {
            await peerConnection.addIceCandidate(new RTCIceCandidate(payload.candidate));
          }
        })
        .subscribe((status) => {
          console.log('Canal de sinalização:', status);
        });

      channelRef.current = channel;

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      console.log('Enviando offer');
      channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: { type: 'offer', offer },
      });

    } catch (error) {
      console.error('Erro ao inicializar chamada:', error);
      onEnd();
    }
  };

  const cleanup = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
  };

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOff(!videoTrack.enabled);
      }
    }
  };

  const endCall = async () => {
    await supabase
      .from('calls')
      .update({
        status: 'ended',
        ended_at: new Date().toISOString(),
      })
      .eq('id', callId);
    
    cleanup();
    onEnd();
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <div className="flex-1 relative">
        {/* Remote Video - Full screen */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover bg-secondary"
        />
        
        {/* Local Video - Picture in Picture */}
        {isVideo && (
          <div className="absolute bottom-6 right-6 w-40 h-56 rounded-2xl overflow-hidden border-2 border-primary shadow-2xl animate-scale-in">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover mirror"
            />
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 bg-card/95 backdrop-blur-sm border-t border-border flex justify-center gap-4 safe-area-bottom">
        <Button
          variant={isMuted ? 'destructive' : 'secondary'}
          size="icon"
          className="h-16 w-16 rounded-full transition-all hover:scale-110"
          onClick={toggleMute}
        >
          {isMuted ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
        </Button>

        {isVideo && (
          <Button
            variant={isVideoOff ? 'destructive' : 'secondary'}
            size="icon"
            className="h-16 w-16 rounded-full transition-all hover:scale-110"
            onClick={toggleVideo}
          >
            {isVideoOff ? <VideoOff className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          </Button>
        )}

        <Button
          variant="destructive"
          size="icon"
          className="h-20 w-20 rounded-full transition-all hover:scale-110"
          onClick={endCall}
        >
          <PhoneOff className="h-8 w-8" />
        </Button>
      </div>
    </div>
  );
}
