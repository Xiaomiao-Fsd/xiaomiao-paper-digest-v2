#!/usr/bin/env bash
set -euo pipefail

WORKSPACE="/home/XiaomiaoClaw/.openclaw/workspace"
SRC_JSON="$WORKSPACE/reports/paper_digest/latest.json"
REPO_URL="https://github.com/Xiaomiao-Fsd/xiaomiao-paper-digest-v2.git"
BRANCH="main"
TMP_ROOT="${TMPDIR:-/tmp}/paper-digest-v2-sync"
REPO_DIR="$TMP_ROOT/repo"

export HTTPS_PROXY="${HTTPS_PROXY:-http://127.0.0.1:7897}"
export HTTP_PROXY="${HTTP_PROXY:-http://127.0.0.1:7897}"

mkdir -p "$TMP_ROOT"
rm -rf "$REPO_DIR"
git clone --branch "$BRANCH" --single-branch "$REPO_URL" "$REPO_DIR"
mkdir -p "$REPO_DIR/data"
cp "$SRC_JSON" "$REPO_DIR/data/latest.json"

cd "$REPO_DIR"
git config user.name "OpenClaw"
git config user.email "openclaw@local"

if git diff --quiet -- data/latest.json; then
  echo "No v2 data changes to publish."
  exit 0
fi

git add data/latest.json
git commit -m "Update paper digest data"
git push origin "$BRANCH"
echo "Published v2 data/latest.json"
