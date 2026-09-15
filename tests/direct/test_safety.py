"""Safety-property tests for Aegis.

Halting a live protocol is destructive and irreversible without the guardian,
so a confirmed verdict alone must not be enough to trigger it. These tests pin
the guards that stand between an LLM verdict and a real halt:

  1. A confirmed finding below MIN_HALT_CONFIDENCE does not halt.
  2. A confirmed but low/medium severity finding does not halt.
  3. The same evidence cannot be resubmitted to farm the bounty pool.
  4. Malformed model output degrades to "do not halt", never to a halt.
  5. A validator must disagree when the leader moves confidence across the
     halt threshold, even if confirmed and severity match.
"""

import json

CONTRACT = "contracts/aegis.py"

TARGET = "0x3333333333333333333333333333333333333333"
EVIDENCE_URL = "https://gist.githubusercontent.com/example/report/raw/exploit.md"
OTHER_URL = "https://gist.githubusercontent.com/example/report/raw/second.md"


def _register(contract, vm, owner, target=TARGET):
    vm.sender = owner
    contract.register_protection(target, "VaultX", "https://vaultx.xyz")


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


# --------------------------------------------------------------------------- #
# Halt requires BOTH high confidence and serious severity
# --------------------------------------------------------------------------- #


def test_low_confidence_confirmation_does_not_halt(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    """A hedging model must not be able to pull the plug on a live protocol."""
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock(direct_vm, confirmed=True, severity="critical", confidence=42)
    contract.submit_report(TARGET, EVIDENCE_URL, "Maybe a reentrancy?")

    assert contract.is_halted(TARGET) is False

    report = contract.get_report(0)
    assert report["status"] == "inconclusive"
    # The finding is still real, so it is still recorded and still paid.
    assert report["severity"] == "critical"
    assert report["bounty_paid"] > 0


def test_low_severity_confirmation_does_not_halt(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    """A confirmed hardening nit is not grounds for an autonomous halt."""
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock(direct_vm, confirmed=True, severity="low", confidence=99)
    contract.submit_report(TARGET, EVIDENCE_URL, "Missing event emission")

    assert contract.is_halted(TARGET) is False
    assert contract.get_report(0)["status"] == "inconclusive"


def test_high_severity_and_high_confidence_does_halt(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    """The positive case: both guards satisfied means the breaker trips."""
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock(direct_vm, confirmed=True, severity="critical", confidence=95)
    contract.submit_report(TARGET, EVIDENCE_URL, "Reentrancy drains vault")

    assert contract.is_halted(TARGET) is True
    assert contract.get_report(0)["status"] == "confirmed"


def test_confidence_exactly_at_threshold_halts(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    """Boundary: MIN_HALT_CONFIDENCE itself is sufficient, not off by one."""
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock(direct_vm, confirmed=True, severity="high", confidence=70)
    contract.submit_report(TARGET, EVIDENCE_URL, "Exploit")

    assert contract.is_halted(TARGET) is True


def test_confidence_one_below_threshold_does_not_halt(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock(direct_vm, confirmed=True, severity="high", confidence=69)
    contract.submit_report(TARGET, EVIDENCE_URL, "Exploit")

    assert contract.is_halted(TARGET) is False


# --------------------------------------------------------------------------- #
# Evidence replay / bounty farming
# --------------------------------------------------------------------------- #


def test_same_evidence_cannot_be_resubmitted(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    """One report, one payout. Otherwise the pool can be drained on repeat."""
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    # Inconclusive so the protocol stays live and the "already halted" guard
    # is not what blocks the second submission.
    _mock(direct_vm, confirmed=True, severity="medium", confidence=95)
    contract.submit_report(TARGET, EVIDENCE_URL, "Limited-impact bug")
    assert contract.is_halted(TARGET) is False

    with direct_vm.expect_revert("Evidence already adjudicated"):
        contract.submit_report(TARGET, EVIDENCE_URL, "Same bug again")


def test_replay_guard_is_per_evidence_not_global(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    """A genuinely different report on the same target must still go through."""
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock(direct_vm, confirmed=True, severity="medium", confidence=95)
    contract.submit_report(TARGET, EVIDENCE_URL, "First bug")
    contract.submit_report(TARGET, OTHER_URL, "Second, different bug")

    assert contract.get_stats()["reports"] == 2


# --------------------------------------------------------------------------- #
# Malformed model output must fail safe
# --------------------------------------------------------------------------- #


def test_garbage_confidence_fails_closed(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    """An unparseable confidence must read as 0, which cannot halt."""
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    direct_vm.mock_web(r".*", {"status": 200, "body": "reentrancy drains funds"})
    direct_vm.mock_llm(
        r".*security adjudicator.*",
        json.dumps(
            {
                "confirmed": True,
                "severity": "critical",
                "confidence": "very high",
                "reason": "x",
            }
        ),
    )
    contract.submit_report(TARGET, EVIDENCE_URL, "Exploit")

    assert contract.is_halted(TARGET) is False
    assert contract.get_report(0)["confidence"] == 0


def test_numeric_string_confidence_is_accepted(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    """Models often emit "95" as a string rather than a number. That is a
    formatting quirk, not a reason to refuse to act, so it must parse."""
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    direct_vm.mock_web(r".*", {"status": 200, "body": "reentrancy drains funds"})
    direct_vm.mock_llm(
        r".*security adjudicator.*",
        json.dumps(
            {
                "confirmed": True,
                "severity": "critical",
                "confidence": "95",
                "reason": "x",
            }
        ),
    )
    contract.submit_report(TARGET, EVIDENCE_URL, "Exploit")

    assert contract.get_report(0)["confidence"] == 95
    assert contract.is_halted(TARGET) is True


def test_non_object_llm_response_does_not_abort(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    """A model that returns valid JSON which is not an object must not take
    the whole transaction down. It must degrade to a safe non-halt verdict."""
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    direct_vm.mock_web(r".*", {"status": 200, "body": "reentrancy drains funds"})
    direct_vm.mock_llm(r".*security adjudicator.*", json.dumps("not an object"))

    contract.submit_report(TARGET, EVIDENCE_URL, "Exploit")

    assert contract.is_halted(TARGET) is False
    report = contract.get_report(0)
    assert report["status"] == "rejected"
    assert report["confidence"] == 0


def test_unknown_severity_degrades_to_low_and_does_not_halt(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock(direct_vm, confirmed=True, severity="apocalyptic", confidence=99)
    contract.submit_report(TARGET, EVIDENCE_URL, "Exploit")

    assert contract.get_report(0)["severity"] == "low"
    assert contract.is_halted(TARGET) is False


def test_out_of_range_confidence_is_clamped(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock(direct_vm, confirmed=True, severity="critical", confidence=100000)
    contract.submit_report(TARGET, EVIDENCE_URL, "Exploit")

    assert contract.get_report(0)["confidence"] == 100


# --------------------------------------------------------------------------- #
# Consensus: confidence is a consensus-critical field
# --------------------------------------------------------------------------- #


def test_validator_rejects_leader_crossing_halt_threshold(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    """confirmed and severity match, but the leader inflates confidence over
    the halt line. That difference decides whether a protocol halts, so the
    validator must refuse."""
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    # The evidence honestly supports only a low-confidence read.
    _mock(direct_vm, confirmed=True, severity="critical", confidence=20)
    contract.submit_report(TARGET, EVIDENCE_URL, "Exploit")
    assert contract.is_halted(TARGET) is False

    # A malicious leader keeps confirmed and severity identical, so the older
    # two-field check would have passed it, and only lifts confidence over the
    # threshold to force the halt.
    forged = json.dumps(
        {
            "confirmed": True,
            "severity": "critical",
            "confidence": 99,
            "reason": "inflate",
        }
    )
    assert direct_vm.run_validator(leader_result=forged) is False


def test_validator_tolerates_confidence_noise_on_same_side(
    direct_vm, direct_deploy, direct_owner, direct_alice
):
    """Two honest models rarely output the identical number. As long as both
    land on the same side of the threshold, consensus must still form."""
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)

    direct_vm.sender = direct_alice
    _mock(direct_vm, confirmed=True, severity="critical", confidence=95)
    contract.submit_report(TARGET, EVIDENCE_URL, "Exploit")

    # Leader said 88, validator derives 95. Different numbers, same side of the
    # threshold, so the verdict is the same and consensus should hold.
    forged = json.dumps(
        {
            "confirmed": True,
            "severity": "critical",
            "confidence": 88,
            "reason": "agree",
        }
    )
    assert direct_vm.run_validator(leader_result=forged) is True
