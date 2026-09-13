"use client";

import { AccountPanel } from "./AccountPanel";
import { SubmitReportModal } from "./SubmitReportModal";
import { ThemeToggle } from "./ThemeToggle";
import { LogoMark } from "./Logo";

export function Navbar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 md:px-6">
        <div className="flex items-center gap-3">
          <LogoMark size="md" />
          <span className="text-lg font-semibold tracking-tight">Aegis</span>
          <span className="hidden text-sm text-muted-foreground sm:inline">
            Exploit circuit breaker
          </span>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <SubmitReportModal />
          <AccountPanel />
        </div>
      </div>
    </header>
  );
}
