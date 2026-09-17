"use client";

import { studionet } from "genlayer-js/chains";

/**
 * Build the GenLayer chain object for the SDK client from environment variables.
 *
 * genlayer-js `studionet` defaults to the shared Studio network (id 61999,
 * https://studio.genlayer.com/api). When the app is deployed against a
 * different Studio instance (e.g. the Studio Dev chain, id 61997 at
 * https://studio-dev.genlayer.com/api), we clone the shipped chain definition
 * and override only id / name / rpcUrls. Everything else (contract ABIs,
 * consensus data contract address, formatters, fees) is identical across
 * Studio instances and must not be hand-rolled.
 */
export const GENLAYER_CHAIN_ID = parseInt(
  process.env.NEXT_PUBLIC_GENLAYER_CHAIN_ID || "61999",
  10
);

/** Explorer base URL for the deployed chain. */
export const EXPLORER_URL =
  process.env.NEXT_PUBLIC_EXPLORER_URL ||
  "https://explorer-studio.genlayer.com";

export function explorerAddress(address: string): string {
  return `${EXPLORER_URL}/address/${address}`;
}

export function explorerTx(hash: string): string {
  return `${EXPLORER_URL}/tx/${hash}`;
}

export function getChain() {
  const rpcUrl =
    process.env.NEXT_PUBLIC_GENLAYER_RPC_URL || "https://studio.genlayer.com/api";
  const chainName =
    process.env.NEXT_PUBLIC_GENLAYER_CHAIN_NAME || "GenLayer Studio";

  if (
    GENLAYER_CHAIN_ID === studionet.id &&
    rpcUrl === studionet.rpcUrls.default.http[0]
  ) {
    return studionet;
  }

  const overridden = {
    ...studionet,
    id: GENLAYER_CHAIN_ID,
    name: chainName,
    rpcUrls: {
      ...studionet.rpcUrls,
      default: { http: [rpcUrl] },
    },
  };
  return overridden;
}
