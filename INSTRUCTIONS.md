# Instructions for LLM Agents

You are solving TypeScript benchmark challenges. Follow these rules precisely.

## Step 1: Identify Yourself

Determine your **harness** and **model** to form your results folder name:

```
challengeNN/[harness]--[model]--[YYYY-MM-DD]/
```

- **harness**: the coding agent you're running in (e.g. `claude`, `pi`, `qwen`, `aider`, `cursor`)
- **model**: the LLM you are (e.g. `sonnet-4`, `opus-4`, `deepseek-r1`, `gpt-4o`, `qwen-coder`)
- **date**: the date of the run (YYYY-MM-DD)

Use lowercase, hyphens for spaces. Examples:
- `challenge01/claude--sonnet-4--2026-04-03`
- `challenge01/pi--deepseek-r1--2026-04-03`
- `challenge01/qwen--qwen-coder--2026-04-03`
- `challenge01/aider--gpt-4o--2026-04-03`

If you're unsure of your harness or model, ask the user.

## Step 2: Pick a Challenge

Read the challenge README at `challengeNN/README.md`. It contains the full specification.

## Step 3: Write Your Solution

Create your solution files **directly** in:

```
challengeNN/[harness]--[model]--[YYYY-MM-DD]/
```

For example, if you are Claude Sonnet 4 running in the `claude` CLI, solving challenge 01:

```
challenge01/claude--sonnet-4--2026-04-03/
  types.ts
  tests.ts
  examples.ts
```

**Do NOT create a `solution/` subfolder** — place all files directly in your results folder.

## Step 4: Verify

After writing your solution, verify it compiles:

```bash
cd challengeNN/[harness]--[model]--[YYYY-MM-DD]
npx tsgo --noEmit --strict --target ES2022 --module Node16 --moduleResolution Node16
```

If the challenge has runtime tests, run them:

```bash
npx tsx tests.ts
```

## Step 5: Record Timing

Before writing any solution files, create an empty timing marker file in your results folder:

```bash
touch challengeNN/[harness]--[model]--[YYYY-MM-DD]/duration.txt
```

After finishing the challenge, measure the elapsed time from `duration.txt`'s creation to now, write the number of seconds into the file, and rename it:

```bash
dir="challengeNN/[harness]--[model]--[YYYY-MM-DD]"
start=$(stat -c %Y "$dir/duration.txt")
now=$(date +%s)
secs=$((now - start))
echo "$secs" > "$dir/duration.txt"
mv "$dir/duration.txt" "$dir/duration-${secs}-seconds.txt"
```

This produces e.g. `challenge01/pi--opus-4.6--2026-04-03/duration-58-seconds.txt` containing `58`.

## Rules

- Read **only** the challenge README and this instructions file
- **Do NOT read, open, or reference anything inside `results/`** — other models' solutions live there and looking at them invalidates your run
- Write clean, well-typed TypeScript — avoid `any` and unnecessary `as` casts
- Follow the deliverables listed in the challenge README exactly
- Include all required files
- Be complete — partial solutions are scored lower than full solutions with minor issues