import { useState, useRef, useEffect } from "react";
import { Play, Pause, RotateCcw, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
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
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
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
      // Restart with new speed
      const wasPlaying = isPlaying;
      window.speechSynthesis.cancel();
      if (wasPlaying) {
        speakNextChunk();
      }
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
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-muted-foreground mt-2">
          <span>{Math.round(progress)}% Complete</span>
          <span>{chunksRef.current.length > 0 ? `${currentChunkRef.current}/${chunksRef.current.length} segments` : 'Ready'}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-6">
        <Button
          onClick={handlePlayPause}
          size="lg"
          disabled={!selectedVoice}
          className="bg-gradient-hero hover:opacity-90 transition-opacity"
        >
          {isPlaying ? (
            <Pause className="h-5 w-5" />
          ) : (
            <Play className="h-5 w-5 ml-0.5" />
          )}
          <span className="ml-2">
            {isPlaying ? "Pause" : "Play"}
          </span>
        </Button>

        <Button
          onClick={handleRestart}
          variant="secondary"
          size="lg"
          disabled={!isPlaying && progress === 0}
        >
          <RotateCcw className="h-5 w-5" />
          <span className="ml-2">Restart</span>
        </Button>
      </div>

      {/* Voice Selection */}
      <div className="mb-6">
        <label className="text-sm font-medium mb-2 block">Voice</label>
        <Select 
          value={selectedVoice?.name} 
          onValueChange={handleVoiceChange}
          disabled={availableVoices.length === 0}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder={availableVoices.length === 0 ? "Loading voices..." : "Select a voice"} />
          </SelectTrigger>
          <SelectContent>
            {availableVoices.map((voice) => (
              <SelectItem key={voice.name} value={voice.name}>
                {voice.name} ({voice.lang})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {availableVoices.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            Loading available voices...
          </p>
        )}
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
