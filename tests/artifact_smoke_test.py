"""Smoke-test the deploy artifact in the direct simulator.

The artifact is what actually goes on-chain, so it (not just the source)
must deploy and answer reads before we spend a real transaction.
"""

import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
# build/ not artifacts/ (gltest wipes artifacts/ as its compile cache)
ARTIFACT = ROOT / "build" / "aegis.deploy.py"


def test_artifact_deploys_and_reads(direct_vm, direct_deploy, direct_owner):
    direct_vm.sender = direct_owner
    contract = direct_deploy(str(ARTIFACT), 1000)
    stats = contract.get_stats()
    assert int(stats["protocols"]) == 0
    assert int(stats["base_bounty"]) == 1000
    assert int(stats["reports"]) == 0
