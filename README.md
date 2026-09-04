# Aegis — Autonomous Exploit-Response Circuit Breaker

Aegis is a security primitive for the agentic economy, built as a GenLayer
Intelligent Contract. It lets a protocol be **paused autonomously the moment a
genuine exploit is proven** — with no multisig, no trusted operator, and no
human vote in the critical path.

Anyone submits an exploit report against a protected protocol. GenLayer
validators then **independently** verify the report — each fetches the same
public evidence and re-judges it with an LLM under the Equivalence Principle. If
and only if consensus confirms an active, exploitable vulnerability, the
contract:

1. **Arms a halt signal** for the target. Any protected protocol reads
   `is_halted(target)` and pauses itself.
2. **Pays a severity-scaled bounty** to the reporter from a pre-funded pool.
3. **Credits on-chain reporter reputation.**

This is the reference build for the **Autonomous Protocols** track: a contract
that governs and pauses *other* contracts, driven purely by evidence-based
consensus.

## Why this needs GenLayer

A normal smart contract cannot decide "is this a real, active exploit?" — that
requires reading an external writeup or PoC and applying judgment. A centralized
backend could do it, but then every protected protocol has to trust one
operator's kill switch. GenLayer is the missing piece: the judgment itself is
made by decentralized validator consensus over public evidence, so the halt
decision is trust-minimized.

Aegis maps directly onto GenLayer's stated sweet spot:

- **Real on-chain consequence** — a protocol is halted and a bounty is paid.
- **Requires judgment** — interpreting an exploit writeup against a severity rubric.
- **Independently checkable evidence** — validators re-fetch the same public URL.
- **Benefits from neutral consensus** — no single operator holds the kill switch.
- **Explicit structured result** — `confirmed`, `severity`, `confidence`, `reason`.

## How consensus works here

The verification runs inside `gl.vm.run_nondet(judge, validator)`:

- The **leader** fetches the evidence with `gl.nondet.web.render` and asks an LLM
  for a structured verdict (`gl.nondet.exec_prompt(..., response_format="json")`).
- Each **validator** never trusts the leader's answer. It independently
  re-derives its own verdict from the same public evidence and only agrees when
  the two consensus-critical fields — `confirmed` and `severity` — match.

A fabricated "confirmed critical" claim by a malicious leader fails consensus,
because honest validators re-reading the evidence disagree, forcing leader
rotation. This is verified in `tests/direct/test_consensus.py`.

## Contract surface

`contracts/aegis.py`

Writes:
- `register_protection(target, label, docs_url)` — opt a protocol in.
- `submit_report(target, evidence_url, title)` — submit + autonomously adjudicate.
- `fund_pool()` (payable) — fund the bounty pool.
- `claim_bounty()` — withdraw a bounty that could not be auto-paid.
- `set_base_bounty(new_base)` — guardian only.
- `clear_halt(target)` — guardian only; lift a halt after a fix ships.

Views:
- `is_halted(target)` — the circuit-breaker signal protocols read.
- `get_protocols()`, `get_reports()`, `get_report(id)`, `get_stats()`
- `get_reputation(reporter)`, `get_owed(reporter)`

### Integrating a protected protocol

```python
# In your own Intelligent Contract, gate sensitive methods:
aegis = gl.contract.get_at(Address(AEGIS_ADDRESS))
if aegis.view().is_halted(self.address.as_hex):
    raise gl.vm.UserError("Protocol halted by Aegis circuit breaker")
```

## Project layout

```
contracts/aegis.py            # The Intelligent Contract
tests/direct/                 # Fast in-memory tests (15 tests, web/LLM mocked)
  test_reports.py             #   registry, halt, bounty, reputation, guardian
  test_consensus.py           #   Equivalence Principle validator behavior
tests/integration/            # Full tests against GenLayer Studio
  test_aegis.py
frontend/                     # Next.js 15 dashboard (report, protect, feed)
deploy/deployScript.ts        # Deployment script
```

## Develop

Requirements: Python >= 3.12, Node >= 18, and the GenLayer CLI
(`npm install -g genlayer`).

```bash
# Set up the Python env (uv shown; venv works too)
uv venv --python 3.12 .venv
uv pip install -r requirements.txt

# Lint the contract
.venv/bin/genvm-lint check contracts/aegis.py

# Fast direct-mode tests (no Studio required)
.venv/bin/python -m pytest tests/direct/ -v

# Integration tests (requires GenLayer Studio)
gltest tests/integration/ -v -s
```

## Deploy

```bash
# Deploy to a chosen network with an initial base bounty (wei).
AEGIS_BASE_BOUNTY=0 genlayer deploy --contract contracts/aegis.py --args 0

# Or via the deploy script / Studio at https://studio.genlayer.com
```

Then point the frontend at it:

```bash
cd frontend
cp .env.example .env
# set NEXT_PUBLIC_CONTRACT_ADDRESS + RPC URL
npm install && npm run dev
```

## Security notes

- The only privileged override is `clear_halt` (guardian), used to resume a
  protocol after a fix ships. Arming a halt is never privileged — it is driven
  solely by consensus.
- Bounties are paid from a pre-funded pool. If the pool is underfunded at
  confirmation time, the amount is recorded as claimable (`owed`) so nothing is
  lost; the reporter withdraws later with `claim_bounty()`.
- Validators perform independent verification, not leader-output-only checks, in
  line with the GenLayer Equivalence Principle guidance.

## License

MIT
