import { BookOpen, Sparkles } from "lucide-react";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card/80 backdrop-blur-xl sticky top-0 z-50 shadow-soft">
      <div className="bg-gradient-glow absolute inset-0 pointer-events-none opacity-60" />
      <div className="container mx-auto px-4 py-5 max-w-7xl relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative group">
              <div className="absolute inset-0 bg-gradient-hero rounded-2xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
              <div className="relative bg-gradient-hero p-3 rounded-2xl shadow-medium transform group-hover:scale-105 transition-transform">
                <BookOpen className="h-7 w-7 text-primary-foreground" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-3xl font-extrabold bg-gradient-hero bg-clip-text text-transparent tracking-tight">
                  SWAR-VANI
                </h1>
                <Sparkles className="h-5 w-5 text-primary animate-pulse" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Transform handwriting into speech</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
