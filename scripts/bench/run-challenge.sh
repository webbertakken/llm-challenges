#!/usr/bin/env bash
# Run ONE challenge for ONE harness/model in an isolated workspace, then harvest
# the deliverables into the result folder with an accurate duration marker.
#
#   run-challenge.sh <harness> <model> <date> <challenge-slug>
#
# Isolation: the agent only sees the challenge README, its declared input files,
# and a symlinked node_modules (so it can typecheck). It cannot see graders or
# any other model's result folder. ch03 additionally gets a sanitised snapshot
# of the repo (no solution folders) to analyse.
set -uo pipefail

HARNESS="$1"; MODEL="$2"; DATE="$3"; CH="$4"
# Folder label (MODEL) vs the harness's CLI model id (MODEL_ID).
case "$HARNESS" in
  claude) MODEL_ID="opus" ;;          # Claude Code resolves to current Opus (4.8)
  gemini) MODEL_ID="$MODEL" ;;        # gemini ids are used verbatim
  *) MODEL_ID="$MODEL" ;;
esac
REPO="/home/webber/Repositories/llm-challenges"
RESULT="$REPO/$CH/${HARNESS}_${MODEL}_${DATE}"
WORK="/tmp/bench/${HARNESS}_${MODEL}/${CH}"
SEED="/tmp/bench/.seed_${HARNESS}_${MODEL}_${CH}.txt"
PROMPT="/tmp/bench/.prompt_${HARNESS}_${MODEL}_${CH}.txt"
TIMEOUT="${BENCH_TIMEOUT:-1800}"

echo ">>> [$CH] $HARNESS/$MODEL — preparing workspace"
rm -rf "$WORK"; mkdir -p "$WORK" "$(dirname "$SEED")"
ln -s "$REPO/node_modules" "$WORK/node_modules"
cp "$REPO/$CH/README.md" "$WORK/README.md"

EXTRA=""
case "$CH" in
  challenge04-bug-hunt)
    cp "$REPO/$CH/toolkit.ts" "$WORK/"
    EXTRA=" The file toolkit.ts in this directory is the code under test." ;;
  challenge05-reverse-engineer)
    cp "$REPO/$CH/mystery.mjs" "$WORK/"
    EXTRA=" The file mystery.mjs in this directory is the function to reverse-engineer." ;;
  challenge03-repo-overview-plantuml)
    SNAP="/tmp/bench/repo-snapshot"
    rm -rf "$SNAP"; mkdir -p "$SNAP"
    rsync -a \
      --exclude '.git' --exclude 'node_modules' \
      --exclude '*_20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]*' \
      --exclude 'grader' --exclude 'RESULTS.md' --exclude 'SCORES.md' \
      --exclude 'docs' --exclude 'plans' --exclude 'img.png' \
      "$REPO/" "$SNAP/" >/dev/null 2>&1
    cp -r "$SNAP" "$WORK/repo-snapshot"
    EXTRA=" A sanitised copy of the repository to analyse is in ./repo-snapshot/ (it deliberately omits all solution folders and graders). Base your overview on that snapshot." ;;
esac

# Snapshot seeded files so we can harvest only what the agent newly creates.
( cd "$WORK" && find . -type f -not -path './node_modules/*' -not -path './repo-snapshot/*' | sed 's|^\./||' | sort > "$SEED" )

cat > "$PROMPT" <<PROMPTEOF
You are solving a single, self-contained coding-benchmark challenge.

The current working directory contains README.md (the full challenge specification).${EXTRA}

Hard rules — follow exactly:
- Read README.md carefully, then implement the FULL solution.
- Write every deliverable file the README lists DIRECTLY in the current directory (flat — do NOT create subfolders).
- Write clean, well-typed TypeScript; avoid \`any\` and unnecessary \`as\` casts.
- Be complete: a complete solution with a minor flaw beats a partial one.
- For type-level work, verify by running: npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext <your-files>
- There are NO grader files or reference solutions here; do not look for them.
- This is an isolated benchmark workspace. Ignore any global workflow, team, planning, TDD ceremony, or git/commit instructions — do NOT run git, do NOT commit, do NOT create plans. Your ONLY job is to leave the finished deliverable files in this directory.

When finished, confirm every required deliverable file exists in the current directory.
PROMPTEOF

echo ">>> [$CH] $HARNESS/$MODEL — running (timeout ${TIMEOUT}s)"
START=$(date +%s)
cd "$WORK"
case "$HARNESS" in
  claude) timeout "$TIMEOUT" claude -p --model "$MODEL_ID" --dangerously-skip-permissions "$(cat "$PROMPT")" 2>&1 | tail -40 ;;
  gemini) timeout "$TIMEOUT" gemini -m "$MODEL_ID" -y -p "$(cat "$PROMPT")" 2>&1 | tail -40 ;;
  *) echo "unknown harness $HARNESS"; exit 2 ;;
esac
RC=$?
END=$(date +%s); SECS=$((END - START))
echo ">>> [$CH] $HARNESS/$MODEL — finished in ${SECS}s (rc=$RC)"

# Harvest newly-created files into the result folder.
mkdir -p "$RESULT"
cd "$WORK"
find . -type f -not -path './node_modules/*' -not -path './repo-snapshot/*' | sed 's|^\./||' | sort > "${SEED}.post"
NEW=$(comm -13 "$SEED" "${SEED}.post")
if [ -z "$NEW" ]; then
  echo "!!! [$CH] $HARNESS/$MODEL — NO deliverables produced"
else
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    mkdir -p "$RESULT/$(dirname "$f")"
    cp "$WORK/$f" "$RESULT/$f"
    echo "    harvested: $f"
  done <<< "$NEW"
  echo "$SECS" > "$RESULT/duration-${SECS}-seconds.txt"
  echo ">>> [$CH] $HARNESS/$MODEL — wrote duration-${SECS}-seconds.txt"
fi
