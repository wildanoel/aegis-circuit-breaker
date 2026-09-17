"use client";

export type FeePresetLevel = "low" | "standard" | "high";

export type FeePresetEstimate = {
  level: FeePresetLevel;
  estimate?: {
    distribution?: Record<string, unknown>;
    messageAllocations?: Record<string, unknown>[];
    feeValue?: bigint | number | string;
    fee_value?: bigint | number | string;
    observed?: Record<string, unknown>;
  };
  observed?: Record<string, unknown>;
};

const PRESET_OPTIONS: Record<FeePresetLevel, Record<string, unknown>> = {
  low: {
    appealRounds: 0n,
    rotations: [0n],
  },
  standard: {
    appealRounds: 1n,
    rotations: [0n, 0n],
  },
  high: {
    appealRounds: 2n,
    rotations: [0n, 0n, 0n],
  },
};

function transactionFeesFromEstimate(estimate: FeePresetEstimate["estimate"]) {
  if (!estimate?.distribution) return undefined;

  const fees: Record<string, unknown> = {
    distribution: estimate.distribution,
  };

  if (estimate.messageAllocations) {
    fees.messageAllocations = estimate.messageAllocations;
  }

  const feeValue = estimate.feeValue ?? estimate.fee_value;
  if (feeValue !== undefined) {
    fees.feeValue = feeValue;
  }

  return fees;
}

export function feePresetToTransactionFees(preset?: FeePresetEstimate) {
  return transactionFeesFromEstimate(preset?.estimate);
}

export async function estimateWriteFeePreset(
  client: any,
  request: {
    address: `0x${string}`;
    functionName: string;
    args: unknown[];
    value?: bigint;
  },
  level: FeePresetLevel = "standard",
): Promise<FeePresetEstimate | undefined> {
  if (typeof client?.estimateTransactionFees !== "function") {
    return undefined;
  }

  const options = PRESET_OPTIONS[level];
  const initialEstimate = await client.estimateTransactionFees(options);
  let estimate = initialEstimate;

  if (
    typeof client.simulateWriteContract === "function" &&
    typeof client.estimateTransactionFeesFromSimulation === "function"
  ) {
    const simulation = await client.simulateWriteContract({
      ...request,
      includeReceipt: true,
      value: request.value ?? 0n,
      fees: transactionFeesFromEstimate(initialEstimate),
    });

    estimate = await client.estimateTransactionFeesFromSimulation({
      ...options,
      simulation,
    });
  }

  return {
    level,
    estimate,
    observed: estimate?.observed,
  };
}

/**
 * Fee set verified working on studio-dev (chain 61997) via E2E writes on the
 * deployed Aegis contract. Used whenever live estimation is unavailable.
 */
export const STUDIO_DEV_FALLBACK_FEES = {
  distribution: {
    leaderTimeunitsAllocation: 300,
    validatorTimeunitsAllocation: 300,
    appealRounds: 0,
    executionBudgetPerRound: 100_000_000_000_000,
    executionConsumed: 0,
    totalMessageFees: 0,
    rotations: [0],
    maxPriceGenPerTimeUnit: 2,
    storageFeeMaxGasPrice: 300_000_000,
    receiptFeeMaxGasPrice: 300_000_000,
  },
  feeValue: "10000000000002588",
};

/**
 * Resolve explicit fees for a write. studio-dev rejects the SDK's implicit
 * auto-fee path with FeeValueMustBeNonZero(1) at consensus time, so every
 * writeContract call must carry a fees object. Prefer live estimation
 * (appealRounds 0 preset = the shape verified in E2E); fall back to the
 * hardcoded verified set on any gap.
 */
export async function resolveWriteFees(client: any): Promise<Record<string, unknown>> {
  try {
    if (typeof client?.estimateTransactionFees === "function") {
      const est = await client.estimateTransactionFees({
        appealRounds: 0n,
        rotations: [0n],
      });
      const feeValue = est?.feeValue ?? est?.fee_value;
      if (est?.distribution && feeValue !== undefined && BigInt(feeValue) > 0n) {
        return { distribution: est.distribution, feeValue };
      }
    }
  } catch (e) {
    console.warn("fee estimation unavailable, using studio-dev fallback", e);
  }
  return { ...STUDIO_DEV_FALLBACK_FEES };
}
