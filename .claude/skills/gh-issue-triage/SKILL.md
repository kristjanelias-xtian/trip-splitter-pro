---
name: gh-issue-triage
description: Triage open GitHub issues — group by topic, cross-reference existing fixes, then resolve each group with a focused PR.
---

# GitHub Issue Triage

Autonomously triage, group, cross-reference, and resolve open GitHub issues — one topic group per PR, no mixing.

## Instructions

When the user invokes this skill, perform the following steps in order:

### 0. Read Project Context (MANDATORY — do not skip)

**Before doing anything else**, use the Read tool to read these files from the repo root:

1. **`CLAUDE.md`** — project conventions, architecture, safety rules, access model, common pitfalls. **You must read this file in full.** It contains critical rules (auth safety, RLS access model, timeout architecture) that constrain how fixes can be implemented.
2. **`PLAN.md`** — feature roadmap, completed phases, known issues. **You must read this file in full.** It tells you what has already been built and what issues may already be resolved by completed work.
3. **`AUDIT.md`** — audit findings, already-addressed items (if it exists).

**Do not proceed to step 1 until you have read CLAUDE.md and PLAN.md.** The information in these files is essential for:
- Correctly classifying issues as ALREADY FIXED vs NEW
- Understanding architecture constraints before proposing fixes
- Avoiding safety violations (auth deadlocks, RLS breakage, timeout misuse)
- Following the project's git workflow and coding conventions

### 1. Fetch All Open Issues

```bash
gh issue list --state open --json number,title,body,labels,createdAt,updatedAt,comments --limit 200
```

Display a quick summary: total count and titles.

### 1b. Read Issue Comments and Attached Images

For each open issue, fetch comments to get the full context:

```bash
gh issue view <number> --json body,comments
```

**Comments often contain critical context** — reproduction steps, "actually this is about X", confirmations that a fix worked, or additional screenshots. Do not skip this step.

**Attached images** (screenshots, recordings): GitHub issues embed images as markdown `![alt](https://...)` in the body and comments. To view these:

1. Extract image URLs from the issue body and comment markdown
2. Download them directly using `curl` — they are publicly accessible URLs:
   ```bash
   curl -L -o /tmp/issue-<number>-img-1.png "https://github.com/user-attachments/assets/..."
   ```
3. Use the Read tool to view the downloaded image files

**Do NOT use Playwright MCP to screenshot issue pages.** The `gh` CLI + `curl` gives you everything — body, comments, and image attachments — without needing a browser.

### 2. Group and Deduplicate

Analyze the issues and organize them into **topic groups**:

- Group issues that describe the same bug, feature area, or component
- Flag duplicates explicitly (same root cause or identical request)
- Each group gets a short topic label (e.g., "iOS keyboard handling", "settlement calculation", "dark mode")

### 3. Cross-Reference Existing Fixes

For each group, check:

- **PLAN.md**: Was this addressed in a completed phase?
- **AUDIT.md**: Was this flagged and resolved?
- **Recent commits**: `git log --oneline -50` — was a fix already merged?
- **Closed issues/PRs**: `gh issue list --state closed --limit 50` / `gh pr list --state merged --limit 50`

Classify each group:

| Status | Meaning |
|--------|---------|
| **ALREADY FIXED** | Code fix exists, issue can be closed with a comment pointing to the fix |
| **NEW** | Genuine unresolved issue requiring code changes |
| **INVALID** | Not a real bug, misunderstanding, or out of scope |
| **DUPLICATE** | Covered by another open issue (close with cross-reference) |

### 4. Present Triage Report

Before making any changes, present the full triage analysis:

```
## Triage Report

### Group 1: [Topic] — ALREADY FIXED
Issues: #12, #15
Fixed in: PR #140 / commit abc1234
Action: Close with comment

### Group 2: [Topic] — NEW (Priority: High)
Issues: #18, #22
Affected files: src/components/...
Plan: [brief fix description]

### Group 3: [Topic] — DUPLICATE
Issues: #20 (duplicate of #18)
Action: Close #20, reference #18
```

**Wait for user approval** before proceeding to fixes.

### 5. Close Already-Fixed and Duplicate Issues

For **ALREADY FIXED** issues:
```bash
gh issue close <number> --comment "This was fixed in PR #N / commit SHA. Closing."
```

For **DUPLICATE** issues:
```bash
gh issue close <number> --comment "Duplicate of #N. Closing in favor of that issue."
```

For **INVALID** issues:
```bash
gh issue close <number> --comment "Closing as not applicable — [brief reason]."
```

### 6. Fix NEW Issues — One Group at a Time

For each NEW group, in priority order:

1. **Create a branch**: `git checkout -b fix/topic-description`
2. **Read affected files** before making changes
3. **Implement the fix** — address all issues in the group
4. **Run checks**:
   ```bash
   npm run type-check   # must pass clean
   npm test             # must pass
   ```
5. **Commit**: Message references all issues in the group
6. **Push and open PR**:
   ```bash
   git push -u origin fix/topic-description
   gh pr create --title "fix: [topic] — closes #N, #N" --body "..."
   ```
7. **Squash-merge the PR**:
   ```bash
   gh pr merge <N> --squash --delete-branch
   git checkout main && git pull
   ```
8. **Close resolved issues** (if not auto-closed by PR):
   ```bash
   gh issue close <number> --comment "Fixed in PR #N."
   ```
9. Move to the next group — do NOT start the next group until the current PR is merged

### 7. Final Summary

After all groups are processed, present:

- Issues closed (with reasons)
- PRs opened/merged
- Any issues left open and why

## Safety Rules

- **Never close an issue** without a confirmed code fix or verified existing fix
- **Never touch auth code** without re-reading the auth safety rule in CLAUDE.md
- **Never touch RLS or DB access** without re-reading the access model in CLAUDE.md
- **Always run type-check and tests** before opening a PR — they must pass clean
- **One PR per topic group** — never mix unrelated fixes
- **Wait for user approval** after presenting the triage report before making changes
- **Ask before closing** any issue classified as INVALID — the user may disagree
- If a fix is complex or risky, describe the approach and get confirmation before implementing
