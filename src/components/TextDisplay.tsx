import { useState } from "react";
import { Copy, Check, FileText, Edit2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface TextDisplayProps {
  text: string;
  onReset: () => void;
  onTextUpdate: (newText: string) => void;
}

export const TextDisplay = ({ text, onReset, onTextUpdate }: TextDisplayProps) => {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(text);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(isEditing ? editedText : text);
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

  const handleSave = () => {
    onTextUpdate(editedText);
    setIsEditing(false);
    toast({
      title: "Saved!",
      description: "Your corrections have been applied",
    });
  };

  const handleEdit = () => {
    setEditedText(text);
    setIsEditing(true);
  };

  return (
    <Card className="overflow-hidden bg-gradient-card backdrop-blur-sm border-border shadow-medium">
      <div className="p-5 border-b border-border bg-gradient-to-r from-secondary/50 to-secondary/30">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            {isEditing ? "Edit Text" : "Extracted Text"}
          </h3>
          <div className="flex gap-2">
            {isEditing ? (
              <Button onClick={handleSave} size="sm" className="px-4 py-2 bg-success hover:bg-success/90 rounded-lg font-semibold shadow-soft">
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            ) : (
              <Button onClick={handleEdit} size="sm" variant="secondary" className="px-4 py-2 rounded-lg font-semibold hover:bg-secondary/80 border-2 border-transparent hover:border-primary/30">
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </Button>
            )}
            
            <Button
              onClick={handleCopy}
              size="sm"
              variant="secondary"
              disabled={copied}
              className="px-4 py-2 rounded-lg font-semibold hover:bg-secondary/80 border-2 border-transparent hover:border-primary/30"
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-2 text-success" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </>
              )}
            </Button>

            <Button onClick={onReset} size="sm" variant="outline" className="px-4 py-2 rounded-lg font-semibold border-2 hover:bg-accent/10 hover:border-accent">
              <FileText className="h-4 w-4 mr-2" />
              New PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="p-8">
        {isEditing ? (
          <Textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="min-h-[350px] w-full resize-none font-mono text-base leading-relaxed rounded-xl border-2 focus:border-primary p-4 shadow-soft"
            placeholder="Edit your text here..."
          />
        ) : (
          <div
            className="prose prose-slate max-w-none min-h-[350px] overflow-y-auto max-h-[600px] px-2"
            style={{
              whiteSpace: "pre-wrap",
              fontFamily: "ui-serif, Georgia, Cambria, serif",
              fontSize: "1.125rem",
              lineHeight: "1.9",
              color: "hsl(var(--reading-text))",
            }}
          >
            {text}
          </div>
        )}

        {/* Custom scrollbar styling */}
        <style>{`
          .prose::-webkit-scrollbar {
            width: 10px;
          }
          .prose::-webkit-scrollbar-track {
            background: hsl(var(--secondary));
            border-radius: 8px;
          }
          .prose::-webkit-scrollbar-thumb {
            background: linear-gradient(180deg, hsl(var(--primary)), hsl(var(--primary-glow)));
            border-radius: 8px;
          }
          .prose::-webkit-scrollbar-thumb:hover {
            background: linear-gradient(180deg, hsl(var(--primary-glow)), hsl(var(--primary)));
          }
        `}</style>
      </div>
    </Card>
  );
};