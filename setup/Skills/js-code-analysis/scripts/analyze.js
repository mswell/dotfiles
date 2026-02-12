#!/usr/bin/env node

/**
 * Safe Harbor Warning:
 * This tool is intended for security research and educational purposes only.
 * Unauthorized access to computer systems is illegal.
 * Always obtain explicit permission before testing any system.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const CATEGORIES = {
  'prototype-pollution': [
    'Object.assign($OBJ, $DATA)',
    '$OBJ[$KEY] = $VAL',
    'JSON.parse($DATA)'
  ],
  'idor': [
    'db.collection($COL).find({ _id: $ID })',
    'req.params.$ID',
    'req.query.$ID'
  ],
  'ssrf': [
    'fetch($URL)',
    'axios.get($URL)',
    'axios.post($URL)',
    'http.get($URL)',
    'https.get($URL)'
  ],
  'command-injection': [
    'exec($CMD)',
    'spawn($CMD)',
    'execSync($CMD)',
    'child_process.exec($CMD)'
  ],
  'nosql-injection': [
    '{ $where: $CODE }',
    '{ $regex: $REGEX }',
    'db.collection($COL).find($QUERY)'
  ],
  'jwt': [
    'jwt.verify($TOKEN, $SECRET)',
    'jwt.decode($TOKEN)',
    'jsonwebtoken.verify($TOKEN, $SECRET)'
  ],
  'postmessage': [
    'window.addEventListener("message", $HANDLER)',
    'window.postMessage($MSG, $ORIGIN)',
    'process.on("message", $HANDLER)'
  ],
  'path-traversal': [
    'fs.readFile($PATH, $$$)',
    'fs.readFileSync($PATH, $$$)',
    'fs.writeFile($PATH, $$$)',
    'path.join($$$)'
  ],
  'graphql': [
    'gql`$QUERY`',
    'apollo.query({ query: $QUERY })'
  ],
  'redos': [
    'new RegExp($PATTERN)',
    '/$PATTERN/.test($STR)',
    '/$PATTERN/.exec($STR)'
  ]
};

function printHelp() {
  console.log(`
Usage: node analyze.js --target <path> --category <category> [--format <json|markdown>]

Options:
  --target    Path to the code directory or file to analyze
  --category  Vulnerability category to scan for (or "all")
  --format    Output format: json (default) or markdown

Categories:
  ${Object.keys(CATEGORIES).join(', ')}, all
`);
}

function parseArgs() {
  const args = {};
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i].startsWith('--')) {
      const key = process.argv[i].slice(2);
      const value = process.argv[i + 1];
      if (value && !value.startsWith('--')) {
        args[key] = value;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

async function run() {
  const args = parseArgs();

  if (args.help || !args.target || !args.category) {
    printHelp();
    process.exit(0);
  }

  const target = path.resolve(args.target);
  const category = args.category;
  const format = args.format || 'json';

  if (category !== 'all' && !CATEGORIES[category]) {
    console.error(`Error: Invalid category "${category}"`);
    printHelp();
    process.exit(1);
  }

  const categoriesToScan = category === 'all' ? Object.keys(CATEGORIES) : [category];
  const results = [];

  console.error(`[*] Analyzing ${target} for category: ${category}...`);

  for (const cat of categoriesToScan) {
    const patterns = CATEGORIES[cat];
    for (const pattern of patterns) {
      try {
        const cmd = `npx -p @ast-grep/cli sg run --pattern '${pattern}' --json "${target}"`;
        const output = execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
        
        if (output.trim()) {
          const matches = JSON.parse(output);
          matches.forEach(match => {
            results.push({
              category: cat,
              pattern: pattern,
              file: match.file,
              line: match.range.start.line + 1,
              column: match.range.start.column + 1,
              code: match.text
            });
          });
        }
      } catch (error) {
      }
    }
  }

  if (format === 'json') {
    console.log(JSON.stringify(results, null, 2));
  } else {
    console.log('# JS Code Analysis Results\n');
    console.log(`- **Target:** \`${target}\``);
    console.log(`- **Category:** \`${category}\``);
    console.log(`- **Total Findings:** ${results.length}\n`);
    
    if (results.length === 0) {
      console.log('No issues found.');
    } else {
      results.forEach((res, index) => {
        console.log(`### ${index + 1}. [${res.category}] ${res.file}:${res.line}`);
        console.log(`**Pattern:** \`${res.pattern}\``);
        console.log('**Code:**');
        console.log('```javascript');
        console.log(res.code);
        console.log('```\n');
      });
    }
  }
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
