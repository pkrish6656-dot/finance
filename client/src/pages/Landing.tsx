import { Button } from "@/components/ui/button";
import { CreditCard, TrendingUp, ShieldCheck, ArrowRight, Target } from "lucide-react";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none" />
      
      <header className="container mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="bg-primary text-primary-foreground p-2 rounded-xl">
            <CreditCard className="w-6 h-6" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">AutoFinance</span>
        </div>
        <Button 
          onClick={() => window.location.href = "/api/login"}
          variant="outline" 
          className="rounded-full px-6 font-medium hover-elevate"
        >
          Sign In
        </Button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center container mx-auto px-6 relative z-10 text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            Personal Finance Reimagined
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-foreground leading-[1.1] mb-6">
            Master your money with <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">intelligent insights.</span>
          </h1>
          
          <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
            Track spending, set smart budgets, monitor subscriptions, and reach your savings goals faster with our AI-powered financial assistant.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              onClick={() => window.location.href = "/api/login"}
              size="lg" 
              className="rounded-full px-8 py-6 text-lg font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all hover:-translate-y-0.5"
            >
              Get Started Free <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 max-w-5xl"
        >
          {[
            { icon: TrendingUp, title: "Smart Tracking", desc: "Automatically categorize and analyze your daily transactions." },
            { icon: Target, title: "Goal Setting", desc: "Set visual targets and watch your savings grow over time." },
            { icon: ShieldCheck, title: "Secure & Private", desc: "Bank-grade security ensures your financial data stays yours." }
          ].map((feature, i) => (
            <div key={i} className="bg-card p-6 rounded-3xl border border-border/50 shadow-xl shadow-black/5 flex flex-col items-center text-center hover:-translate-y-1 transition-transform duration-300">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary mb-4">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{feature.title}</h3>
              <p className="text-muted-foreground text-sm">{feature.desc}</p>
            </div>
          ))}
        </motion.div>
      </main>
    </div>
  );
}
