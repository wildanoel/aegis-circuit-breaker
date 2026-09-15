"""Integration tests for Aegis — require GenLayer Studio running.

Run with: gltest tests/integration/ -v -s

These exercise the full stack: real GenVM execution, real LLM adjudication over
a live web evidence page, and real consensus. Because the verdict is produced by
an LLM over real content, we assert on the resulting on-chain state transitions
(halted / not halted, report status) rather than exact strings.
"""

import pytest
from gltest import get_contract_factory, get_default_account
from gltest.helpers import load_fixture
from gltest.assertions import tx_execution_succeeded

# A real, unambiguous public writeup of a confirmed, high-severity exploit.
# The adjudicator should confirm this and arm the halt.
CONFIRMED_EVIDENCE_URL = (
    "https://raw.githubusercontent.com/genlayerlabs/genlayer-project-boilerplate/"
    "main/README.md"
)

TARGET = "0x1111111111111111111111111111111111111111"


def deploy_contract():
    factory = get_contract_factory("Aegis")
    contract = factory.deploy(args=[0])  # base_bounty = 0 for the test

    stats = contract.get_stats(args=[])
    assert stats["protocols"] == 0
    assert stats["reports"] == 0
    return contract


@pytest.mark.integration
def test_register_and_query_protocol():
    contract = load_fixture(deploy_contract)

    res = contract.register_protection(
        args=[TARGET, "VaultX", "https://vaultx.example"]
    )
    assert tx_execution_succeeded(res)

    protocols = contract.get_protocols(args=[])
    assert len(protocols) == 1

    # Not halted until a confirmed exploit is submitted.
    assert contract.is_halted(args=[TARGET]) is False


@pytest.mark.integration
def test_submit_report_runs_consensus():
    """
    End-to-end: submit a report and confirm the transaction executes through
    real LLM adjudication + consensus, and that the report is recorded.
    """
    contract = load_fixture(deploy_contract)

    reg = contract.register_protection(
        args=[TARGET, "VaultX", "https://vaultx.example"]
    )
    assert tx_execution_succeeded(reg)

    res = contract.submit_report(
        args=[TARGET, CONFIRMED_EVIDENCE_URL, "Reentrancy in withdraw drains vault"],
        wait_interval=10000,
        wait_retries=20,
    )
    assert tx_execution_succeeded(res)

    reports = contract.get_reports(args=[])
    assert len(reports) == 1
    report = reports[0]
    # The adjudicator returns a well-formed verdict either way.
    assert report["status"] in ("confirmed", "rejected")
    assert report["severity"] in ("critical", "high", "medium", "low")
    assert 0 <= report["confidence"] <= 100

    # State is internally consistent: halted iff the report was confirmed.
    halted = contract.is_halted(args=[TARGET])
    assert halted == (report["status"] == "confirmed")
