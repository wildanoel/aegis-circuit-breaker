"use client";

import { Shield, FileSearch, CheckCircle2, OctagonPause } from "lucide-react";
import { useStats } from "@/lib/hooks/useAegis";

function StatCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  accent?: string;
}) {
  return (
    <div className="glass-card p-5 flex items-center gap-4">
      <div className={`rounded-lg p-3 ${accent ?? "bg-accent/15 text-accent"}`}>{icon}</div>
      <div>
        <div className="text-2xl font-bold leading-none">{value}</div>
        <div className="text-sm text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}

export function StatsBar() {
  const { data } = useStats();

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard icon={<Shield className="w-5 h-5" />} label="Protected protocols" value={data?.protocols ?? 0} />
      <StatCard icon={<FileSearch className="w-5 h-5" />} label="Reports adjudicated" value={data?.reports ?? 0} />
      <StatCard
        icon={<CheckCircle2 className="w-5 h-5" />}
        label="Confirmed exploits"
        value={data?.confirmed ?? 0}
        accent="bg-emerald-500/15 text-emerald-400"
      />
      <StatCard
        icon={<OctagonPause className="w-5 h-5" />}
        label="Active halts"
        value={data?.halted ?? 0}
        accent="bg-red-500/15 text-red-400"
      />
    </div>
  );
}
