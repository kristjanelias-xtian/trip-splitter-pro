---
name: pr-branch-maintenance
description: Check and maintain PR branches - identify stale branches, show sync status, and offer rebase/merge actions.
---

# PR Branch Maintenance

Skill for keeping PR branches up-to-date and identifying stale work.

## Instructions

When the user invokes this skill, perform the following steps:

### 1. Current Branch Sync Check

First, check if the user's current branch is out of sync with its base:

```bash
# Get current branch
current=$(git branch --show-current)

# Find the base branch (usually main or master)
base=$(git remote show origin | grep 'HEAD branch' | awk '{print $NF}')

# Fetch latest from remote
git fetch origin "$base" --quiet

# Check how far behind
behind=$(git rev-list --count "HEAD..origin/$base")
ahead=$(git rev-list --count "origin/$base..HEAD")
```

If the current branch is behind, **warn the user immediately**:
- Show how many commits behind
- Ask if they want to rebase before continuing work

### 2. Scan All PR Branches

List all branches with open PRs and their sync status:

```bash
# Get all open PRs with branch info
gh pr list --state open --json number,title,headRefName,baseRefName,updatedAt --jq '.[] | "\(.number)\t\(.headRefName)\t\(.baseRefName)\t\(.updatedAt)\t\(.title)"'
```

For each PR branch:
- Fetch the base branch: `git fetch origin <base> --quiet`
- Count commits behind: `git rev-list --count <branch>..origin/<base>`
- Calculate days since last update from `updatedAt`

### 3. Report Format

Present results in a table:

```
PR #  | Branch              | Behind | Last Updated | Status
------|---------------------|--------|--------------|--------
#42   | fix/loading-hang    | 0      | 2h ago       | Up to date
#38   | feature/oauth       | 12     | 5d ago       | Needs rebase
#35   | fix/old-bug         | 28     | 14d ago      | STALE
```

Status definitions:
- **Up to date**: 0 commits behind base
- **Needs rebase**: 1+ commits behind base
- **STALE**: No updates in 7+ days AND behind base

### 4. Offer Actions

After showing the report, offer these actions:

- **Rebase a branch**: `git checkout <branch> && git rebase origin/<base> && git push --force-with-lease`
- **Merge base into branch**: `git checkout <branch> && git merge origin/<base> && git push`
- **Rebase all outdated branches**: Loop through all behind branches and rebase each
- **Close stale PRs**: Use `gh pr close <number>` for abandoned work

### 5. Safety Rules

- Always use `--force-with-lease` instead of `--force` when pushing after rebase
- Before rebasing, check for uncommitted changes and stash them
- After rebase, verify the branch still builds (run `npm run type-check` or equivalent if available)
- Never force-push to main/master
- Ask for confirmation before closing any PR
- If rebase has conflicts, stop and report them to the user rather than attempting automatic resolution
