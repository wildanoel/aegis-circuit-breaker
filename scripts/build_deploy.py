#!/usr/bin/env python3
"""Build the deploy artifact from contracts/aegis.py.

studio-dev derives a transaction's execution budget from its calldata
(bytes * 16 * 250M gas). A 19.4KB source file overflows the auto-budget by
~2T gas and the deploy dies with FINISHED_WITH_ERROR even though consensus
agrees. Shipping a comment-free artifact with an identical AST (docstrings
removed, which are runtime no-ops) brings the calldata far under budget.

Output: build/aegis.deploy.py
- line 1 keeps the {"Depends": ...} pin (GenVM requires it first)
- AST must equal contracts/aegis.py minus docstrings (asserted here)
- tests run against the source; the artifact is a build product only
"""
import ast
import sys
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "contracts" / "aegis.py"
# NOTE: NOT under artifacts/ - gltest wipes that folder on startup as its own
# compile cache. build/ is ours.
OUT = ROOT / "build" / "aegis.deploy.py"


def strip_docstrings(tree: ast.Module) -> ast.Module:
    for node in ast.walk(tree):
        if isinstance(node, (ast.Module, ast.ClassDef, ast.FunctionDef, ast.AsyncFunctionDef)):
            body = node.body
            if (
                body
                and isinstance(body[0], ast.Expr)
                and isinstance(body[0].value, ast.Constant)
                and isinstance(body[0].value.value, str)
            ):
                node.body = body[1:] or [ast.Pass()]
    return tree


def main() -> int:
    src = SRC.read_text()
    depends = next(
        (ln for ln in src.splitlines() if ln.startswith("#") and "Depends" in ln),
        None,
    )
    if depends is None:
        print("FATAL: Depends pin not found in contracts/aegis.py", file=sys.stderr)
        return 1

    reference = strip_docstrings(ast.parse(src))
    body = ast.unparse(reference)
    artifact = depends + "\n\n" + body + "\n"

    # the artifact must parse back to the exact same tree
    if ast.dump(ast.parse(artifact)) != ast.dump(reference):
        print("FATAL: artifact AST diverges from source", file=sys.stderr)
        return 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(artifact)
    print(f"source:   {SRC}  {len(src.encode()):6d} bytes")
    print(f"artifact: {OUT}  {len(artifact.encode()):6d} bytes")
    print(f"savings:  {len(src.encode()) - len(artifact.encode()):6d} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main())
