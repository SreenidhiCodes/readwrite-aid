import { useState } from "react";
import { Copy, Check, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";

interface TextDisplayProps {
  text: string;
  onReset: () => void;
}

export const TextDisplay = ({ text, onReset }: TextDisplayProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Text copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy text",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="p-6 bg-reading-bg border-border shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-reading-text">Extracted Text</h3>
        <div className="flex gap-2">
          <Button
            onClick={handleCopy}
            variant="secondary"
            size="sm"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            <span className="ml-2">{copied ? "Copied" : "Copy"}</span>
          </Button>
          <Button
            onClick={onReset}
            variant="outline"
            size="sm"
          >
            <Upload className="h-4 w-4" />
            <span className="ml-2">New PDF</span>
          </Button>
        </div>
      </div>

      <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
        <p className="text-reading-text leading-relaxed whitespace-pre-wrap text-lg">
          {text}
        </p>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: hsl(var(--secondary));
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--primary));
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: hsl(var(--primary) / 0.8);
        }
      `}</style>
    </Card>
  );
};
