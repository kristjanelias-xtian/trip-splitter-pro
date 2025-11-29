# Claude GitHub Automation Setup Guide

This guide explains how to set up the automated GitHub issue-to-PR workflow using Claude API.

## Overview

Once configured, this automation allows you to:
1. Create a GitHub issue from any device
2. Label it with `claude` or mention `@claude` in a comment
3. Claude automatically implements the changes and creates a PR
4. Review and merge the PR from anywhere
5. Cloudflare Pages automatically deploys the new version

## Prerequisites

- GitHub repository access (you already have this)
- Anthropic API key (Claude API access)
- Repository admin rights to add secrets

## Setup Steps

### 1. Get Your Anthropic API Key

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Sign in or create an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the key (it looks like `sk-ant-...`)

**Important:** Save this key securely - you'll only see it once!

### 2. Add API Key to GitHub Secrets

1. Go to your repository on GitHub: `https://github.com/kristjanelias-xtian/trip-splitter-pro`
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `ANTHROPIC_API_KEY`
5. Value: Paste your Claude API key
6. Click **Add secret**

### 3. Install Dependencies

After pushing the changes from this setup, install the new dependency:

```bash
npm install
```

This will install `@anthropic-ai/sdk` which the GitHub Action needs.

### 4. Push the Automation Files

The automation consists of:
- `.github/workflows/claude-issue-handler.yml` - GitHub Actions workflow
- `.github/scripts/claude-handler.js` - Claude API integration script
- Updated `package.json` - Added @anthropic-ai/sdk dependency

These files need to be committed and pushed to GitHub:

```bash
git add .github/ package.json
git commit -m "Add Claude automation for issue-to-PR workflow"
git push
```

## How to Use

### Option 1: Label-Based Triggering

1. Create a new issue on GitHub
2. Add the label `claude` to the issue
3. The workflow automatically triggers
4. Wait 1-3 minutes for the PR to be created
5. Review and merge the PR

### Option 2: Comment-Based Triggering

1. Create a new issue on GitHub (no label needed)
2. Add a comment mentioning `@claude`
3. The workflow automatically triggers
4. Wait 1-3 minutes for the PR to be created
5. Review and merge the PR

## Example Issue Format

**Title:**
```
Add dark mode toggle to settings
```

**Body:**
```
Add a dark mode toggle button to the settings page that allows users to switch
between light and dark themes. The preference should be saved to local storage
and persist across sessions.

Files to modify:
- src/pages/SettingsPage.tsx - Add toggle button
- src/App.tsx - Add theme context provider
- index.html - Add dark class toggle logic
```

**Label:** `claude`

## What Happens Behind the Scenes

1. **Trigger:** Issue created with `claude` label or `@claude` mentioned
2. **Context Gathering:** Workflow reads project files (CLAUDE.md, package.json, etc.)
3. **Claude API Call:** Sends issue details + project context to Claude
4. **Code Generation:** Claude analyzes and generates implementation
5. **File Changes:** Script creates/modifies files based on Claude's response
6. **PR Creation:** Creates a new branch and pull request
7. **Notification:** You get notified about the new PR
8. **Review:** You review the changes
9. **Merge:** You merge when satisfied
10. **Deploy:** Cloudflare Pages automatically builds and deploys

## Workflow File Location

- Main workflow: `.github/workflows/claude-issue-handler.yml`
- Handler script: `.github/scripts/claude-handler.js`

## Monitoring

### Check Workflow Status

1. Go to **Actions** tab in your GitHub repository
2. Look for "Claude Issue Handler" workflows
3. Click on a run to see logs and details

### Debugging

If the workflow fails:
1. Check the **Actions** tab for error logs
2. Common issues:
   - Missing `ANTHROPIC_API_KEY` secret
   - Invalid API key
   - Claude API rate limits
   - Invalid JSON response from Claude

## Security Considerations

- ✅ API key is stored securely in GitHub Secrets (encrypted)
- ✅ Workflow has minimal permissions (contents, issues, PRs only)
- ✅ PRs are created with `automated-pr` label for easy identification
- ✅ You always review before merging
- ⚠️ Never commit API keys to the repository
- ⚠️ Review all automated PRs carefully before merging

## Cost Considerations

- Each issue triggers one Claude API call
- Estimated cost: $0.05 - $0.50 per issue (depending on complexity)
- Claude Sonnet 4 pricing: ~$3 per million input tokens, ~$15 per million output tokens
- Set up billing alerts in Anthropic Console to monitor usage

## Limitations

- Cannot access private repository files not in the main branch
- Limited to changes that can be made via file modifications
- Complex refactoring may require manual intervention
- Claude's response quality depends on issue clarity

## Best Practices

1. **Write Clear Issues:**
   - Be specific about what needs to change
   - Mention relevant file paths
   - Include examples if applicable

2. **Review Carefully:**
   - Always review automated PRs before merging
   - Run tests locally if available
   - Check for potential security issues

3. **Iterative Improvements:**
   - If first attempt isn't perfect, provide feedback in PR comments
   - Create a new issue for refinements

4. **Monitor Usage:**
   - Check Anthropic Console for API usage
   - Set billing alerts to avoid surprises

## Troubleshooting

### Workflow doesn't trigger
- Verify issue has `claude` label
- Check if `@claude` is mentioned in comment
- Ensure workflow file is in `.github/workflows/`

### PR not created
- Check Actions tab for error logs
- Verify `ANTHROPIC_API_KEY` is set correctly
- Check if API key has sufficient credits

### Changes are incorrect
- Issue description may have been unclear
- Create new issue with more specific instructions
- Or manually edit the PR before merging

## Support

If you encounter issues:
1. Check the **Actions** tab logs
2. Review this documentation
3. Check Anthropic API status page
4. Review Claude API documentation at https://docs.anthropic.com/

## Future Enhancements

Potential improvements to consider:
- Add automated tests before creating PR
- Integration with code review tools
- Slack/Discord notifications when PR is ready
- Support for issue templates
- Multi-step iterations based on feedback
