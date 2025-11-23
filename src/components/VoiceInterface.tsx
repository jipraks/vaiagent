import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { VoiceVisualizer } from './VoiceVisualizer';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useSession } from '@/hooks/useSession';
import { sendAudioToAPI } from '@/utils/audioApi';
import { Mic, MicOff, RotateCcw, Loader2 } from 'lucide-react';

export const VoiceInterface = () => {
  const { toast } = useToast();
  const { isRecording, audioLevel, startRecording, stopRecording } = useAudioRecorder();
  const { sessionId, resetSession } = useSession();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackLevel, setPlaybackLevel] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const analyzePlayback = () => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setPlaybackLevel(average / 255);

    animationFrameRef.current = requestAnimationFrame(analyzePlayback);
  };

  const playAudioResponse = async (audioBlob: Blob) => {
    try {
      const audioUrl = URL.createObjectURL(audioBlob);
      
      if (!audioRef.current) {
        audioRef.current = new Audio();
      }

      // Setup audio analysis for playback (only once)
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      if (!analyserRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
      }

      const audio = audioRef.current;
      
      // Only create MediaElementSource once
      if (!sourceRef.current) {
        sourceRef.current = audioContextRef.current.createMediaElementSource(audio);
        sourceRef.current.connect(analyserRef.current);
        analyserRef.current.connect(audioContextRef.current.destination);
      }

      audio.src = audioUrl;

      audio.onplay = () => {
        setIsPlaying(true);
        analyzePlayback();
      };

      audio.onended = () => {
        setIsPlaying(false);
        setPlaybackLevel(0);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('Error playing audio:', error);
      setIsPlaying(false);
      setPlaybackLevel(0);
      toast({
        title: 'Playback Error',
        description: 'Failed to play AI response',
        variant: 'destructive',
      });
    }
  };

  const handleToggleRecording = async () => {
    if (isRecording) {
      setIsProcessing(true);
      try {
        const audioBlob = await stopRecording();
        
        if (!sessionId) {
          toast({
            title: 'Session Error',
            description: 'Session not initialized',
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }

        // Send to API
        const responseBlob = await sendAudioToAPI(audioBlob, sessionId);
        
        // Play response
        await playAudioResponse(responseBlob);
        
      } catch (error) {
        console.error('Error processing audio:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to process audio',
          variant: 'destructive',
        });
      } finally {
        setIsProcessing(false);
      }
    } else {
      try {
        await startRecording();
        toast({
          title: 'Recording Started',
          description: 'Speak now...',
        });
      } catch (error) {
        console.error('Error starting recording:', error);
        toast({
          title: 'Recording Error',
          description: 'Failed to access microphone',
          variant: 'destructive',
        });
      }
    }
  };

  const handleResetSession = () => {
    resetSession();
    toast({
      title: 'Session Reset',
      description: 'Started a new conversation',
    });
  };

  const isActive = isRecording || isPlaying;
  const currentLevel = isRecording ? audioLevel : playbackLevel;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-br from-background via-background to-accent/5">
      <div className="w-full max-w-2xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Voice AI Assistant
          </h1>
          <p className="text-muted-foreground">
            {isRecording ? 'Listening...' : isPlaying ? 'AI is speaking...' : isProcessing ? 'Processing...' : 'Tap to start talking'}
          </p>
        </div>

        {/* Voice Visualizer */}
        <div className="flex justify-center">
          <VoiceVisualizer 
            isActive={isActive} 
            audioLevel={currentLevel}
            className="drop-shadow-2xl"
          />
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            onClick={handleToggleRecording}
            disabled={isProcessing || isPlaying}
            size="lg"
            variant={isRecording ? "destructive" : "default"}
            className="w-full sm:w-auto min-w-[200px] h-14 text-lg font-semibold transition-all hover:scale-105"
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Processing
              </>
            ) : isRecording ? (
              <>
                <MicOff className="mr-2 h-5 w-5" />
                Stop Recording
              </>
            ) : (
              <>
                <Mic className="mr-2 h-5 w-5" />
                Start Recording
              </>
            )}
          </Button>

          <Button
            onClick={handleResetSession}
            disabled={isRecording || isProcessing || isPlaying}
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            New Conversation
          </Button>
        </div>

        {/* Session Info */}
        {sessionId && (
          <div className="text-center">
            <p className="text-xs text-muted-foreground font-mono">
              Session: {sessionId.slice(0, 20)}...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
