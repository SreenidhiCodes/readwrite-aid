import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { AudioPlayer } from "@/components/AudioPlayer";
import { TextDisplay } from "@/components/TextDisplay";
import { VoiceInput } from "@/components/VoiceInput";
import { Header } from "@/components/Header";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const { toast } = useToast();
  const [extractedText, setExtractedText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleVoiceInput = (voiceText: string) => {
    toast({
      title: "Voice captured",
      description: "You can use voice commands to control the app",
    });
    // You can add voice commands here, e.g., "read the document", "pause", etc.
  };

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Header />
      
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        {!extractedText ? (
          <FileUpload 
            onTextExtracted={setExtractedText} 
            isProcessing={isProcessing}
            setIsProcessing={setIsProcessing}
          />
        ) : (
          <div className="space-y-6 animate-in fade-in duration-500">
            <VoiceInput onTextReceived={handleVoiceInput} />
            <AudioPlayer text={extractedText} />
            <TextDisplay text={extractedText} onReset={() => setExtractedText("")} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
