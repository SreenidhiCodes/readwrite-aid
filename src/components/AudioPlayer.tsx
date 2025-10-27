import { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

interface AudioPlayerProps {
  text: string;
}

export const AudioPlayer = ({ text }: AudioPlayerProps) => {
  const { toast } = useToast();
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1.0);
  const [currentPosition, setCurrentPosition] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Split text into chunks for better control
  const textChunks = text.match(/.{1,200}(\s|$)/g) || [text];
  const totalChunks = textChunks.length;

  const speakText = (fromPosition: number = 0) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      // Get UK English voice
      const voices = window.speechSynthesis.getVoices();
      const ukVoice = voices.find(voice => voice.lang === 'en-GB') || voices[0];

      const utterance = new SpeechSynthesisUtterance(textChunks.slice(fromPosition).join(' '));
      utterance.voice = ukVoice;
      utterance.rate = speed;
      utterance.pitch = 1;
      utterance.volume = 1;

      utterance.onend = () => {
        setIsPlaying(false);
        setCurrentPosition(0);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };

      utterance.onerror = (error) => {
        console.error('Speech error:', error);
        toast({
          title: "Error",
          description: "Failed to play audio. Please try again.",
          variant: "destructive",
        });
        setIsPlaying(false);
      };

      utteranceRef.current = utterance;
      window.speechSynthesis.speak(utterance);

      // Simulate progress
      intervalRef.current = setInterval(() => {
        setCurrentPosition(prev => {
          const next = prev + 1;
          if (next >= totalChunks) {
            if (intervalRef.current) clearInterval(intervalRef.current);
            return totalChunks;
          }
          return next;
        });
      }, 2000 / speed);

    } else {
      toast({
        title: "Not supported",
        description: "Text-to-speech is not supported in your browser",
        variant: "destructive",
      });
    }
  };

  const handlePlayPause = () => {
    if (isPlaying) {
      window.speechSynthesis.pause();
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    } else {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      } else {
        speakText(currentPosition);
        setIsPlaying(true);
      }
    }
  };

  const handleRestart = () => {
    window.speechSynthesis.cancel();
    setCurrentPosition(0);
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleSpeedChange = (value: number[]) => {
    const newSpeed = value[0];
    setSpeed(newSpeed);
    
    // If currently playing, restart with new speed
    if (isPlaying) {
      window.speechSynthesis.cancel();
      speakText(currentPosition);
    }
  };

  useEffect(() => {
    // Load voices when component mounts
    const loadVoices = () => {
      window.speechSynthesis.getVoices();
    };
    loadVoices();
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      window.speechSynthesis.cancel();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, []);

  const progressPercentage = (currentPosition / totalChunks) * 100;

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
        <p className="text-xs text-muted-foreground mt-2">
          {Math.round(progressPercentage)}% complete
        </p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          onClick={handlePlayPause}
          size="lg"
          className="bg-gradient-hero hover:opacity-90 transition-opacity"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
          <span className="ml-2">{isPlaying ? "Pause" : "Play"}</span>
        </Button>

        <Button
          onClick={handleRestart}
          variant="secondary"
          size="lg"
        >
          <RotateCcw className="h-5 w-5" />
          <span className="ml-2">Restart</span>
        </Button>
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
