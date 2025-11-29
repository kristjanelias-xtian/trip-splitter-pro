#!/usr/bin/env node

/**
 * Claude GitHub Issue Handler
 *
 * This script processes GitHub issues and uses Claude API to generate
 * code implementations, which are then committed to create a PR.
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const ISSUE_NUMBER = process.env.ISSUE_NUMBER;
const ISSUE_TITLE = process.env.ISSUE_TITLE;
const ISSUE_BODY = process.env.ISSUE_BODY;
const REPOSITORY = process.env.REPOSITORY;

if (!ANTHROPIC_API_KEY) {
  console.error('❌ ANTHROPIC_API_KEY is not set');
  process.exit(1);
}

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

// Read key project files for context
async function getProjectContext() {
  const contextFiles = [
    'package.json',
    'CLAUDE.md',
    'README.md',
    'tsconfig.json',
  ];

  const context = {};
  for (const file of contextFiles) {
    try {
      context[file] = await fs.readFile(file, 'utf-8');
    } catch (error) {
      console.log(`⚠️  Could not read ${file}: ${error.message}`);
    }
  }

  return context;
}

// Get list of existing files in src/
async function getExistingFiles() {
  try {
    const output = execSync('find src -type f -name "*.ts" -o -name "*.tsx" | head -50', {
      encoding: 'utf-8',
    });
    return output.trim().split('\n').filter(Boolean);
  } catch (error) {
    console.log('⚠️  Could not list existing files');
    return [];
  }
}

// Main handler function
async function handleIssue() {
  console.log(`🤖 Processing issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}`);

  // Get project context
  console.log('📚 Reading project context...');
  const projectContext = await getProjectContext();
  const existingFiles = await getExistingFiles();

  // Build the prompt for Claude
  const systemPrompt = `You are an expert software engineer working on a React + TypeScript project with Vite, Tailwind CSS, and Supabase.

Your task is to implement the requested changes from a GitHub issue. You should:
1. Analyze the issue description
2. Determine which files need to be created or modified
3. Generate the complete implementation
4. Respond with a JSON array of file changes

Project Context:
${Object.entries(projectContext).map(([file, content]) => `
### ${file}
\`\`\`
${content.substring(0, 2000)}${content.length > 2000 ? '...' : ''}
\`\`\`
`).join('\n')}

Existing files in src/:
${existingFiles.join('\n')}

Response format (MUST be valid JSON):
[
  {
    "path": "src/components/Example.tsx",
    "content": "complete file content here",
    "action": "create" or "update"
  }
]`;

  const userPrompt = `GitHub Issue #${ISSUE_NUMBER}: ${ISSUE_TITLE}

${ISSUE_BODY}

Please implement this feature/fix. Respond with a JSON array of file changes as specified in the system prompt.`;

  console.log('🧠 Calling Claude API...');

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 16000,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const responseText = message.content[0].text;
    console.log('📝 Received response from Claude');

    // Extract JSON from response (handle markdown code blocks)
    let jsonText = responseText;
    const jsonMatch = responseText.match(/```json\n([\s\S]*?)\n```/);
    if (jsonMatch) {
      jsonText = jsonMatch[1];
    } else if (responseText.match(/```\n([\s\S]*?)\n```/)) {
      jsonText = responseText.match(/```\n([\s\S]*?)\n```/)[1];
    }

    // Parse the file changes
    let fileChanges;
    try {
      fileChanges = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('❌ Failed to parse Claude response as JSON');
      console.error('Response:', responseText);
      throw parseError;
    }

    if (!Array.isArray(fileChanges)) {
      console.error('❌ Response is not an array');
      throw new Error('Invalid response format');
    }

    console.log(`📁 Processing ${fileChanges.length} file changes...`);

    // Apply the file changes
    for (const change of fileChanges) {
      const { path: filePath, content, action } = change;

      console.log(`  ${action === 'create' ? '✨' : '📝'} ${filePath}`);

      // Create directory if it doesn't exist
      const dir = path.dirname(filePath);
      await fs.mkdir(dir, { recursive: true });

      // Write the file
      await fs.writeFile(filePath, content, 'utf-8');

      // Stage the file
      execSync(`git add "${filePath}"`);
    }

    console.log('✅ All changes applied successfully');

    // Create a summary file for the PR description
    const summary = {
      issue_number: ISSUE_NUMBER,
      issue_title: ISSUE_TITLE,
      files_changed: fileChanges.length,
      files: fileChanges.map((c) => ({
        path: c.path,
        action: c.action,
      })),
    };

    await fs.writeFile(
      '.github/claude-summary.json',
      JSON.stringify(summary, null, 2)
    );

    console.log('🎉 Issue processing complete!');
  } catch (error) {
    console.error('❌ Error processing issue:', error);
    throw error;
  }
}

// Run the handler
handleIssue().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
