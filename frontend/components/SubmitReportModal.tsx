"use client";

import { useState, useEffect } from "react";
import { ShieldAlert, Loader2, Link as LinkIcon, Target } from "lucide-react";
import { useSubmitReport } from "@/lib/hooks/useAegis";
import { useWallet } from "@/lib/genlayer/wallet";
import { error } from "@/lib/utils/toast";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

export function SubmitReportModal({ defaultTarget }: { defaultTarget?: string }) {
  const { isConnected, address, isLoading } = useWallet();
  const { submit, isPending, isSuccess } = useSubmitReport();

  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState(defaultTarget ?? "");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (!isConnected && isOpen && !isPending) setIsOpen(false);
  }, [isConnected, isOpen, isPending]);

  useEffect(() => {
    if (isSuccess) {
      setEvidenceUrl("");
      setTitle("");
      setIsOpen(false);
    }
  }, [isSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      error("Connect your wallet first");
      return;
    }
    if (!target.trim() || !evidenceUrl.trim() || !title.trim()) {
      error("All fields are required");
      return;
    }
    submit({ target: target.trim(), evidenceUrl: evidenceUrl.trim(), title: title.trim() });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => setIsOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="default" disabled={!isConnected || !address || isLoading}>
          <ShieldAlert className="w-4 h-4 mr-2" />
          Report Exploit
        </Button>
      </DialogTrigger>
      <DialogContent className="surface sm:max-w-[540px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Report an Active Exploit</DialogTitle>
          <DialogDescription>
            Validators independently fetch your evidence and re-judge it under the
            Equivalence Principle. If consensus confirms the exploit, Aegis
            autonomously halts the target and pays your bounty.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="target" className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Target contract address
            </Label>
            <Input
              id="target"
              placeholder="0x..."
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">Report title</Label>
            <Input
              id="title"
              placeholder="Reentrancy in withdraw() drains the vault"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="evidence" className="flex items-center gap-2">
              <LinkIcon className="w-4 h-4" />
              Public evidence URL
            </Label>
            <Input
              id="evidence"
              placeholder="https://gist.github.com/.../poc.md"
              value={evidenceUrl}
              onChange={(e) => setEvidenceUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              A public page validators can independently fetch: a PoC, writeup, or
              on-chain trace. Vague or unverifiable claims are rejected by consensus.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setIsOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" variant="default" className="flex-1" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adjudicating...
                </>
              ) : (
                "Submit for Consensus"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
