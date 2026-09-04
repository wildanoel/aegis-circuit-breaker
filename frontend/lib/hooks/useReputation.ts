"use client";

import { useQuery } from "@tanstack/react-query";
import { useAegisContract } from "./useAegis";

/**
 * Fetch on-chain reporter reputation for an address.
 * Reputation accrues from confirmed exploit findings, weighted by severity.
 */
export function useReputation(address: string | null) {
  const contract = useAegisContract();
  return useQuery<number, Error>({
    queryKey: ["aegis-reputation", address],
    queryFn: () => (contract && address ? contract.getReputation(address) : Promise.resolve(0)),
    refetchOnWindowFocus: true,
    staleTime: 2000,
    enabled: !!address && !!contract,
  });
}
