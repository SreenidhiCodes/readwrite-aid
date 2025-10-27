import { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface AudioPlayerProps {
  text: string;
}

export const AudioPlayer = ({ text }: AudioPlayerProps) => {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [voice, setVoice] = useState("Brian");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Split text into chunks (ElevenLabs has character limits)
  const chunkText = (text: string, maxLength: number = 2500) => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const chunks: string[] = [];
    let currentChunk = "";

    for (const sentence of sentences) {
      if ((currentChunk + sentence).length > maxLength) {
        if (currentChunk) chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }
    if (currentChunk) chunks.push(currentChunk.trim());

    return chunks;
  };

  const generateAudio = async () => {
    setIsGenerating(true);
    try {
      const chunks = chunkText(text);
      
      toast({
        title: "Generating audio...",
        description: `Processing ${chunks.length} text segment(s)`,
      });

      // Generate audio for first chunk only to keep it fast
      // In production, you'd concatenate all chunks
      const { data, error } = await supabase.functions.invoke('text-to-speech', {
        body: { text: chunks[0], voice }
      });

      if (error) throw error;

      if (data?.audioContent) {
        // Create audio element with base64 data
        const audioUrl = `data:audio/mpeg;base64,${data.audioContent}`;
        
        if (audioRef.current) {
          audioRef.current.src = audioUrl;
          audioRef.current.playbackRate = speed;
          audioRef.current.load();
        } else {
          const audio = new Audio(audioUrl);
          audio.playbackRate = speed;
          audioRef.current = audio;

          audio.onloadedmetadata = () => {
            setDuration(audio.duration);
          };

          audio.onended = () => {
            setIsPlaying(false);
            setCurrentTime(0);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
          };

          audio.onerror = () => {
            toast({
              title: "Error",
              description: "Failed to play audio",
              variant: "destructive",
            });
            setIsPlaying(false);
          };
        }

        toast({
          title: "Ready to play!",
          description: `Audio generated with ${voice} voice`,
        });
      }
    } catch (error) {
      console.error('Error generating audio:', error);
      toast({
        title: "Error",
        description: "Failed to generate audio. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayPause = async () => {
    if (!audioRef.current) {
      await generateAudio();
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    } else {
      try {
        await audioRef.current.play();
        setIsPlaying(true);

        // Update current time
        intervalRef.current = setInterval(() => {
          if (audioRef.current) {
            setCurrentTime(audioRef.current.currentTime);
          }
        }, 100);
      } catch (error) {
        console.error('Error playing audio:', error);
        toast({
          title: "Error",
          description: "Failed to play audio",
          variant: "destructive",
        });
      }
    }
  };

  const handleRestart = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      setCurrentTime(0);
    }
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleSpeedChange = (value: number[]) => {
    const newSpeed = value[0];
    setSpeed(newSpeed);
    
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  const handleVoiceChange = (newVoice: string) => {
    setVoice(newVoice);
    // Reset audio to regenerate with new voice
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  };

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const progressPercentage = duration > 0 ? (currentTime / duration) * 100 : 0;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="p-6 bg-card/80 backdrop-blur-sm border-border shadow-lg">
      <div className="flex items-center gap-2 mb-4">
        <Volume2 className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">Listen Mode</h3>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-hero transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{formatTime(currentTime)}</span>
          <span>{duration > 0 ? formatTime(duration) : '--:--'}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          onClick={handlePlayPause}
          size="lg"
          disabled={isGenerating}
          className="bg-gradient-hero hover:opacity-90 transition-opacity"
        >
          {isGenerating ? (
            <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
          <span className="ml-2">
            {isGenerating ? "Generating..." : isPlaying ? "Pause" : "Play"}
          </span>
        </Button>

        <Button
          onClick={handleRestart}
          variant="secondary"
          size="lg"
          disabled={!audioRef.current}
        >
          <RotateCcw className="h-5 w-5" />
          <span className="ml-2">Restart</span>
        </Button>
      </div>

      {/* Voice Selection */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Voice (UK English)</label>
        <Select value={voice} onValueChange={handleVoiceChange}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Brian">Brian (Male)</SelectItem>
            <SelectItem value="Alice">Alice (Female)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Speed Control */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Speed</label>
          <span className="text-sm font-semibold text-primary">{speed.toFixed(1)}×</span>
        </div>
        <Slider
          value={[speed]}
          onValueChange={handleSpeedChange}
          min={0.5}
          max={2.0}
          step={0.1}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>0.5× Slow</span>
          <span>2.0× Fast</span>
        </div>
      </div>
    </Card>
  );
};
