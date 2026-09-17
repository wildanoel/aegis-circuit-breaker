"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import Aegis from "../contracts/Aegis";
import { getContractAddress, getStudioUrl } from "../genlayer/client";
import { useWallet } from "../genlayer/wallet";
import { success, error, configError } from "../utils/toast";
import type { Protocol, Report, AegisStats } from "../contracts/types";

export function useAegisContract(): Aegis | null {
  const { address } = useWallet();
  const contractAddress = getContractAddress();
  const studioUrl = getStudioUrl();

  return useMemo(() => {
    if (!contractAddress) {
      configError(
        "Setup Required",
        "Contract address not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS in your .env file."
      );
      return null;
    }
    return new Aegis(contractAddress, address, studioUrl);
  }, [contractAddress, address, studioUrl]);
}

export function useStats() {
  const contract = useAegisContract();
  return useQuery<AegisStats | null, Error>({
    queryKey: ["aegis-stats"],
    queryFn: () => (contract ? contract.getStats() : Promise.resolve(null)),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

export function useProtocols() {
  const contract = useAegisContract();
  return useQuery<Protocol[], Error>({
    queryKey: ["aegis-protocols"],
    queryFn: () => (contract ? contract.getProtocols() : Promise.resolve([])),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

export function useReports() {
  const contract = useAegisContract();
  return useQuery<Report[], Error>({
    queryKey: ["aegis-reports"],
    queryFn: () => (contract ? contract.getReports() : Promise.resolve([])),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!contract,
  });
}

/**
 * Live halt-state lookup for any address. This is the exact call a protected
 * protocol makes in its own code path: is_halted(target) -> pause.
 */
export function useIsHalted(target: string | null) {
  const contract = useAegisContract();
  return useQuery<boolean, Error>({
    queryKey: ["aegis-halted", target],
    queryFn: () => (contract && target ? contract.isHalted(target) : Promise.resolve(false)),
    enabled: !!contract && !!target && /^0x[0-9a-fA-F]{40}$/.test(target),
    staleTime: 2000,
    retry: 1,
  });
}

function useInvalidateAll() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["aegis-stats"] });
    queryClient.invalidateQueries({ queryKey: ["aegis-protocols"] });
    queryClient.invalidateQueries({ queryKey: ["aegis-reports"] });
  };
}

export function useRegisterProtection() {
  const contract = useAegisContract();
  const { address } = useWallet();
  const invalidate = useInvalidateAll();
  const [isPending, setIsPending] = useState(false);

  const mutation = useMutation({
    mutationFn: async (p: { target: string; label: string; docsUrl: string }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Connect your wallet first.");
      setIsPending(true);
      return contract.registerProtection(p.target, p.label, p.docsUrl);
    },
    onSuccess: () => {
      invalidate();
      setIsPending(false);
      success("Protocol registered", { description: "It is now under Aegis protection." });
    },
    onError: (err: any) => {
      setIsPending(false);
      error("Registration failed", { description: err?.message ?? "Try again." });
    },
  });

  return { ...mutation, isPending, register: mutation.mutate };
}

export function useSubmitReport() {
  const contract = useAegisContract();
  const { address } = useWallet();
  const invalidate = useInvalidateAll();
  const [isPending, setIsPending] = useState(false);

  const mutation = useMutation({
    mutationFn: async (p: { target: string; evidenceUrl: string; title: string }) => {
      if (!contract) throw new Error("Contract not configured.");
      if (!address) throw new Error("Connect your wallet first.");
      setIsPending(true);
      return contract.submitReport(p.target, p.evidenceUrl, p.title);
    },
    onSuccess: () => {
      invalidate();
      setIsPending(false);
      success("Report adjudicated", {
        description: "Validators reached consensus on your report.",
      });
    },
    onError: (err: any) => {
      setIsPending(false);
      error("Submission failed", { description: err?.message ?? "Try again." });
    },
  });

  return { ...mutation, isPending, submit: mutation.mutate };
}
