import { useCallback, useState } from "react";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import * as pdfjsLib from "pdfjs-dist";

// Configure PDF.js worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.mjs",
  import.meta.url
).toString();

interface FileUploadProps {
  onTextExtracted: (text: string) => void;
  isProcessing: boolean;
  setIsProcessing: (value: boolean) => void;
}

export const FileUpload = ({ onTextExtracted, isProcessing, setIsProcessing }: FileUploadProps) => {
  const { toast } = useToast();
  const [isDragging, setIsDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [googleDriveLink, setGoogleDriveLink] = useState("");

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

  const handleGoogleDriveLink = async () => {
    if (!googleDriveLink.trim()) {
      toast({
        title: "Invalid link",
        description: "Please enter a valid Google Drive link",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      // Extract file ID from Google Drive link
      const fileIdMatch = googleDriveLink.match(/[-\w]{25,}/);
      if (!fileIdMatch) {
        throw new Error("Invalid Google Drive link format");
      }

      const fileId = fileIdMatch[0];
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

      setProgress(30);

      // Fetch the PDF from Google Drive
      const response = await fetch(downloadUrl);
      if (!response.ok) {
        throw new Error("Failed to download PDF from Google Drive");
      }

      const blob = await response.blob();
      const file = new File([blob], "document.pdf", { type: "application/pdf" });

      setProgress(50);
      await extractTextFromPDF(file);
      setGoogleDriveLink("");
    } catch (error) {
      console.error("Error fetching from Google Drive:", error);
      toast({
        title: "Error",
        description: "Failed to load PDF from Google Drive. Make sure the file is publicly accessible.",
        variant: "destructive",
      });
      setIsProcessing(false);
      setProgress(0);
    }
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

        <div className="mt-6 space-y-4">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Google Drive Link</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={googleDriveLink}
                onChange={(e) => setGoogleDriveLink(e.target.value)}
                placeholder="Paste your Google Drive link here"
                disabled={isProcessing}
                className="flex-1 px-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <Button
                onClick={handleGoogleDriveLink}
                disabled={isProcessing || !googleDriveLink.trim()}
                variant="secondary"
              >
                Load PDF
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Make sure the file is set to "Anyone with the link can view"
            </p>
          </div>

          <div className="p-4 bg-accent/10 border border-accent/20 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-accent flex-shrink-0 mt-0.5" />
            <div className="text-sm text-foreground/90">
              <p className="font-medium mb-1">Supported sources:</p>
              <p className="text-muted-foreground">
                • PDF documents with selectable text (up to 100MB)<br />
                • Google Drive links (file must be publicly accessible)
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
