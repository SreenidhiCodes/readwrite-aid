import { useState } from "react";
import { MessageSquare, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export const FeedbackBox = () => {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !email.trim() || !message.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-feedback`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ name, email, message }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to send feedback");
      }

      toast({
        title: "Feedback Sent!",
        description: "Thank you for your suggestions. We'll review it soon.",
      });

      // Reset form
      setName("");
      setEmail("");
      setMessage("");
    } catch (error) {
      console.error("Error sending feedback:", error);
      toast({
        title: "Error",
        description: "Failed to send feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="p-6 bg-gradient-card backdrop-blur-sm border-border shadow-medium hover:shadow-large transition-shadow">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MessageSquare className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-bold">Send Us Your Suggestions</h3>
        </div>

        <p className="text-sm text-muted-foreground">
          Have ideas to improve our app? We'd love to hear from you!
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-semibold">
              Your Name
            </label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="h-12 rounded-xl border-2"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-semibold">
              Your Email
            </label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl border-2"
              disabled={isSubmitting}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="message" className="text-sm font-semibold">
              Your Message
            </label>
            <Textarea
              id="message"
              placeholder="Share your suggestions, ideas, or feedback..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="min-h-[120px] rounded-xl border-2 resize-none"
              disabled={isSubmitting}
            />
          </div>

          <Button
            type="submit"
            size="lg"
            className="w-full bg-gradient-hero hover:shadow-glow font-semibold rounded-xl transition-all hover:scale-105"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-5 w-5 mr-2" />
                Send Feedback
              </>
            )}
          </Button>
        </form>
      </div>
    </Card>
  );
};
