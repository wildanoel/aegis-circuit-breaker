"use client";

import { useState } from "react";
import { Search, Loader2, OctagonPause, ShieldCheck, AlertCircle } from "lucide-react";
import { useIsHalted } from "@/lib/hooks/useAegis";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";

/**
 * Live halt-state checker. Calls the same is_halted(target) view that a
 * protected protocol calls in its own code before every state-changing
 * operation. Anyone can paste any address and see the authoritative answer
 * from the Aegis contract, in real time.
 */
export function HaltChecker() {
  const [input, setInput] = useState("");
  const [target, setTarget] = useState<string | null>(null);
  const { data: halted, isFetching, error } = useIsHalted(target);

  const valid = /^0x[0-9a-fA-F]{40}$/.test(input.trim());

  const handleCheck = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setTarget(input.trim());
  };

  const result =
    target && !isFetching && !error ? (
      <div
        className={`mt-4 rounded-lg border p-4 flex items-center gap-3 ${
          halted
            ? "border-destructive/40 bg-destructive/10"
            : "border-success/30 bg-success/5"
        }`}
      >
        {halted ? (
          <>
            <OctagonPause className="w-5 h-5 text-destructive shrink-0" />
            <div>
              <div className="font-semibold text-destructive">HALTED</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                A confirmed exploit armed the halt for this address. Protected
                protocols reading is_halted() must refuse to operate.
              </div>
            </div>
          </>
        ) : (
          <>
            <ShieldCheck className="w-5 h-5 text-success shrink-0" />
            <div>
              <div className="font-semibold text-success">Not halted</div>
              <div className="text-xs text-muted-foreground mt-0.5">
                No confirmed exploit halt is armed against this address.
              </div>
            </div>
          </>
        )}
      </div>
    ) : target && error ? (
      <div className="mt-4 rounded-lg border border-border p-4 flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-warning shrink-0" />
        <div className="text-sm text-muted-foreground">
          Could not read the halt state. The network may be busy; try again.
        </div>
      </div>
    ) : null;

  return (
    <div className="surface p-6">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-2">
        <Search className="w-5 h-5 text-accent" />
        Halt Checker
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Check the live halt state of any address. This is the exact
        <code className="mx-1 px-1 py-0.5 rounded bg-muted/30">is_halted()</code>
        call protected protocols make before operating.
      </p>
      <form onSubmit={handleCheck} className="flex gap-2">
        <Input
          placeholder="0x..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="font-mono"
          aria-label="Target address"
        />
        <Button type="submit" variant="default" disabled={!valid || isFetching}>
          {isFetching ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Search className="w-4 h-4" />
          )}
          Check
        </Button>
      </form>
      {input.trim() !== "" && !valid && (
        <p className="mt-2 text-xs text-warning">
          Enter a full 20-byte address (0x + 40 hex characters).
        </p>
      )}
      {result}
      {target && !isFetching && !error && (
        <div className="mt-3 text-xs text-muted-foreground flex items-center gap-2">
          <Badge variant="secondary" className="uppercase">
            {halted ? "halted" : "clear"}
          </Badge>
          <span className="font-mono">{target}</span>
        </div>
      )}
    </div>
  );
}
