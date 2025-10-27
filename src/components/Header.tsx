import { BookOpen } from "lucide-react";

export const Header = () => {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 max-w-6xl">
        <div className="flex items-center gap-3">
          <div className="bg-gradient-hero p-2.5 rounded-xl">
            <BookOpen className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold bg-gradient-hero bg-clip-text text-transparent">
              ReadRight
            </h1>
            <p className="text-xs text-muted-foreground">Your intelligent reading assistant</p>
          </div>
        </div>
      </div>
    </header>
  );
};
