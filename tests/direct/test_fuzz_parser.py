"""Fuzz: acak 300 input ke register_protection.

Setiap input harus berakhir di salah satu dari:
  - SUCCESS (ejaan valid)
  - revert dengan UserError kebaca ("Address must be ...")

Tidak boleh ada crash opaque (binascii, IndexError, TypeError mentah, dll).
"""

import random
import string

CONTRACT = "contracts/aegis.py"
GOOD = "1111111111111111111111111111111111111111"

CLEAN_ERRORS = (
    "Address must be",
    "not calldata encodable",  # ditolak lapisan calldata SDK (mis. float), belum sentuh kontrak
)


def test_fuzz_parser_never_opaque_crash(direct_vm, direct_deploy, direct_owner):
    random.seed(1337)
    contract = direct_deploy(CONTRACT, 1000)
    opaque = []
    for i in range(300):
        r = random.random()
        if r < 0.35:
            # garbage hex-ish
            s = "".join(
                random.choice(string.hexdigits + "zZ ")
                for _ in range(random.randint(0, 50))
            )
        elif r < 0.7:
            # valid address yang dimutasi (hapus/sisip/ganti karakter acak)
            chars = list(GOOD)
            for _ in range(random.randint(1, 3)):
                op = random.randint(0, 2)
                p = random.randrange(len(chars))
                if op == 0:
                    chars[p] = random.choice(string.printable[:80])
                elif op == 1:
                    chars.pop(p)
                else:
                    chars.insert(p, random.choice(string.printable[:80]))
            pre = random.choice(["", "0x", "0X", " ", "  0x"])
            s = pre + "".join(chars)
        else:
            # tipe aneh
            s = random.choice([None, 12345, b"\x01\x02", [], {}, True, 3.14])

        direct_vm.sender = direct_owner
        try:
            if i % 25 == 0:
                # target baru -> ejaan valid harus SUCCESS
                contract.register_protection(
                    f"{i:040x}", "L", "https://x.y"
                )
            else:
                contract.register_protection(s, "L", "https://x.y")
        except Exception as e:
            msg = str(e)
            if not any(c in msg for c in CLEAN_ERRORS):
                opaque.append((i, repr(s)[:60], msg[:120]))

    assert not opaque, f"OPAQUE crash ditemukan: {opaque[:5]}"
