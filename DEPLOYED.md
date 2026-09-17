# Aegis deployed contract record

Current live deployment (redeployed 2026-09-17 via genlayer-py after the
execution-budget overrun on the earlier attempt):

- Network: GenLayer Studio Next / "Studio Dev", chain id 61997
- RPC: https://studio-dev.genlayer.com/api
- Contract address: 0xB0C0799099f8C52c1B39972A5945C6757E9c9815
- Deployer / guardian: 0xf7ED2b1669EE11bD26c5811e0072ec40a54240f2
- Artifact: build/aegis.deploy.py (from contracts/aegis.py via scripts/build_deploy.py)
- Source pin in artifact: py-genlayer v0.3 API (see skill genlayer-contract-deploy pitfall J)

E2E verified 2026-09-17 via genlayer-js (scripts in repo + /tmp/gljs2):
- register_protection  FINISHED_WITH_RETURN (explicit fees required, pitfall M)
- submit_report        FINISHED_WITH_RETURN; AI verdict ran in consensus,
                       benign example.com evidence -> status "rejected"
- get_stats            protocols:2 reports:1 after tests
- reads: views return plain dict/list (NOT Map) - frontend normalizes

Test state left on-chain (harmless, studio-dev):
- protected: 0x1111..1111 ("Demo Protocol"), 0x2222..2222 ("Estimator Test")
- report 0: rejected test report against 0x1111..
