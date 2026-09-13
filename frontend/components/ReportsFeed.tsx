"use client";

import { FileSearch, ExternalLink, CheckCircle2, XCircle } from "lucide-react";
import { useReports } from "@/lib/hooks/useAegis";
import { AddressDisplay } from "./AddressDisplay";
import { Badge } from "./ui/badge";
import type { Report } from "@/lib/contracts/types";

const SEVERITY_STYLE: Record<Report["severity"], string> = {
  critical: "bg-destructive/10 text-destructive border-destructive/40",
  high: "bg-warning/10 text-warning border-warning/40",
  medium: "bg-warning/10 text-warning border-warning/40",
  low: "bg-accent/10 text-accent border-accent/40",
};

function ReportRow({ r }: { r: Report }) {
  const confirmed = r.status === "confirmed";
  return (
    <div className="rounded-lg border border-border p-4 hover:border-border transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {confirmed ? (
            <CheckCircle2 className="w-4 h-4 text-success shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 text-muted-foreground shrink-0" />
          )}
          <span className="font-semibold truncate">{r.title}</span>
        </div>
        <Badge className={`border ${SEVERITY_STYLE[r.severity]} uppercase shrink-0`}>
          {r.severity}
        </Badge>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">{r.reason}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>
          Status:{" "}
          <span className={confirmed ? "text-success" : "text-foreground"}>{r.status}</span>
        </span>
        <span>Confidence: {r.confidence}%</span>
        {r.bounty_paid > 0 && <span className="text-accent">Bounty: {r.bounty_paid} wei</span>}
        <span className="flex items-center gap-1">
          Reporter: <AddressDisplay address={r.reporter} maxLength={12} />
        </span>
        <a
          href={r.evidence_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-accent"
        >
          Evidence <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

export function ReportsFeed() {
  const { data: reports, isLoading } = useReports();
  const ordered = reports ? [...reports].reverse() : [];

  return (
    <div className="surface p-6">
      <h2 className="text-xl font-bold flex items-center gap-2 mb-5">
        <FileSearch className="w-5 h-5 text-accent" />
        Adjudication Feed
      </h2>

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading…</p>
      ) : ordered.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No reports yet. Submit the first exploit report.
        </p>
      ) : (
        <div className="space-y-3">
          {ordered.map((r) => (
            <ReportRow key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}
