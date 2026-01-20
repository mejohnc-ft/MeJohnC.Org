#!/usr/bin/env node

/**
 * Update Changelog Script
 *
 * Automatically updates CHANGELOG.md when running `npm version`
 * Moves [Unreleased] content to a new version section
 *
 * Usage: This script runs automatically via npm version hook
 * Manual: node scripts/update-changelog.js [version]
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHANGELOG_PATH = join(__dirname, '..', 'CHANGELOG.md');

function getVersion() {
  // Get version from command line arg or package.json
  if (process.argv[2]) {
    return process.argv[2].replace(/^v/, '');
  }

  const packagePath = join(__dirname, '..', 'package.json');
  const packageJson = JSON.parse(readFileSync(packagePath, 'utf8'));
  return packageJson.version;
}

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function updateChangelog(version) {
  console.log(`Updating CHANGELOG.md for version ${version}...`);

  let content = readFileSync(CHANGELOG_PATH, 'utf8');

  // Check if [Unreleased] section has content
  const unreleasedMatch = content.match(/## \[Unreleased\]\n([\s\S]*?)(?=\n## \[|$)/);

  if (!unreleasedMatch) {
    console.log('No [Unreleased] section found. Skipping changelog update.');
    return;
  }

  const unreleasedContent = unreleasedMatch[1].trim();

  if (!unreleasedContent || unreleasedContent === '') {
    console.log('[Unreleased] section is empty. Skipping changelog update.');
    return;
  }

  const today = getToday();
  const newVersionSection = `## [${version}] - ${today}\n\n${unreleasedContent}`;

  // Replace [Unreleased] content with empty section and add new version
  content = content.replace(
    /## \[Unreleased\]\n[\s\S]*?(?=\n## \[)/,
    `## [Unreleased]\n\n${newVersionSection}\n\n## [`
  );

  // Update comparison links at bottom
  const repoUrl = 'https://github.com/MeJohnC/MeJohnC.Org';

  // Find the previous version for comparison link
  const versionMatch = content.match(/\[(\d+\.\d+\.\d+)\]: /);
  const previousVersion = versionMatch ? versionMatch[1] : null;

  if (previousVersion && previousVersion !== version) {
    // Update [Unreleased] link
    content = content.replace(
      /\[Unreleased\]: .+/,
      `[Unreleased]: ${repoUrl}/compare/v${version}...HEAD`
    );

    // Add new version comparison link if it doesn't exist
    if (!content.includes(`[${version}]:`)) {
      const linkSection = content.match(/\[Unreleased\]: .+\n/);
      if (linkSection) {
        content = content.replace(
          linkSection[0],
          `${linkSection[0]}[${version}]: ${repoUrl}/compare/v${previousVersion}...v${version}\n`
        );
      }
    }
  }

  writeFileSync(CHANGELOG_PATH, content);
  console.log(`CHANGELOG.md updated for version ${version}`);
}

// Run
try {
  const version = getVersion();
  updateChangelog(version);
} catch (error) {
  console.error('Error updating changelog:', error.message);
  process.exit(1);
}
