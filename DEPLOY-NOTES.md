# Aegis deploy (GenLayer Studio Next, chain 61997)

- RPC: https://studio-dev.genlayer.com/api  (butuh header User-Agent non-python, CF 403 Python-urllib)
- Deployer: 0xf7ED2b1669EE11bD26c5811e0072ec40a54240f2 (sandbox Studio web UI, ~10 GEN)
  PK: ~/.hermes/secrets/aegis_deployer.pk (chmod 600, JANGAN commit / jangan paste ke chat)
- Run: cd ~/projects/aegis && AEGIS_DEPLOYER_PK=$(cat ~/.hermes/secrets/aegis_deployer.pk) .venv/bin/python /tmp/deploy_aegis_next.py
  (script juga ada di repo: salinan /tmp/deploy_aegis_next.py; scriptnya baca env AEGIS_DEPLOYER_PK)
- Build artifact dulu: .venv/bin/python scripts/build_deploy.py  -> build/aegis.deploy.py
- Contract API = GenVM v0.3.0 (lihat skill genlayer-contract-deploy pitfall J).
- Deployed address selalu dicatat di DEPLOYED.md (root proyek).
