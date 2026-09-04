"""Consensus tests for Aegis — exercise the Equivalence Principle validator.

Aegis uses gl.vm.run_nondet(judge, validator). The validator re-derives the
verdict from the same public evidence and only agrees when the two
consensus-critical fields (confirmed, severity) match. These tests use the
direct-mode run_validator cheatcode to drive the captured validator directly
and prove that honest agreement passes while divergent leader claims fail.
"""

import json

from tests.direct.conftest import to_hex

CONTRACT = "contracts/aegis.py"
TARGET = "0x2222222222222222222222222222222222222222"
EVIDENCE_URL = "https://gist.githubusercontent.com/example/report/raw/exploit.md"


def _register(contract, vm, owner):
    vm.sender = owner
    contract.register_protection(TARGET, "VaultX", "https://vaultx.xyz")


def _mock(vm, confirmed, severity="critical", confidence=95, reason="drains vault"):
    vm.mock_web(r".*", {"status": 200, "body": "reentrancy in withdraw() drains funds"})
    vm.mock_llm(
        r".*security adjudicator.*",
        json.dumps(
            {
                "confirmed": confirmed,
                "severity": severity,
                "confidence": confidence,
                "reason": reason,
            }
        ),
    )


def test_validator_agrees_with_honest_leader(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock(direct_vm, confirmed=True, severity="critical")
    contract.submit_report(TARGET, EVIDENCE_URL, "Reentrancy drains vault")

    # Re-run the captured validator against the leader's stored result.
    # Mocks are unchanged, so an honest validator reproduces the same verdict.
    assert direct_vm.run_validator() is True


def test_validator_rejects_fabricated_confirmation(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    # Leader (and its mock) genuinely see NO exploit in the evidence.
    _mock(direct_vm, confirmed=False, severity="low")
    contract.submit_report(TARGET, EVIDENCE_URL, "No real issue")

    # A malicious leader claims a confirmed critical exploit. The validator,
    # re-deriving from the same evidence (mock still says confirmed=False),
    # must disagree — this is what forces leader rotation on-chain.
    forged = json.dumps(
        {"confirmed": True, "severity": "critical", "confidence": 99, "reason": "lie"}
    )
    assert direct_vm.run_validator(leader_result=forged) is False


def test_validator_rejects_severity_mismatch(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock(direct_vm, confirmed=True, severity="medium")
    contract.submit_report(TARGET, EVIDENCE_URL, "Medium bug")

    # Leader agrees it's confirmed but inflates severity to critical.
    # The validator independently derives "medium" and rejects the mismatch.
    forged = json.dumps(
        {"confirmed": True, "severity": "critical", "confidence": 90, "reason": "inflate"}
    )
    assert direct_vm.run_validator(leader_result=forged) is False


def test_validator_rejects_leader_error(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock(direct_vm, confirmed=True, severity="high")
    contract.submit_report(TARGET, EVIDENCE_URL, "High bug")

    # If the leader reported an error, the validator votes False.
    assert direct_vm.run_validator(leader_error=Exception("leader crashed")) is False
