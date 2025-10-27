import { useCallback, useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker with correct path
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;
}

interface FileUploadProps {
  onTextExtracted: (text: string) => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
}

export const FileUpload = ({ onTextExtracted, isProcessing, setIsProcessing }: FileUploadProps) => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);

  const extractTextFromPDF = async (file: File) => {
    setIsProcessing(true);
    setProgress(10);

    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress(30);
      
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setProgress(50);
      
      let fullText = "";
      const totalPages = pdf.numPages;

      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + "\n\n";
        setProgress(50 + (i / totalPages) * 50);
      }

      if (!fullText.trim()) {
        throw new Error("No text found in PDF. It might be an image-based PDF.");
      }

      setProgress(100);
      onTextExtracted(fullText.trim());
      
      toast({
        title: "Success!",
        description: `Extracted text from ${totalPages} page(s)`,
      });
    } catch (error) {
      console.error("Error extracting PDF text:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to process PDF",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleFile = useCallback(
    (file: File) => {
      if (file.type !== "application/pdf") {
        toast({
          title: "Invalid file",
          description: "Please upload a PDF file",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 100MB",
          variant: "destructive",
        });
        return;
      }

      extractTextFromPDF(file);
    },
    [toast]
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h2 className="text-4xl font-bold mb-3 bg-gradient-hero bg-clip-text text-transparent">
            Upload Your PDF
          </h2>
          <p className="text-muted-foreground text-lg">
            Drag and drop or click to select a file (up to 100MB)
          </p>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`
            relative border-2 border-dashed rounded-2xl p-12 transition-all duration-300
            ${isDragging 
              ? "border-primary bg-primary/5 scale-105" 
              : "border-border bg-card hover:border-primary/50 hover:bg-card/80"
            }
            ${isProcessing ? "pointer-events-none opacity-60" : "cursor-pointer"}
          `}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={onFileSelect}
            disabled={isProcessing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="flex flex-col items-center gap-4">
            {isProcessing ? (
              <>
                <div className="bg-primary/10 p-4 rounded-full animate-pulse">
                  <FileText className="h-12 w-12 text-primary" />
                </div>
                <p className="text-lg font-medium">Processing your PDF...</p>
                <Progress value={progress} className="w-full max-w-xs" />
                <p className="text-sm text-muted-foreground">{Math.round(progress)}%</p>
              </>
            ) : (
              <>
                <div className="bg-gradient-hero p-4 rounded-full">
                  <Upload className="h-12 w-12 text-primary-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-medium mb-1">Drop your PDF here</p>
                  <p className="text-sm text-muted-foreground">or click to browse</p>
                </div>
                <Button variant="secondary" size="lg" className="mt-2">
                  Choose File
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="mt-6 p-4 bg-accent/10 border border-accent/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
          <div className="text-sm text-foreground/90">
            <p className="font-medium mb-1">Supported files:</p>
            <p className="text-muted-foreground">PDF documents with selectable text (up to 100MB)</p>
          </div>
        </div>
      </div>
    </div>
  );
};
