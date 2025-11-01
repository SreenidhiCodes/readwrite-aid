import { useCallback, useState } from "react";
import { Upload, FileText, AlertCircle, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import * as pdfjsLib from "pdfjs-dist";
import { createWorker } from "tesseract.js";

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

  const preprocessImage = (canvas: HTMLCanvasElement): HTMLCanvasElement => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;

    // Auto contrast boost + noise removal
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
      
      // Increase contrast
      const contrast = 1.5;
      let adjusted = ((avg - 128) * contrast) + 128;
      
      // Apply threshold for noise removal
      adjusted = adjusted > 140 ? 255 : adjusted < 100 ? 0 : adjusted;
      
      data[i] = data[i + 1] = data[i + 2] = adjusted;
    }

    ctx.putImageData(imageData, 0, 0);
    return canvas;
  };

  const correctTextWithAI = async (rawText: string): Promise<string> => {
    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/correct-ocr-text`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ text: rawText }),
      });

      if (!response.ok) {
        console.error("AI correction failed, using raw text");
        return rawText;
      }

      const { correctedText } = await response.json();
      return correctedText || rawText;
    } catch (error) {
      console.error("Error correcting text:", error);
      return rawText;
    }
  };

  const extractTextFromPDF = async (file: File) => {
    setIsProcessing(true);
    setProgress(10);

    try {
      const arrayBuffer = await file.arrayBuffer();
      setProgress(20);
      
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      setProgress(30);
      
      let fullText = "";
      const totalPages = pdf.numPages;

      // First, try to extract embedded text
      for (let i = 1; i <= totalPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(" ");
        fullText += pageText + "\n\n";
        setProgress(30 + (i / totalPages) * 15);
      }

      // If no text found or very little text, use OCR
      if (fullText.trim().length < 50) {
        toast({
          title: "Using Advanced OCR",
          description: "Extracting text from handwritten and scanned documents...",
        });

        fullText = ""; // Reset text
        const worker = await createWorker("eng", 1, {
          logger: (m) => console.log(m),
        });
        
        await worker.setParameters({
          tessedit_pageseg_mode: '3',
          tessedit_ocr_engine_mode: '1',
          preserve_interword_spaces: '1',
          tessedit_char_whitelist: '',
        } as any);
        
        for (let i = 1; i <= totalPages; i++) {
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: 3.0 });
          
          const canvas = document.createElement("canvas");
          const context = canvas.getContext("2d");
          canvas.width = viewport.width;
          canvas.height = viewport.height;

          if (context) {
            await page.render({
              canvasContext: context,
              viewport: viewport,
              canvas: canvas,
            }).promise;

            preprocessImage(canvas);
            const imageData = canvas.toDataURL("image/png");
            const result = await worker.recognize(imageData, {
              rotateAuto: true,
            });

            const ocrData = result.data as any;
            const words = ocrData.words || [];
            const processedWords = words.map((word: any) => {
              if (word.confidence < 70) {
                return "[?]";
              }
              return word.text;
            }).join(" ");

            fullText += processedWords + "\n\n";
          }
          
          setProgress(45 + (i / totalPages) * 30);
        }

        await worker.terminate();
        setProgress(75);

        toast({
          title: "AI Text Correction",
          description: "Improving text accuracy with AI...",
        });
        
        fullText = await correctTextWithAI(fullText);
        setProgress(90);
      }

      if (!fullText.trim()) {
        throw new Error("Could not extract any text from PDF");
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
      const fileIdMatch = googleDriveLink.match(/[-\w]{25,}/);
      if (!fileIdMatch) {
        throw new Error("Invalid Google Drive link format");
      }

      const fileId = fileIdMatch[0];
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

      setProgress(30);

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
    <div className="flex items-center justify-center min-h-[70vh] animate-fade-in-up">
      <div className="w-full max-w-3xl">
        <div className="text-center mb-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded-full mb-4">
            <Sparkles className="h-4 w-4 text-primary animate-pulse" />
            <span className="text-sm font-semibold text-primary">AI-Powered OCR</span>
          </div>
          <h2 className="text-5xl font-extrabold bg-gradient-hero bg-clip-text text-transparent tracking-tight">
            Upload Your Document
          </h2>
          <p className="text-muted-foreground text-xl max-w-2xl mx-auto">
            Transform handwritten or printed PDFs into perfect audio with intelligent AI correction
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
            relative border-2 border-dashed rounded-3xl p-16 transition-all duration-300 bg-gradient-card backdrop-blur-sm
            ${isDragging 
              ? "border-primary shadow-glow scale-[1.02]" 
              : "border-border hover:border-primary/60 hover:shadow-medium"}
            ${isProcessing ? "pointer-events-none opacity-70" : "cursor-pointer"}
          `}
        >
          <input
            type="file"
            accept="application/pdf"
            onChange={onFileSelect}
            disabled={isProcessing}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="flex flex-col items-center gap-6">
            {isProcessing ? (
              <>
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-hero rounded-full blur-2xl opacity-50 animate-pulse" />
                  <div className="relative p-8 bg-gradient-hero/20 rounded-full ring-4 ring-primary/30 animate-pulse-glow">
                    <FileText className="h-16 w-16 text-primary animate-pulse" />
                  </div>
                </div>
                <div className="space-y-4 w-full max-w-md">
                  <p className="text-2xl font-bold text-foreground">Processing...</p>
                  <Progress value={progress} className="w-full h-4 shadow-soft" />
                  <div className="flex items-center justify-center gap-3">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                    </div>
                    <p className="text-lg text-muted-foreground font-semibold">{Math.round(progress)}%</p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-hero rounded-full blur-3xl opacity-40 group-hover:opacity-60 transition-opacity" />
                  <div className="relative p-10 bg-gradient-hero/10 rounded-full ring-4 ring-primary/20 group-hover:ring-primary/40 transition-all group-hover:scale-105">
                    <Upload className="h-20 w-20 text-primary" />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <p className="text-2xl font-bold text-foreground">Drop your PDF here</p>
                  <p className="text-muted-foreground text-lg">or click to browse files (up to 100MB)</p>
                </div>
                <Button size="lg" className="px-10 py-7 text-lg font-bold bg-gradient-hero hover:shadow-glow rounded-2xl transition-all hover:scale-105 shadow-medium">
                  <FileText className="h-6 w-6 mr-3" />
                  Choose File
                </Button>
                <div className="flex items-center gap-5 pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Sparkles className="h-5 w-5 text-primary" />
                    <span className="font-medium">Handwriting Support</span>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="font-medium">AI Text Correction</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-8 space-y-5">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t-2 border-border" />
            </div>
            <div className="relative flex justify-center text-sm uppercase">
              <span className="bg-background px-4 text-muted-foreground font-semibold">Or Use Google Drive</span>
            </div>
          </div>

          <div className="space-y-3 bg-gradient-card p-6 rounded-2xl border-2 border-border shadow-soft">
            <label className="text-base font-semibold text-foreground">Google Drive Link</label>
            <div className="flex gap-3">
              <input
                type="text"
                value={googleDriveLink}
                onChange={(e) => setGoogleDriveLink(e.target.value)}
                placeholder="Paste your Google Drive link here"
                disabled={isProcessing}
                className="flex-1 px-5 py-3 rounded-xl border-2 border-input bg-background text-base focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary transition-all font-medium"
              />
              <Button
                onClick={handleGoogleDriveLink}
                disabled={isProcessing || !googleDriveLink.trim()}
                size="lg"
                variant="secondary"
                className="px-6 rounded-xl font-semibold hover:scale-105 transition-all"
              >
                Load PDF
              </Button>
            </div>
            <p className="text-sm text-muted-foreground font-medium">
              Make sure the file is set to "Anyone with the link can view"
            </p>
          </div>

          <div className="p-6 bg-accent/10 border-2 border-accent/20 rounded-2xl flex items-start gap-4 shadow-soft">
            <div className="p-2 bg-accent/20 rounded-lg flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-accent" />
            </div>
            <div className="text-sm text-foreground space-y-2">
              <p className="font-bold text-base">What we support:</p>
              <ul className="space-y-1 text-muted-foreground font-medium">
                <li>• PDF documents - text-based or scanned/handwritten (up to 100MB)</li>
                <li>• Advanced OCR for extracting text from images and scanned documents</li>
                <li>• Google Drive links (file must be publicly accessible)</li>
                <li>• AI-powered text correction for perfect accuracy</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
