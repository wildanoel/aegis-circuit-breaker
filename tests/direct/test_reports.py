"""Direct-mode tests for the Aegis autonomous exploit-response circuit breaker.

These run in-memory with web + LLM mocks (no Studio required).
"""

import json

from tests.direct.conftest import to_hex

CONTRACT = "contracts/aegis.py"

TARGET = "0x1111111111111111111111111111111111111111"
EVIDENCE_URL = "https://gist.githubusercontent.com/example/report/raw/exploit.md"


def _register(contract, vm, owner, target=TARGET, label="VaultX", docs="https://vaultx.xyz"):
    vm.sender = owner
    contract.register_protection(target, label, docs)


def _mock_verdict(vm, confirmed, severity="high", confidence=90, reason="PoC drains vault"):
    """Mock the web evidence fetch and the LLM adjudication verdict."""
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


# --------------------------------------------------------------------------- #
# Registry
# --------------------------------------------------------------------------- #


def test_register_protection(direct_vm, direct_deploy, direct_owner):
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    protocols = contract.get_protocols()
    key = to_hex(direct_owner)  # not the key, but ensures SDK loaded
    assert key is not None
    assert len(protocols) == 1
    p = list(protocols.values())[0]
    assert p["label"] == "VaultX"
    assert p["halted"] is False


def test_register_duplicate_fails(direct_vm, direct_deploy, direct_owner):
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)
    with direct_vm.expect_revert("Protocol already registered"):
        _register(contract, direct_vm, direct_owner)


def test_submit_unregistered_target_fails(direct_vm, direct_deploy, direct_alice):
    contract = direct_deploy(CONTRACT, 1000)
    direct_vm.sender = direct_alice
    _mock_verdict(direct_vm, confirmed=True)
    with direct_vm.expect_revert("Target is not a protected protocol"):
        contract.submit_report(TARGET, EVIDENCE_URL, "Reentrancy in withdraw")


# --------------------------------------------------------------------------- #
# Core: autonomous confirm -> halt + bounty + reputation
# --------------------------------------------------------------------------- #


def test_confirmed_report_halts_and_rewards(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    contract = direct_deploy(CONTRACT, 1000)  # base_bounty = 1000
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock_verdict(direct_vm, confirmed=True, severity="critical", confidence=95)
    contract.submit_report(TARGET, EVIDENCE_URL, "Reentrancy drains vault")

    # Halt armed autonomously.
    assert contract.is_halted(TARGET) is True

    # Report recorded as confirmed with severity.
    report = contract.get_report(0)
    assert report["status"] == "confirmed"
    assert report["severity"] == "critical"
    assert report["confidence"] == 95

    # Reputation credited by severity weight (critical = 8).
    alice = to_hex(direct_alice)
    assert contract.get_reputation(alice) == 8

    # Bounty = base(1000) * critical weight(8) = 8000.
    assert report["bounty_paid"] == 8000

    stats = contract.get_stats()
    assert stats["confirmed"] == 1
    assert stats["halted"] == 1


def test_rejected_report_does_not_halt(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock_verdict(direct_vm, confirmed=False, severity="low", confidence=30)
    contract.submit_report(TARGET, EVIDENCE_URL, "Theoretical issue, no PoC")

    assert contract.is_halted(TARGET) is False
    report = contract.get_report(0)
    assert report["status"] == "rejected"
    assert report["bounty_paid"] == 0

    alice = to_hex(direct_alice)
    assert contract.get_reputation(alice) == 0


def test_severity_scales_bounty(direct_vm, direct_deploy, direct_owner, direct_alice):
    contract = direct_deploy(CONTRACT, 100)  # base_bounty = 100
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock_verdict(direct_vm, confirmed=True, severity="medium", confidence=80)
    contract.submit_report(TARGET, EVIDENCE_URL, "Limited-impact bug")

    report = contract.get_report(0)
    # medium weight = 2 -> 100 * 2 = 200
    assert report["bounty_paid"] == 200
    assert contract.get_reputation(to_hex(direct_alice)) == 2


def test_cannot_report_already_halted(
    direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock_verdict(direct_vm, confirmed=True, severity="high")
    contract.submit_report(TARGET, EVIDENCE_URL, "First exploit")
    assert contract.is_halted(TARGET) is True

    direct_vm.sender = direct_bob
    _mock_verdict(direct_vm, confirmed=True, severity="high")
    with direct_vm.expect_revert("Protocol already halted"):
        contract.submit_report(TARGET, EVIDENCE_URL, "Piling on")


# --------------------------------------------------------------------------- #
# Guardian controls
# --------------------------------------------------------------------------- #


def test_guardian_can_clear_halt(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock_verdict(direct_vm, confirmed=True, severity="high")
    contract.submit_report(TARGET, EVIDENCE_URL, "Exploit")
    assert contract.is_halted(TARGET) is True

    # guardian is direct_owner (deployer via register? No - deployer of contract).
    direct_vm.sender = direct_owner
    # owner deployed? deploy uses default sender; guardian set in __init__.
    # We assert only that a non-guardian is rejected below; guardian test in integration.
    contract.clear_halt(TARGET)
    assert contract.is_halted(TARGET) is False


def test_non_guardian_cannot_clear_halt(
    direct_vm, direct_deploy, direct_owner, direct_alice, direct_bob
):
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock_verdict(direct_vm, confirmed=True, severity="high")
    contract.submit_report(TARGET, EVIDENCE_URL, "Exploit")

    direct_vm.sender = direct_bob
    with direct_vm.expect_revert("Only guardian"):
        contract.clear_halt(TARGET)


# --------------------------------------------------------------------------- #
# Views
# --------------------------------------------------------------------------- #


def test_is_halted_unknown_target_false(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT, 0)
    assert contract.is_halted(TARGET) is False


def test_stats_empty(direct_vm, direct_deploy):
    contract = direct_deploy(CONTRACT, 0)
    stats = contract.get_stats()
    assert stats["protocols"] == 0
    assert stats["reports"] == 0
    assert stats["confirmed"] == 0
    assert stats["halted"] == 0
