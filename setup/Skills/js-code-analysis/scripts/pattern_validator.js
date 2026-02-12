#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);

const help = `
Usage: node pattern_validator.js [options]

Options:
  --patterns-dir <dir>   Directory containing ast-grep patterns
  --fixtures-dir <dir>   Directory containing test fixtures
  --test                 Run internal tests
  --help                 Show this help message
`;

function printHelp() {
  console.log(help);
}

if (args.includes('--help')) {
  printHelp();
  process.exit(0);
}

if (args.includes('--test')) {
  console.log('Running internal tests...');
  try {
    execSync('sg --version', { stdio: 'ignore' });
    console.log('✅ ast-grep (sg) is installed.');
  } catch (e) {
    console.error('❌ ast-grep (sg) is not installed or not in PATH.');
    process.exit(1);
  }
  console.log('Internal tests passed.');
  process.exit(0);
}

const patternsDirIndex = args.indexOf('--patterns-dir');
const fixturesDirIndex = args.indexOf('--fixtures-dir');

const patternsDir = patternsDirIndex !== -1 ? args[patternsDirIndex + 1] : null;
const fixturesDir = fixturesDirIndex !== -1 ? args[fixturesDirIndex + 1] : null;

if (!patternsDir || !fixturesDir) {
  console.error('Error: --patterns-dir and --fixtures-dir are required.');
  printHelp();
  process.exit(1);
}

if (!fs.existsSync(patternsDir)) {
  console.error(`Error: Patterns directory not found: ${patternsDir}`);
  process.exit(1);
}

if (!fs.existsSync(fixturesDir)) {
  console.error(`Error: Fixtures directory not found: ${fixturesDir}`);
  process.exit(1);
}

function validatePatterns() {
  const patterns = fs.readdirSync(patternsDir).filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));
  let passed = 0;
  let failed = 0;

  console.log(`Validating ${patterns.length} patterns...\n`);

  patterns.forEach(patternFile => {
    const patternName = path.parse(patternFile).name;
    const patternPath = path.join(patternsDir, patternFile);
    const fixtureFile = `${patternName}.js`;
    const fixturePath = path.join(fixturesDir, fixtureFile);
    const expectedPath = path.join(fixturesDir, `${patternName}.expected.json`);

    if (!fs.existsSync(fixturePath)) {
      console.warn(`⚠️  No fixture found for pattern: ${patternName} (expected ${fixtureFile})`);
      return;
    }

    try {
      const output = execSync(`sg scan -p ${patternPath} ${fixturePath} --json`, { encoding: 'utf8' });
      const results = JSON.parse(output);

      if (fs.existsSync(expectedPath)) {
        const expected = JSON.parse(fs.readFileSync(expectedPath, 'utf8'));
        if (results.length === expected.count) {
          console.log(`✅ ${patternName}: Passed (${results.length} matches)`);
          passed++;
        } else {
          console.error(`❌ ${patternName}: Failed (Expected ${expected.count} matches, found ${results.length})`);
          failed++;
        }
      } else {
        console.log(`ℹ️  ${patternName}: Found ${results.length} matches (no .expected.json found)`);
        passed++;
      }
    } catch (error) {
      console.error(`❌ ${patternName}: Error running ast-grep`);
      console.error(error.message);
      failed++;
    }
  });

  console.log(`\nSummary: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

validatePatterns();
