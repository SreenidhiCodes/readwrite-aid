import { useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { AudioPlayer } from "@/components/AudioPlayer";
import { TextDisplay } from "@/components/TextDisplay";
import { Header } from "@/components/Header";

const Index = () => {
  const [extractedText, setExtractedText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);

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
            <AudioPlayer text={extractedText} />
            <TextDisplay text={extractedText} onReset={() => setExtractedText("")} />
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
