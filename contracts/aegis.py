# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
#
# Aegis - Autonomous Exploit-Response Circuit Breaker
#
# Aegis is a security primitive for the agentic economy. Anyone can submit an
# exploit report against a protected protocol. GenLayer validators then
# INDEPENDENTLY verify - by fetching the same public evidence and re-judging it
# with an LLM under the Equivalence Principle - whether the report describes a
# genuine, active, exploitable vulnerability.
#
# If (and only if) consensus confirms the exploit, the contract autonomously:
#   1. Arms a HALT signal for the target contract. Any protocol that opted in
#      reads is_halted(target) and pauses itself. No human vote, no multisig,
#      no trusted operator.
#   2. Assigns a severity tier and pays a severity-scaled bounty to the reporter
#      from the pre-funded pool, and credits on-chain reporter reputation.
#
# This is the "emergency halt module" reference build for the Autonomous
# Protocols track: a contract that governs and pauses OTHER contracts, driven
# purely by evidence-based consensus.

import json
from dataclasses import dataclass

from genlayer import *


# Severity tiers. Bounty is scaled by tier when the pool is funded.
SEVERITY_TIERS = ("critical", "high", "medium", "low")

# Bounty weight per tier (relative units, multiplied by the guardian's base bounty).
SEVERITY_WEIGHT = {
    "critical": 8,
    "high": 4,
    "medium": 2,
    "low": 1,
}


@allow_storage
@dataclass
class Protocol:
    target: Address
    label: str
    docs_url: str
    halted: bool
    halt_report_id: u256
    registered_by: Address


@allow_storage
@dataclass
class Report:
    id: u256
    reporter: Address
    target: Address
    evidence_url: str
    title: str
    # verdict lifecycle: "pending" -> "confirmed" | "rejected"
    status: str
    severity: str
    confidence: u256
    reason: str
    bounty_paid: u256


