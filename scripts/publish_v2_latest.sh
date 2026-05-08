#!/usr/bin/env bash
set -euo pipefail

WORKSPACE="/home/XiaomiaoClaw/.openclaw/workspace"
SRC_JSON="$WORKSPACE/reports/paper_digest/latest.json"
LOCAL_REPO="$WORKSPACE/projects/paper-digest-v2"
REPO_URL="https://github.com/Xiaomiao-Fsd/xiaomiao-paper-digest-v2.git"
BRANCH="main"
TMP_ROOT="${TMPDIR:-/tmp}/paper-digest-v2-sync"
REPO_DIR="$TMP_ROOT/repo"
PAGES_URL="https://xiaomiao-fsd.github.io/xiaomiao-paper-digest-v2/data/latest.json"
RAW_URL="https://raw.githubusercontent.com/Xiaomiao-Fsd/xiaomiao-paper-digest-v2/main/data/latest.json"

export HTTPS_PROXY="${HTTPS_PROXY:-http://127.0.0.1:7897}"
export HTTP_PROXY="${HTTP_PROXY:-http://127.0.0.1:7897}"

if [[ ! -s "$SRC_JSON" ]]; then
  echo "Source JSON missing or empty: $SRC_JSON" >&2
  exit 1
fi

src_generated_at="$(python3 - <<'PY' "$SRC_JSON"
import json, sys
with open(sys.argv[1], encoding='utf-8') as f:
    print(json.load(f).get('generated_at', ''))
PY
)"
if [[ -z "$src_generated_at" ]]; then
  echo "Source JSON has no generated_at: $SRC_JSON" >&2
  exit 1
fi

# Keep the workspace checkout in sync too, so local inspection matches the site source.
mkdir -p "$LOCAL_REPO/data"
cp "$SRC_JSON" "$LOCAL_REPO/data/latest.json"

mkdir -p "$TMP_ROOT"
rm -rf "$REPO_DIR"
git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$REPO_DIR"
mkdir -p "$REPO_DIR/data"
cp "$SRC_JSON" "$REPO_DIR/data/latest.json"

cd "$REPO_DIR"
git config user.name "OpenClaw"
git config user.email "openclaw@local"

if git diff --quiet -- data/latest.json; then
  echo "No v2 data changes to publish. Remote repo already matches generated_at=$src_generated_at."
else
  git add data/latest.json
  git commit -m "Update paper digest data"
  git push origin "$BRANCH"
  echo "Published v2 data/latest.json generated_at=$src_generated_at"
fi

read_remote_generated_at() {
  local url="$1"
  python3 - <<'PY' "$url"
import json, sys, urllib.request
url = sys.argv[1]
try:
    req = urllib.request.Request(url, headers={"Cache-Control": "no-cache", "Pragma": "no-cache"})
    with urllib.request.urlopen(req, timeout=20) as r:
        data = json.load(r)
    print(data.get("generated_at", ""))
except Exception as e:
    print(f"ERROR: {e}")
PY
}

# First verify the GitHub raw file. If raw is stale, the push did not really land.
raw_generated_at="$(read_remote_generated_at "$RAW_URL?cb=$(date +%s)")"
if [[ "$raw_generated_at" != "$src_generated_at" ]]; then
  echo "Raw GitHub verification failed: expected $src_generated_at, got $raw_generated_at" >&2
  exit 1
fi

# Then verify GitHub Pages. Pages can lag briefly, so retry with cache-busting.
pages_generated_at=""
for i in {1..12}; do
  pages_generated_at="$(read_remote_generated_at "$PAGES_URL?cb=$(date +%s)-$i")"
  if [[ "$pages_generated_at" == "$src_generated_at" ]]; then
    echo "Verified Pages latest.json generated_at=$pages_generated_at"
    exit 0
  fi
  echo "Pages latest.json still stale on check $i/12: expected $src_generated_at, got $pages_generated_at; retrying..." >&2
  sleep 10
done

echo "Pages verification failed after retry: expected $src_generated_at, got $pages_generated_at" >&2
exit 1
