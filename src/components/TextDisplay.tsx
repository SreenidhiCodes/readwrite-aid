import { useState } from "react";
import { Copy, Check, Upload, Edit, Save } from "lucide-react";
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
    <Card className="p-6 bg-reading-bg border-border shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-reading-text">
          {isEditing ? "Edit Text" : "Extracted Text"}
        </h3>
        <div className="flex gap-2">
          {isEditing ? (
            <Button
              onClick={handleSave}
              variant="default"
              size="sm"
            >
              <Save className="h-4 w-4" />
              <span className="ml-2">Save</span>
            </Button>
          ) : (
            <Button
              onClick={handleEdit}
              variant="secondary"
              size="sm"
            >
              <Edit className="h-4 w-4" />
              <span className="ml-2">Edit</span>
            </Button>
          )}
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

      {isEditing ? (
        <Textarea
          value={editedText}
          onChange={(e) => setEditedText(e.target.value)}
          className="min-h-[600px] text-reading-text leading-relaxed text-lg resize-none"
          placeholder="Edit the extracted text here..."
        />
      ) : (
        <div className="max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
          <p className="text-reading-text leading-relaxed whitespace-pre-wrap text-lg">
            {text}
          </p>
        </div>
      )}

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
