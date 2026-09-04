"use client";

import { Shield, OctagonPause, ExternalLink } from "lucide-react";
import { useProtocols } from "@/lib/hooks/useAegis";
import { AddressDisplay } from "./AddressDisplay";
import { Badge } from "./ui/badge";
import { RegisterProtocolModal } from "./RegisterProtocolModal";

export function ProtocolsList() {
  const { data: protocols, isLoading } = useProtocols();

  return (
    <div className="glass-card p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Shield className="w-5 h-5 text-accent" />
          Protected Protocols
        </h2>
        <RegisterProtocolModal />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : !protocols || protocols.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No protocols registered yet. Be the first to opt in.
        </p>
      ) : (
        <div className="space-y-3">
          {protocols.map((p) => (
            <div
              key={p.target}
              className={`rounded-lg border p-4 transition-colors ${
                p.halted ? "border-red-500/40 bg-red-500/5" : "border-white/10 hover:border-white/20"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{p.label}</span>
                  {p.halted ? (
                    <Badge variant="destructive" className="gap-1">
                      <OctagonPause className="w-3 h-3" />
                      HALTED
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-emerald-400">
                      Operational
                    </Badge>
                  )}
                </div>
                {p.docs_url && (
                  <a
                    href={p.docs_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-accent"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
              <div className="mt-2 text-xs text-muted-foreground">
                <AddressDisplay address={p.target} maxLength={20} showCopy />
              </div>
              {p.halted && (
                <div className="mt-2 text-xs text-red-400">
                  Halt armed by report #{p.halt_report_id}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
