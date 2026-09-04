export interface Protocol {
  target: string;
  label: string;
  docs_url: string;
  halted: boolean;
  halt_report_id: number;
  registered_by: string;
}

export interface Report {
  id: number;
  reporter: string;
  target: string;
  evidence_url: string;
  title: string;
  status: "pending" | "confirmed" | "rejected";
  severity: "critical" | "high" | "medium" | "low";
  confidence: number;
  reason: string;
  bounty_paid: number;
}

export interface AegisStats {
  guardian: string;
  base_bounty: number;
  protocols: number;
  reports: number;
  confirmed: number;
  halted: number;
}

export interface TransactionReceipt {
  hash?: string;
  status?: string | number;
  statusName?: string;
  [key: string]: unknown;
}
