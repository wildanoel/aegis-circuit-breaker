"use client";

import { Navbar } from "@/components/Navbar";
import { StatsBar } from "@/components/StatsBar";
import { ProtocolsList } from "@/components/ProtocolsList";
import { ReportsFeed } from "@/components/ReportsFeed";
import { HaltChecker } from "@/components/HaltChecker";

const STEPS = [
  {
    n: "01",
    title: "Opt in",
    body: "A protocol registers for protection. Its contract reads is_halted(target) and pauses itself when a halt is confirmed.",
  },
  {
    n: "02",
    title: "Report",
    body: "Anyone submits an exploit report with a public evidence URL and the target address. No permission needed.",
  },
  {
    n: "03",
    title: "Consensus",
    body: "GenLayer validators independently fetch the same evidence and re-judge it under the Equivalence Principle. Fabricated claims fail here.",
  },
  {
    n: "04",
    title: "Response",
    body: "A confirmed exploit arms the halt, pays a severity-scaled bounty from the pool, and credits reporter reputation. No human in the loop.",
  },
];

// Real incidents where minutes mattered. The window between a public PoC and
// protocol-level containment is exactly what Aegis automates away.
const INCIDENTS = [
  {
    protocol: "Ronin Bridge",
    date: "Mar 2022",
    loss: "$624M",
    lesson: "Social-engineered keys; the exploit was live for days before anyone pulled the plug.",
  },
  {
    protocol: "Wormhole",
    date: "Feb 2022",
    loss: "$326M",
    lesson: "Signature verification bug; guardian set reacted, but only after 4 hours of drain.",
  },
  {
    protocol: "Poly Network",
    date: "Aug 2021",
    loss: "$611M",
    lesson: "Cross-contract call flaw; pausing was manual, scattered, and slow.",
  },
  {
    protocol: "Euler Finance",
    date: "Mar 2023",
    loss: "$197M",
    lesson: "Donation bug from a public disclosure; the vulnerable path was live the moment details spread.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-grow px-4 pb-20 pt-28 md:px-6">
        <div className="mx-auto max-w-6xl">
          {/* Hero */}
          <section className="mb-14 animate-fade-in">
            <p className="eyebrow mb-4">GenLayer Intelligent Contract</p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-5xl lg:text-6xl">
              A circuit breaker that pulls itself.
            </h1>
            <p className="mt-5 max-w-2xl text-base text-muted-foreground md:text-lg">
              Anyone can report an exploit. Validators verify the public evidence
              and reach consensus. If the exploit is real, the contract halts the
              target protocol and pays the reporter. No multisig, no trusted
              operator, no human in the loop.
            </p>
          </section>

          {/* Stats */}
          <section className="mb-10 animate-slide-up">
            <StatsBar />
          </section>

          {/* Halt checker */}
          <section className="mb-10 animate-slide-up">
            <HaltChecker />
          </section>

          {/* Protocols + feed */}
          <section className="grid grid-cols-1 gap-6 lg:grid-cols-12">
            <div className="animate-slide-up lg:col-span-5">
              <ProtocolsList />
            </div>
            <div
              className="animate-slide-up lg:col-span-7"
              style={{ animationDelay: "80ms" }}
            >
              <ReportsFeed />
            </div>
          </section>

          {/* How it works */}
          <section className="mt-16 border-t border-border pt-12">
            <h2 className="text-2xl font-bold tracking-tight">How it works</h2>
            <div className="mt-8 grid grid-cols-1 gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-4">
              {STEPS.map((s) => (
                <div key={s.n} className="bg-card p-6">
                  <div className="text-xs font-semibold text-accent">{s.n}</div>
                  <div className="mt-3 font-semibold">{s.title}</div>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Why minutes matter */}
          <section className="mt-16 border-t border-border pt-12">
            <h2 className="text-2xl font-bold tracking-tight">
              Why minutes matter
            </h2>
            <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
              Every incident below stayed live far longer than an Aegis
              adjudication cycle. These are the minutes a self-pulling circuit
              breaker removes from the equation.
            </p>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {INCIDENTS.map((i) => (
                <div
                  key={i.protocol}
                  className="rounded-lg border border-border bg-card p-5"
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <div className="font-semibold">{i.protocol}</div>
                    <div className="text-xs text-muted-foreground">{i.date}</div>
                  </div>
                  <div className="mt-2 text-2xl font-bold text-destructive">
                    {i.loss}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    {i.lesson}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-border py-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 text-sm text-muted-foreground md:px-6">
          <span>Aegis: autonomous exploit-response, built on GenLayer.</span>
          <span className="flex items-center gap-5">
            <a
              href="https://github.com/wildanoel/aegis-circuit-breaker"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              Source
            </a>
            <a
              href="https://github.com/wildanoel/aegis-circuit-breaker/blob/main/contracts/aegis.py"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              Contract
            </a>
            <a href="https://genlayer.com" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              GenLayer
            </a>
          </span>
        </div>
      </footer>
    </div>
  );
}
