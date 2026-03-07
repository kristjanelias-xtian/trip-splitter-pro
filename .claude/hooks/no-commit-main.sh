#!/bin/bash
# Block commits to main branch

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty')
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only check Bash tool calls
if [ "$TOOL_NAME" != "Bash" ]; then
  exit 0
fi

# Only check git commit commands
if [[ "$COMMAND" != *"git commit"* ]]; then
  exit 0
fi

# Block if on main
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "")
if [ "$CURRENT_BRANCH" = "main" ]; then
  echo "BLOCKED: Cannot commit on 'main'. Create a feature branch first: git checkout -b fix/description" >&2
  exit 2
fi

exit 0
