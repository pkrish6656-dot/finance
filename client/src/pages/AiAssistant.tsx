import { useState, useRef, useEffect } from "react";
import { useAiChat } from "@/hooks/use-ai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BotMessageSquare, Send, User, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
}

export default function AiAssistant() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "ai",
      content: "Hello! I'm your AutoFinance AI. I can analyze your spending, suggest budgets, or answer any finance questions you have. How can I help today?"
    }
  ]);
  const [input, setInput] = useState("");
  const chatMutation = useAiChat();
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || chatMutation.isPending) return;

    const userMessage: Message = { id: Date.now().toString(), role: "user", content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput("");

    chatMutation.mutate(userMessage.content, {
      onSuccess: (data) => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: data.response
        }]);
      },
      onError: () => {
        setMessages(prev => [...prev, {
          id: (Date.now() + 1).toString(),
          role: "ai",
          content: "Sorry, I'm having trouble connecting right now. Please try again later."
        }]);
      }
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto h-[calc(100vh-80px)] flex flex-col animate-in fade-in duration-500">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" /> AI Financial Assistant
        </h1>
        <p className="text-muted-foreground mt-1">Get personalized insights and advice instantly.</p>
      </div>

      <Card className="flex-1 border-border/50 shadow-lg rounded-3xl overflow-hidden flex flex-col bg-card/50 backdrop-blur-sm">
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6 max-w-3xl mx-auto pb-4">
            <AnimatePresence initial={false}>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex gap-4 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                    msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-blue-600 text-white"
                  }`}>
                    {msg.role === "user" ? <User className="w-5 h-5" /> : <BotMessageSquare className="w-5 h-5" />}
                  </div>
                  <div className={`px-5 py-4 rounded-3xl max-w-[80%] leading-relaxed ${
                    msg.role === "user" 
                      ? "bg-primary text-primary-foreground rounded-tr-sm" 
                      : "bg-muted/80 text-foreground border border-border/50 rounded-tl-sm"
                  }`}>
                    {msg.content}
                  </div>
                </motion.div>
              ))}
              {chatMutation.isPending && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-4"
                >
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <BotMessageSquare className="w-5 h-5" />
                  </div>
                  <div className="px-5 py-4 rounded-3xl bg-muted/80 text-foreground border border-border/50 rounded-tl-sm flex gap-2 items-center">
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0.2s]"></span>
                    <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0.4s]"></span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={scrollRef} />
          </div>
        </ScrollArea>

        <div className="p-4 bg-background border-t border-border/50">
          <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-3 relative">
            <Input 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your spending, budgets, or savings..."
              className="h-14 rounded-full pl-6 pr-14 text-base bg-muted/30 border-border shadow-sm focus-visible:ring-primary/20"
              disabled={chatMutation.isPending}
            />
            <Button 
              type="submit" 
              size="icon"
              className="absolute right-2 top-2 h-10 w-10 rounded-full hover-elevate shadow-md bg-primary hover:bg-primary/90"
              disabled={!input.trim() || chatMutation.isPending}
            >
              <Send className="w-4 h-4 ml-0.5" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  );
}
