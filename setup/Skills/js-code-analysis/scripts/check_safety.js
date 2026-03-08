#!/usr/bin/env node

const https = require('https');
const { URL } = require('url');

const PLATFORMS = {
  hackerone: 'https://www.hackerone.com/disclosure-guidelines',
  bugcrowd: 'https://www.bugcrowd.com/resource/standard-disclosure-terms/',
  intigriti: 'https://www.intigriti.com/public/terms-and-conditions',
  yeswehack: 'https://www.yeswehack.com/vulnerability-disclosure-policy'
};

const COLORS = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  bold: '\x1b[1m',
  reset: '\x1b[0m'
};

function printHelp() {
  console.log(`
Usage: node check_safety.js [options]

Options:
  --target <domain>    Target domain to check (e.g., example.com)
  --platform <name>    Platform name (hackerone, bugcrowd, intigriti, yeswehack)
  --confirm            Confirm you have read and understood the Safe Harbor policy
  --help               Show this help message

Exit Codes:
  0 - Safe to proceed (Safe Harbor confirmed + security.txt found)
  1 - Warning (Safe Harbor confirmed but security.txt missing)
  2 - Not authorized / Error (Confirmation missing or invalid arguments)
`);
}

async function checkSecurityTxt(target) {
  return new Promise((resolve) => {
    const url = `https://${target}/.well-known/security.txt`;
    const options = {
      timeout: 5000
    };
    https.get(url, options, (res) => {
      if (res.statusCode === 200) {
        resolve(true);
      } else {
        resolve(false);
      }
    }).on('error', () => {
      resolve(false);
    }).on('timeout', () => {
      resolve(false);
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  let target = '';
  let platform = '';
  let confirmed = false;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--target' && args[i + 1]) {
      target = args[i + 1];
      i++;
    } else if (args[i] === '--platform' && args[i + 1]) {
      platform = args[i + 1].toLowerCase();
      i++;
    } else if (args[i] === '--confirm') {
      confirmed = true;
    } else if (args[i] === '--help') {
      printHelp();
      process.exit(0);
    }
  }

  if (!target || !platform) {
    console.error(`${COLORS.red}Error: Missing target or platform.${COLORS.reset}`);
    printHelp();
    process.exit(2);
  }

  if (!PLATFORMS[platform]) {
    console.error(`${COLORS.red}Error: Unsupported platform "${platform}".${COLORS.reset}`);
    console.log(`Supported platforms: ${Object.keys(PLATFORMS).join(', ')}`);
    process.exit(2);
  }

  console.log(`${COLORS.bold}--- SAFE HARBOR VERIFICATION ---${COLORS.reset}`);
  console.log(`Target: ${COLORS.blue}${target}${COLORS.reset}`);
  console.log(`Platform: ${COLORS.blue}${platform}${COLORS.reset}`);
  console.log(`Policy: ${COLORS.blue}${PLATFORMS[platform]}${COLORS.reset}`);
  console.log('---------------------------------');

  console.log(`[*] Checking for security.txt...`);
  const hasSecurityTxt = await checkSecurityTxt(target);

  if (hasSecurityTxt) {
    console.log(`${COLORS.green}[+] Found /.well-known/security.txt${COLORS.reset}`);
  } else {
    console.log(`${COLORS.yellow}[!] Could not find /.well-known/security.txt${COLORS.reset}`);
  }

  console.log(`\n${COLORS.yellow}${COLORS.bold}!!! SAFE HARBOR WARNING !!!${COLORS.reset}`);
  console.log(`Before proceeding with any security testing, ensure that:
1. The target is explicitly in-scope for the ${platform} program.
2. You are following the platform's Standard Disclosure Terms.
3. You have read the program's specific policy regarding Safe Harbor.
4. Your testing does not violate any laws or terms of service.`);

  if (!confirmed) {
    console.log(`\n${COLORS.red}[-] Action required: Please review the policy and use --confirm to proceed.${COLORS.reset}`);
    process.exit(2);
  }

  console.log(`\n${COLORS.green}[+] Safe Harbor confirmed. Happy hunting!${COLORS.reset}`);
  process.exit(hasSecurityTxt ? 0 : 1);
}

main();
