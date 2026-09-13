"use client";

import { useState, useEffect } from "react";
import { ShieldPlus, Loader2 } from "lucide-react";
import { useRegisterProtection } from "@/lib/hooks/useAegis";
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

export function RegisterProtocolModal() {
  const { isConnected, address, isLoading } = useWallet();
  const { register, isPending, isSuccess } = useRegisterProtection();

  const [isOpen, setIsOpen] = useState(false);
  const [target, setTarget] = useState("");
  const [label, setLabel] = useState("");
  const [docsUrl, setDocsUrl] = useState("");

  useEffect(() => {
    if (!isConnected && isOpen && !isPending) setIsOpen(false);
  }, [isConnected, isOpen, isPending]);

  useEffect(() => {
    if (isSuccess) {
      setTarget("");
      setLabel("");
      setDocsUrl("");
      setIsOpen(false);
    }
  }, [isSuccess]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !address) {
      error("Connect your wallet first");
      return;
    }
    if (!target.trim() || !label.trim()) {
      error("Target and label are required");
      return;
    }
    register({ target: target.trim(), label: label.trim(), docsUrl: docsUrl.trim() });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => setIsOpen(o)}>
      <DialogTrigger asChild>
        <Button variant="secondary" disabled={!isConnected || !address || isLoading}>
          <ShieldPlus className="w-4 h-4 mr-2" />
          Protect a Protocol
        </Button>
      </DialogTrigger>
      <DialogContent className="surface sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Register Protection</DialogTitle>
          <DialogDescription>
            Opt a protocol into the Aegis circuit breaker. Once registered, your
            contract reads <code>is_halted(target)</code> and pauses itself when a
            confirmed exploit arms the halt.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 mt-4">
          <div className="space-y-2">
            <Label htmlFor="ptarget">Target contract address</Label>
            <Input id="ptarget" placeholder="0x..." value={target} onChange={(e) => setTarget(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="plabel">Protocol name</Label>
            <Input id="plabel" placeholder="VaultX" value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="pdocs">Docs / site URL (optional)</Label>
            <Input id="pdocs" placeholder="https://vaultx.xyz" value={docsUrl} onChange={(e) => setDocsUrl(e.target.value)} />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => setIsOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" variant="default" className="flex-1" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Registering...
                </>
              ) : (
                "Register"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