class Aegis(gl.Contract):
    guardian: Address
    # base bounty (in wei of the native GEN token) for a "low" severity finding.
    base_bounty: u256

    protocols: TreeMap[Address, Protocol]
    reports: DynArray[Report]
    # reporter address -> confirmed-finding reputation score
    reputation: TreeMap[Address, u256]
    # reporter address -> bounty that was owed but could not be auto-paid
    # (pool underfunded). Claimable later via claim_bounty().
    owed: TreeMap[Address, u256]

    def __init__(self, base_bounty: bigint = 0):
        self.guardian = gl.message.sender_address
        self.base_bounty = u256(base_bounty)

    # ------------------------------------------------------------------ #
    # Protection registry
    # ------------------------------------------------------------------ #

    @gl.public.write
    def register_protection(self, target: str, label: str, docs_url: str) -> None:
        """Opt a protocol into Aegis protection. Idempotent per target address."""
        target_addr = Address(target)
        if target_addr in self.protocols:
            raise gl.vm.UserError("Protocol already registered")
        self.protocols[target_addr] = Protocol(
            target=target_addr,
            label=label,
            docs_url=docs_url,
            halted=False,
            halt_report_id=u256(0),
            registered_by=gl.message.sender_address,
        )

    # ------------------------------------------------------------------ #
    # Core: submit and autonomously adjudicate an exploit report
    # ------------------------------------------------------------------ #

    @gl.public.write
    def submit_report(self, target: str, evidence_url: str, title: str) -> None:
        """
        Submit an exploit report. Validators independently verify the evidence
        under the Equivalence Principle. On confirmed consensus the contract
        arms the halt signal and pays the reporter.
        """
        target_addr = Address(target)
        if target_addr not in self.protocols:
            raise gl.vm.UserError("Target is not a protected protocol")
        if self.protocols[target_addr].halted:
            raise gl.vm.UserError("Protocol already halted")

        reporter = gl.message.sender_address
        report_id = u256(len(self.reports))

        verdict = self._adjudicate(target_addr, evidence_url, title)

        confirmed = bool(verdict.get("confirmed", False))
        severity = str(verdict.get("severity", "low")).strip().lower()
        if severity not in SEVERITY_TIERS:
            severity = "low"
        try:
            confidence = int(verdict.get("confidence", 0))
        except (ValueError, TypeError):
            confidence = 0
        confidence = max(0, min(100, confidence))
        reason = str(verdict.get("reason", ""))[:800]

        report = Report(
            id=report_id,
            reporter=reporter,
            target=target_addr,
            evidence_url=evidence_url,
            title=title,
            status="pending",
            severity=severity,
            confidence=u256(confidence),
            reason=reason,
            bounty_paid=u256(0),
        )

        if confirmed:
            # Autonomous response: arm the halt and reward the reporter.
            report.status = "confirmed"
            protocol = self.protocols[target_addr]
            protocol.halted = True
            protocol.halt_report_id = report_id

            self.reputation[reporter] = u256(
                self.reputation.get(reporter, 0) + SEVERITY_WEIGHT[severity]
            )

            bounty = u256(self.base_bounty * SEVERITY_WEIGHT[severity])
            if bounty > 0:
                self._pay_bounty(reporter, bounty)
                report.bounty_paid = bounty
        else:
            report.status = "rejected"

        self.reports.append(report)

    def _adjudicate(self, target_addr: Address, evidence_url: str, title: str) -> dict:
        """
        Non-deterministic verification block. Runs under the Equivalence
        Principle: the leader fetches the evidence and judges it; validators
        independently re-fetch and re-judge, and consensus only holds when the
        confirmed/severity decision agrees.
        """
        target_hex = target_addr.as_hex

        def judge() -> str:
            evidence = gl.nondet.web.render(evidence_url, mode="text")
            prompt = f"""You are a smart-contract security adjudicator for the Aegis \
autonomous circuit breaker. A reporter claims an ACTIVE, exploitable \
vulnerability in an on-chain protocol.

Target contract address: {target_hex}
Report title: {title}

Public evidence fetched from the report URL:
---
{evidence}
---

Decide, strictly from the evidence, whether this describes a GENUINE, active, \
and exploitable vulnerability affecting the target. Be conservative: reject \
vague claims, theoretical issues with no proof, duplicates of already-patched \
bugs, or anything unsupported by the evidence.

Assign a severity using this rubric:
- "critical": funds can be drained or the protocol bricked right now.
- "high": significant loss or unauthorized control is demonstrably possible.
- "medium": limited impact or requires unusual preconditions.
- "low": minor or hardening issue.

Respond ONLY with a JSON object, no prose, no markdown fences:
{{
  "confirmed": boolean,   // true only if the evidence proves an active exploit
  "severity": string,     // one of "critical","high","medium","low"
  "confidence": integer,  // 0-100, your confidence in the decision
  "reason": string        // one concise sentence citing the decisive evidence
}}
Your entire output must be valid JSON parseable without any changes."""
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            normalized = {
                "confirmed": bool(result.get("confirmed", False)),
                "severity": str(result.get("severity", "low")).strip().lower(),
                "confidence": result.get("confidence", 0),
                "reason": result.get("reason", ""),
            }
            return json.dumps(normalized, sort_keys=True)

        def validator(leader_result) -> bool:
            # Never trust the leader's answer. Independently re-derive the
            # verdict from the same public evidence and require the two
            # consensus-critical decision fields to agree.
            if not isinstance(leader_result, gl.vm.Return):
                return False
            try:
                leader = json.loads(leader_result.calldata)
            except (ValueError, TypeError):
                return False
            mine = json.loads(judge())
            return (
                bool(leader.get("confirmed")) == bool(mine.get("confirmed"))
                and str(leader.get("severity")) == str(mine.get("severity"))
            )

        raw = gl.vm.run_nondet(judge, validator)
        return json.loads(raw)

    def _pay_bounty(self, reporter: Address, amount: u256) -> None:
        """
        Pay the reporter from the pre-funded pool if the contract holds enough
        balance; otherwise record it as claimable so nothing is lost.
        """
        if self.balance >= amount:
            gl.chain.Account(reporter).emit_transfer(amount)
        else:
            self.owed[reporter] = u256(self.owed.get(reporter, 0) + amount)

    # ------------------------------------------------------------------ #
    # Pool funding and bounty claims
    # ------------------------------------------------------------------ #

    @gl.public.write.payable
    def fund_pool(self) -> None:
        """Fund the bounty pool. Value sent with the call is added to balance."""
        pass

    @gl.public.write
    def claim_bounty(self) -> None:
        """Withdraw any bounty that was owed but could not be auto-paid."""
        reporter = gl.message.sender_address
        amount = u256(self.owed.get(reporter, 0))
        if amount == 0:
            raise gl.vm.UserError("Nothing to claim")
        if self.balance < amount:
            raise gl.vm.UserError("Pool underfunded, try again later")
        self.owed[reporter] = u256(0)
        gl.chain.Account(reporter).emit_transfer(amount)

    # ------------------------------------------------------------------ #
    # Guardian controls
    # ------------------------------------------------------------------ #

    @gl.public.write
    def set_base_bounty(self, new_base: bigint) -> None:
        if gl.message.sender_address != self.guardian:
            raise gl.vm.UserError("Only guardian")
        self.base_bounty = u256(new_base)

    @gl.public.write
    def clear_halt(self, target: str) -> None:
        """
        Guardian may lift a halt after a fix is shipped so the protocol can
        resume. This is the only privileged override in the system.
        """
        if gl.message.sender_address != self.guardian:
            raise gl.vm.UserError("Only guardian")
        target_addr = Address(target)
        if target_addr not in self.protocols:
            raise gl.vm.UserError("Unknown protocol")
        protocol = self.protocols[target_addr]
        protocol.halted = False
        protocol.halt_report_id = u256(0)

    # ------------------------------------------------------------------ #
    # Views - the composable security surface
    # ------------------------------------------------------------------ #

    @gl.public.view
    def is_halted(self, target: str) -> bool:
        """
        The circuit-breaker signal. Any protected protocol calls this and
        pauses itself when it returns True.
        """
        target_addr = Address(target)
        if target_addr not in self.protocols:
            return False
        return self.protocols[target_addr].halted

    @gl.public.view
    def get_protocols(self) -> dict:
        out = {}
        for addr, p in self.protocols.items():
            out[addr.as_hex] = {
                "label": p.label,
                "docs_url": p.docs_url,
                "halted": p.halted,
                "halt_report_id": int(p.halt_report_id),
                "registered_by": p.registered_by.as_hex,
            }
        return out

    @gl.public.view
    def get_reports(self) -> list:
        out = []
        for r in self.reports:
            out.append(self._report_to_dict(r))
        return out

    @gl.public.view
    def get_report(self, report_id: int) -> dict:
        if report_id < 0 or report_id >= len(self.reports):
            raise gl.vm.UserError("Unknown report")
        return self._report_to_dict(self.reports[report_id])

    @gl.public.view
    def get_reputation(self, reporter: str) -> int:
        return int(self.reputation.get(Address(reporter), 0))

    @gl.public.view
    def get_owed(self, reporter: str) -> int:
        return int(self.owed.get(Address(reporter), 0))

    @gl.public.view
    def get_stats(self) -> dict:
        confirmed = 0
        halted = 0
        for r in self.reports:
            if r.status == "confirmed":
                confirmed += 1
        for _, p in self.protocols.items():
            if p.halted:
                halted += 1
        return {
            "guardian": self.guardian.as_hex,
            "base_bounty": int(self.base_bounty),
            "protocols": len(self.protocols),
            "reports": len(self.reports),
            "confirmed": confirmed,
            "halted": halted,
        }

    def _report_to_dict(self, r: Report) -> dict:
        return {
            "id": int(r.id),
            "reporter": r.reporter.as_hex,
            "target": r.target.as_hex,
            "evidence_url": r.evidence_url,
            "title": r.title,
            "status": r.status,
            "severity": r.severity,
            "confidence": int(r.confidence),
            "reason": r.reason,
            "bounty_paid": int(r.bounty_paid),
        }
