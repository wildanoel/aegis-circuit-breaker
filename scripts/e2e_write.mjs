// E2E WRITE verification against deployed Aegis (chain 61997) via genlayer-js
// - the exact library + call pattern the frontend uses (explicit fees,
// plain-object reads, waitUntil finalized). Usage:
//   node scripts/e2e_write.mjs            (PK from ~/.hermes/secrets/aegis_deployer.pk)
//   AEGIS_DEPLOYER_PK=0x... node scripts/e2e_write.mjs
// Registers a throwaway target + submits a benign report; expected result:
// report status "rejected" (AI verdict gate working). Costs ~0.0001 GEN.
import { readFileSync } from "node:fs";
import { createClient, createAccount, chains } from "genlayer-js";

const RPC = "https://studio-dev.genlayer.com/api";
const ADDR = process.env.AEGIS_CONTRACT || "0xB0C0799099f8C52c1B39972A5945C6757E9c9815";
const pk = (process.env.AEGIS_DEPLOYER_PK ||
  readFileSync(`${process.env.HOME}/.hermes/secrets/aegis_deployer.pk`, "utf8")).trim();

const chain = {
  ...chains.studionet,
  id: 61997,
  name: "GenLayer Studio Dev",
  rpcUrls: { ...chains.studionet.rpcUrls, default: { http: [RPC] } },
};

const account = createAccount(pk);
const client = createClient({ chain, account, endpoint: RPC });

// Live fee estimate (appealRounds 0) - same path as frontend resolveWriteFees().
const est = await client.estimateTransactionFees({ appealRounds: 0n, rotations: [0n] });
if (!est?.distribution || !(BigInt(est.feeValue ?? 0) > 0n)) {
  console.error("fee estimator returned no usable fees:", est);
  process.exit(2);
}
const fees = { distribution: est.distribution, feeValue: est.feeValue };

async function waitFinal(hash, label) {
  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 8000));
    const t = await client.getTransaction({ hash });
    const s = String(t?.txExecutionResultName ?? "");
    console.log(`[${label}] ${s || t?.status || "?"}`);
    if (s === "FINISHED_WITH_RETURN") return t;
    if (s.includes("ERROR")) {
      for (const v of t?.consensus_data?.validators ?? []) {
        if (v?.genvm_result?.stderr) console.log("stderr:", String(v.genvm_result.stderr).slice(0, 400));
      }
      process.exit(1);
    }
  }
  console.error(`[${label}] TIMEOUT`);
  process.exit(1);
}

// unique throwaway target per run so re-runs don't collide
const suffix = String(Date.now()).slice(-8).padEnd(40, "0");
const TARGET = "0x" + suffix;

console.log("account:", account.address, "target:", TARGET);
const h1 = await client.writeContract({
  address: ADDR, functionName: "register_protection",
  args: [TARGET, "E2E Smoke", "https://aegis.test/e2e"], fees,
});
console.log("tx1:", h1);
await waitFinal(h1, "register_protection");

const h2 = await client.writeContract({
  address: ADDR, functionName: "submit_report",
  args: [TARGET, "https://example.com", "Test finding: benign page"], fees,
});
console.log("tx2:", h2);
await waitFinal(h2, "submit_report");

const stats = await client.readContract({ address: ADDR, functionName: "get_stats", args: [] });
console.log("STATS:", JSON.stringify(stats, (k, v) => (typeof v === "bigint" ? String(v) : v)));
const protos = await client.readContract({ address: ADDR, functionName: "get_protocols", args: [] });
console.log("TARGET REGISTERED:", TARGET in protos ? "yes" : "NO");
