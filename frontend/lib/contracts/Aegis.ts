import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import type { Protocol, Report, AegisStats, TransactionReceipt } from "./types";

/**
 * Aegis contract client - the autonomous exploit-response circuit breaker.
 */
class Aegis {
  private contractAddress: `0x${string}`;
  private client: any;
  private studioUrl?: string;

  constructor(contractAddress: string, address?: string | null, studioUrl?: string) {
    this.contractAddress = contractAddress as `0x${string}`;
    this.studioUrl = studioUrl;
    this.client = this.buildClient(address);
  }

  private buildClient(address?: string | null) {
    const config: any = { chain: studionet };
    if (address) config.account = address as `0x${string}`;
    if (this.studioUrl) config.endpoint = this.studioUrl;
    return createClient(config);
  }

  updateAccount(address: string): void {
    this.client = this.buildClient(address);
  }

  private mapToObj(entry: any): Record<string, any> {
    if (entry instanceof Map) {
      return Array.from(entry.entries()).reduce((obj: any, [k, v]: any) => {
        obj[k] = v instanceof Map ? this.mapToObj(v) : v;
        return obj;
      }, {});
    }
    return entry;
  }

  // ---------------- Views ----------------

  async getStats(): Promise<AegisStats | null> {
    try {
      const raw = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_stats",
        args: [],
      });
      const o = this.mapToObj(raw);
      return {
        guardian: o.guardian,
        base_bounty: Number(o.base_bounty),
        protocols: Number(o.protocols),
        reports: Number(o.reports),
        confirmed: Number(o.confirmed),
        halted: Number(o.halted),
      };
    } catch (e) {
      console.error("getStats failed", e);
      return null;
    }
  }

  async getProtocols(): Promise<Protocol[]> {
    try {
      const raw: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_protocols",
        args: [],
      });
      if (raw instanceof Map) {
        return Array.from(raw.entries()).map(([target, data]: any) => {
          const o = this.mapToObj(data);
          return {
            target,
            label: o.label,
            docs_url: o.docs_url,
            halted: Boolean(o.halted),
            halt_report_id: Number(o.halt_report_id),
            registered_by: o.registered_by,
          } as Protocol;
        });
      }
      return [];
    } catch (e) {
      console.error("getProtocols failed", e);
      return [];
    }
  }

  async getReports(): Promise<Report[]> {
    try {
      const raw: any = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_reports",
        args: [],
      });
      if (Array.isArray(raw)) {
        return raw.map((r: any) => this.mapToObj(r) as Report);
      }
      return [];
    } catch (e) {
      console.error("getReports failed", e);
      return [];
    }
  }

  async isHalted(target: string): Promise<boolean> {
    try {
      return Boolean(
        await this.client.readContract({
          address: this.contractAddress,
          functionName: "is_halted",
          args: [target],
        })
      );
    } catch {
      return false;
    }
  }

  async getReputation(reporter: string): Promise<number> {
    try {
      const r = await this.client.readContract({
        address: this.contractAddress,
        functionName: "get_reputation",
        args: [reporter],
      });
      return Number(r) || 0;
    } catch {
      return 0;
    }
  }

  // ---------------- Writes ----------------

  private async send(functionName: string, args: any[], value = BigInt(0)): Promise<TransactionReceipt> {
    const txHash = await this.client.writeContract({
      address: this.contractAddress,
      functionName,
      args,
      value,
    });
    const receipt = await this.client.waitForTransactionReceipt({
      hash: txHash,
      status: "ACCEPTED" as any,
      retries: 30,
      interval: 5000,
    });
    return receipt as TransactionReceipt;
  }

  async registerProtection(target: string, label: string, docsUrl: string) {
    return this.send("register_protection", [target, label, docsUrl]);
  }

  async submitReport(target: string, evidenceUrl: string, title: string) {
    return this.send("submit_report", [target, evidenceUrl, title]);
  }

  async fundPool(amountWei: bigint) {
    return this.send("fund_pool", [], amountWei);
  }

  async clearHalt(target: string) {
    return this.send("clear_halt", [target]);
  }

  async claimBounty() {
    return this.send("claim_bounty", []);
  }
}

export default Aegis;
