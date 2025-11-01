import { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2, Settings, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  const [speed, setSpeed] = useState(1.0);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [progress, setProgress] = useState(0);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const chunksRef = useRef<string[]>([]);
  const currentChunkRef = useRef(0);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      
      // Priority 1: Indian English voices (better pronunciation of Indian words)
      const indianVoices = voices.filter(v => 
        v.lang.includes('en-IN') || v.lang.includes('en_IN')
      );
      
      // Priority 2: Any English voices
      const englishVoices = voices.filter(v => v.lang.startsWith('en'));
      
      // Set available voices (prioritize Indian, then English)
      const voiceList = indianVoices.length > 0 ? indianVoices : englishVoices;
      setAvailableVoices(voiceList.length > 0 ? voiceList : voices);
      
      // Select default voice: Indian > Female English > Any English
      let defaultVoice = null;
      if (indianVoices.length > 0) {
        defaultVoice = indianVoices[0];
      } else {
        const femaleVoice = englishVoices.find(v => 
          v.name.toLowerCase().includes('female') || 
          v.name.toLowerCase().includes('woman') ||
          v.name.toLowerCase().includes('samantha') ||
          v.name.toLowerCase().includes('victoria')
        );
        defaultVoice = femaleVoice || englishVoices[0] || voices[0];
      }
      
      setSelectedVoice(defaultVoice);
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  // Split text into chunks (Speech Synthesis has character limits)
  const chunkText = (text: string, maxLength: number = 200) => {
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

  const speakNextChunk = () => {
    if (currentChunkRef.current >= chunksRef.current.length) {
      setIsPlaying(false);
      setProgress(100);
      toast({
        title: "Completed!",
        description: "Finished reading the document",
      });
      return;
    }

    const utterance = new SpeechSynthesisUtterance(chunksRef.current[currentChunkRef.current]);
    utterance.rate = speed;
    utterance.pitch = 1;
    utterance.volume = 1;
    
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      currentChunkRef.current += 1;
      const progressPercent = (currentChunkRef.current / chunksRef.current.length) * 100;
      setProgress(progressPercent);
      speakNextChunk();
    };

    utterance.onerror = (error) => {
      console.error('Speech synthesis error:', error);
      toast({
        title: "Error",
        description: "Failed to play audio. Please try again.",
        variant: "destructive",
      });
      setIsPlaying(false);
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  };

  const handlePlayPause = () => {
    if (!selectedVoice) {
      toast({
        title: "No voice available",
        description: "Please wait for voices to load",
        variant: "destructive",
      });
      return;
    }

    if (isPlaying) {
      // Pause instead of cancel to maintain position
      window.speechSynthesis.pause();
      setIsPlaying(false);
    } else {
      // If resuming, check if speech is paused
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
        setIsPlaying(true);
      } else {
        // Starting fresh
        chunksRef.current = chunkText(text);
        currentChunkRef.current = 0;
        setProgress(0);
        setIsPlaying(true);
        
        toast({
          title: "Starting playback",
          description: `Reading ${chunksRef.current.length} text segments`,
        });
        
        speakNextChunk();
      }
    }
  };

  const handleRestart = () => {
    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setProgress(0);
    currentChunkRef.current = 0;
  };

  const handleSpeedChange = (value: number[]) => {
    const newSpeed = value[0];
    setSpeed(newSpeed);
    
    if (isPlaying && utteranceRef.current) {
      // Apply speed change immediately by restarting current chunk
      window.speechSynthesis.cancel();
      speakNextChunk();
    }
  };

  const handleVoiceChange = (voiceName: string) => {
    const voice = availableVoices.find(v => v.name === voiceName);
    if (voice) {
      setSelectedVoice(voice);
      if (isPlaying) {
        // Restart with new voice
        window.speechSynthesis.cancel();
        setIsPlaying(false);
        setProgress(0);
      }
    }
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  return (
    <Card className="p-6 bg-gradient-card backdrop-blur-sm border-border shadow-medium hover:shadow-large transition-shadow">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Volume2 className={`h-6 w-6 text-primary ${isPlaying ? 'animate-pulse' : ''}`} />
            </div>
            Audio Player
          </h3>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isPlaying ? 'bg-success animate-pulse' : 'bg-muted'}`} />
            <span className="text-sm text-muted-foreground font-semibold">
              {Math.round(progress)}% complete
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <Progress value={progress} className="w-full h-3" />
          {isPlaying && (
            <div className="h-1 bg-gradient-hero rounded-full animate-pulse" />
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handlePlayPause}
            size="lg"
            className="flex-shrink-0 px-8 py-6 bg-gradient-hero hover:shadow-glow font-semibold rounded-xl transition-all hover:scale-105"
          >
            {isPlaying ? (
              <>
                <Pause className="h-6 w-6" />
                <span className="ml-2 text-base">Pause</span>
              </>
            ) : (
              <>
                <Play className="h-6 w-6" />
                <span className="ml-2 text-base">Play</span>
              </>
            )}
          </Button>

          <Button
            onClick={handleRestart}
            size="lg"
            variant="outline"
            className="px-6 py-6 rounded-xl font-semibold hover:bg-secondary/80 hover:scale-105 transition-all border-2"
          >
            <RotateCcw className="h-5 w-5" />
            <span className="ml-2">Restart</span>
          </Button>
        </div>

        <div className="space-y-5 pt-2">
          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center gap-2 text-foreground">
              <User className="h-4 w-4 text-primary" />
              Select Voice
            </label>
            <Select value={selectedVoice?.name} onValueChange={handleVoiceChange}>
              <SelectTrigger className="w-full h-12 rounded-xl border-2 font-medium">
                <SelectValue placeholder="Choose a voice" />
              </SelectTrigger>
              <SelectContent>
                {availableVoices.map((voice) => (
                  <SelectItem key={voice.name} value={voice.name} className="font-medium">
                    {voice.name} ({voice.lang})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold flex items-center justify-between text-foreground">
              <span className="flex items-center gap-2">
                <Settings className="h-4 w-4 text-primary" />
                Playback Speed
              </span>
              <span className="text-primary font-bold">{speed}x</span>
            </label>
            <Slider
              value={[speed]}
              onValueChange={handleSpeedChange}
              min={0.5}
              max={2}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>0.5x (Slow)</span>
              <span>1x (Normal)</span>
              <span>2x (Fast)</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
