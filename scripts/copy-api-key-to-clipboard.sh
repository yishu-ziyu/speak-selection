#!/usr/bin/env bash
# Copy MiniMax API key to the clipboard without printing it.
set -euo pipefail

python3 - <<'PY'
import os, plistlib, subprocess, sys, tempfile
from pathlib import Path

def from_env_local():
    p = Path.home() / ".config" / "ai-providers" / "env.local"
    if not p.exists():
        return ""
    for line in p.read_text(encoding="utf-8", errors="ignore").splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        if k.strip() in {"MINIMAX_API_KEY", "MINIMAX_TOKEN_PLAN_KEY"}:
            val = v.strip().strip('"').strip("'")
            if val:
                return val
    return ""

def from_shangqiuko():
    try:
        raw = subprocess.check_output(
            ["defaults", "export", "com.mahaoxuan.shangqiuko.hermespet", "-"],
            stderr=subprocess.DEVNULL,
        )
        data = plistlib.loads(raw)
        return (data.get("minimaxTTSAPIKey") or "").strip()
    except Exception:
        return ""

key = (os.environ.get("MINIMAX_API_KEY") or "").strip() or from_env_local() or from_shangqiuko()
if not key:
    print("key_set=false", file=sys.stderr)
    print("No MiniMax key found in env, ~/.config/ai-providers/env.local, or Shangqiuko defaults.", file=sys.stderr)
    sys.exit(1)
proc = subprocess.run(["pbcopy"], input=key.encode("utf-8"), check=True)
print(f"key_set=true copied=true length={len(key)} prefix={key[:5]}…")
print("Paste it into the extension options page. The clipboard holds the key.")
PY
