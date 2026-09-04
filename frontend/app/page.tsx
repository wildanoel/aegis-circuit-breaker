"use client";

import { Navbar } from "@/components/Navbar";
import { StatsBar } from "@/components/StatsBar";
import { ProtocolsList } from "@/components/ProtocolsList";
import { ReportsFeed } from "@/components/ReportsFeed";
import { ShieldCheck } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-grow pt-20 pb-12 px-4 md:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Hero */}
          <div className="text-center mb-10 animate-fade-in">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 text-xs text-muted-foreground mb-4">
              <ShieldCheck className="w-3.5 h-3.5 text-accent" />
              Autonomous Protocols · GenLayer Intelligent Contract
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
              The autonomous exploit
              <br />
              circuit breaker
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              Anyone reports an exploit. GenLayer validators independently verify the
              evidence and reach consensus. Confirmed exploits autonomously halt the
              target protocol and pay the reporter. No multisig, no trusted operator.
            </p>
          </div>

          {/* Stats */}
          <div className="mb-8 animate-slide-up">
            <StatsBar />
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-5 animate-slide-up">
              <ProtocolsList />
            </div>
            <div className="lg:col-span-7 animate-slide-up" style={{ animationDelay: "100ms" }}>
              <ReportsFeed />
            </div>
          </div>

          {/* How it works */}
          <div className="mt-8 glass-card p-6 md:p-8 animate-fade-in" style={{ animationDelay: "200ms" }}>
            <h2 className="text-2xl font-bold mb-4">How Aegis Works</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <div className="text-accent font-bold text-lg">1. Opt in</div>
                <p className="text-sm text-muted-foreground">
                  A protocol registers for protection. Its contract reads{" "}
                  <code>is_halted(target)</code> and pauses itself on a confirmed halt.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-accent font-bold text-lg">2. Report</div>
                <p className="text-sm text-muted-foreground">
                  Anyone submits an exploit report with a public evidence URL and a
                  target address.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-accent font-bold text-lg">3. Consensus</div>
                <p className="text-sm text-muted-foreground">
                  Validators independently fetch the evidence and re-judge it under the
                  Equivalence Principle. Fabricated claims fail consensus.
                </p>
              </div>
              <div className="space-y-2">
                <div className="text-accent font-bold text-lg">4. Autonomous response</div>
                <p className="text-sm text-muted-foreground">
                  A confirmed exploit arms the halt, pays a severity-scaled bounty, and
                  credits reporter reputation — with no human in the loop.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/10 py-3">
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <a href="https://genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
              Powered by GenLayer
            </a>
            <a href="https://studio.genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
              Studio
            </a>
            <a href="https://docs.genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-accent transition-colors">
              Docs
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
