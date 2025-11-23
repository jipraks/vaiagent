import { useState, useRef, useCallback } from 'react';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  const analyzeAudio = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
    setAudioLevel(average / 255);

    animationFrameRef.current = requestAnimationFrame(analyzeAudio);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Make sure previous recording is fully stopped
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        console.warn('Previous recording still active, waiting...');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });

      // Setup audio analysis
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      // Start analyzing
      analyzeAudio();

      // Setup recorder with fresh chunks array
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      });
      
      // CRITICAL: Clear chunks when starting new recording
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      throw error;
    }
  }, [analyzeAudio]);

  const stopRecording = useCallback((): Promise<Blob> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current) {
        resolve(new Blob());
        return;
      }

      const recorder = mediaRecorderRef.current;

      recorder.onstop = () => {
        // Create blob from current chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        
        console.log('Recording stopped, chunks:', audioChunksRef.current.length, 'blob size:', audioBlob.size);
        
        // Clear chunks AFTER creating the blob
        audioChunksRef.current = [];
        
        // Stop all tracks
        recorder.stream.getTracks().forEach(track => track.stop());
        
        // Clean up audio analysis
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
        if (audioContextRef.current) {
          audioContextRef.current.close();
        }
        
        setIsRecording(false);
        setAudioLevel(0);
        
        // Clear the recorder reference
        mediaRecorderRef.current = null;
        
        resolve(audioBlob);
      };

      recorder.stop();
    });
  }, []);

  return {
    isRecording,
    audioLevel,
    startRecording,
    stopRecording,
  };
};
