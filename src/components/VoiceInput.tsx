import { useState, useRef, useEffect } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

interface VoiceInputProps {
  onTextReceived: (text: string) => void;
}

export const VoiceInput = ({ onTextReceived }: VoiceInputProps) => {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check if browser supports speech recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB"; // British English

    recognition.onstart = () => {
      setIsListening(true);
      toast({
        title: "Listening...",
        description: "Speak now to add text",
      });
    };

    recognition.onresult = (event: any) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + " ";
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(interimTranscript || finalTranscript);

      if (finalTranscript) {
        onTextReceived(finalTranscript.trim());
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      if (event.error !== "no-speech") {
        toast({
          title: "Error",
          description: "Failed to recognize speech. Please try again.",
          variant: "destructive",
        });
      }
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setTranscript("");
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [toast, onTextReceived]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      toast({
        title: "Not supported",
        description: "Speech recognition is not supported in your browser",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  return (
    <Card className="p-4 bg-card/80 backdrop-blur-sm border-border">
      <div className="flex items-center gap-3">
        <Button
          onClick={toggleListening}
          size="lg"
          variant={isListening ? "destructive" : "secondary"}
          className="flex-shrink-0"
        >
          {isListening ? (
            <>
              <MicOff className="h-5 w-5" />
              <span className="ml-2">Stop</span>
            </>
          ) : (
            <>
              <Mic className="h-5 w-5" />
              <span className="ml-2">Voice Input</span>
            </>
          )}
        </Button>

        {transcript && (
          <div className="flex-1 px-4 py-2 bg-secondary rounded-lg">
            <p className="text-sm text-muted-foreground italic">"{transcript}"</p>
          </div>
        )}

        {!transcript && !isListening && (
          <p className="text-sm text-muted-foreground">
            Click to use voice input like Google Assistant
          </p>
        )}
      </div>
    </Card>
  );
};
