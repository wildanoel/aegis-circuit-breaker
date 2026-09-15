"""Regression tests for the hardened address parser (_parse_address).

Clients differ on whether they keep the "0x" prefix, upper-case the hex, or
leave stray whitespace around an address. Raw Address() only accepts the
lower-case 42-char "0x..." form; everything else dies in its base64 branch
with an opaque binascii error. These tests pin that all equivalent spellings
land on the SAME registry key, and that genuinely malformed input reverts
with a readable UserError instead of an opaque VM failure.
"""

CONTRACT = "contracts/aegis.py"

TARGET = "0x1111111111111111111111111111111111111111"
OTHER = "0x2222222222222222222222222222222222222222"


def _register(contract, vm, owner, target=TARGET):
    vm.sender = owner
    contract.register_protection(target, "VaultX", "https://vaultx.xyz")


# --------------------------------------------------------------------------- #
# Equivalent spellings must normalize to one key
# --------------------------------------------------------------------------- #


def test_register_accepts_prefixless_hex(direct_vm, direct_deploy, direct_owner):
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner, TARGET[2:])
    protos = contract.get_protocols()
    assert len(protos) == 1
    assert list(protos.keys())[0].lower() == TARGET


def test_register_accepts_0x_upper_prefix(direct_vm, direct_deploy, direct_owner):
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner, "0X" + TARGET[2:])
    assert len(contract.get_protocols()) == 1


def test_register_accepts_surrounding_whitespace(
    direct_vm, direct_deploy, direct_owner
):
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner, "  " + TARGET + "  ")
    assert len(contract.get_protocols()) == 1


def test_all_spellings_collapse_to_one_key(direct_vm, direct_deploy, direct_owner):
    """Prefix-less, 0X, upper-case, padded: all are the SAME protocol."""
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner, TARGET)
    for spelling in (
        TARGET[2:],
        "0X" + TARGET[2:],
        TARGET.upper(),
        "  " + TARGET + "  ",
    ):
        with direct_vm.expect_revert("Protocol already registered"):
            _register(contract, direct_vm, direct_owner, spelling)
    assert len(contract.get_protocols()) == 1


def test_is_halted_matches_normalized_target(direct_vm, direct_deploy, direct_owner):
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)
    # view lookups by any equivalent spelling hit the same entry
    assert contract.is_halted(TARGET[2:]) is False
    assert contract.is_halted("0X" + TARGET[2:]) is False


# --------------------------------------------------------------------------- #
# Malformed input must revert with a readable UserError
# --------------------------------------------------------------------------- #


def test_too_short_reverts(direct_vm, direct_deploy, direct_owner):
    contract = direct_deploy(CONTRACT, 1000)
    with direct_vm.expect_revert("Address must be 20 hex bytes"):
        _register(contract, direct_vm, direct_owner, "0x1234")


def test_too_long_reverts(direct_vm, direct_deploy, direct_owner):
    contract = direct_deploy(CONTRACT, 1000)
    with direct_vm.expect_revert("Address must be 20 hex bytes"):
        _register(contract, direct_vm, direct_owner, TARGET + "ab")


def test_non_hex_reverts(direct_vm, direct_deploy, direct_owner):
    contract = direct_deploy(CONTRACT, 1000)
    with direct_vm.expect_revert("Address must be hexadecimal"):
        _register(contract, direct_vm, direct_owner, "0x" + "z" * 40)


def test_empty_reverts(direct_vm, direct_deploy, direct_owner):
    contract = direct_deploy(CONTRACT, 1000)
    with direct_vm.expect_revert("Address must be 20 hex bytes"):
        _register(contract, direct_vm, direct_owner, "")


def test_submit_report_prefixless_target_found(
    direct_vm, direct_deploy, direct_owner
):
    """A prefix-less target reports 'not protected' cleanly, not a VM crash."""
    contract = direct_deploy(CONTRACT, 1000)
    _register(contract, direct_vm, direct_owner)
    direct_vm.sender = direct_owner
    with direct_vm.expect_revert("Target is not a protected protocol"):
        contract.submit_report(OTHER[2:], "https://e.v", "bogus")
