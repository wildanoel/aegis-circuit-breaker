// E2E verification against deployed Aegis (chain 61997) via genlayer-js —
// same library + call pattern the frontend uses.
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const RPC = "https://studio-dev.genlayer.com/api";
const ADDR = "0xB0C0799099f8C52c1B39972A5945C6757E9c9815";

const chain = {
  ...studionet,
  id: 61997,
  name: "GenLayer Studio Dev",
  rpcUrls: { ...studionet.rpcUrls, default: { http: [RPC] } },
};

const client = createClient({ chain, endpoint: RPC });

function toObj(entry) {
  if (entry instanceof Map) {
    const o = {};
    for (const [k, v] of entry.entries()) o[k] = toObj(v);
    return o;
  }
  if (Array.isArray(entry)) return entry.map(toObj);
  return entry;
}

console.log("== get_stats");
console.log(toObj(await client.readContract({ address: ADDR, functionName: "get_stats" })));
console.log("== get_protocols");
console.log(toObj(await client.readContract({ address: ADDR, functionName: "get_protocols" })));
console.log("== get_reports");
console.log(JSON.stringify(toObj(await client.readContract({ address: ADDR, functionName: "get_reports" })), null, 1).slice(0, 900));
