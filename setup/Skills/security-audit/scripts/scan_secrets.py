#!/usr/bin/env python3
"""
Scan for hardcoded secrets with pattern matching and entropy analysis.
Usage: python3 scan_secrets.py /path/to/project
"""

import os
import re
import sys
import json
import math
from pathlib import Path
from collections import Counter
from dataclasses import dataclass
from typing import List

# High-priority secret patterns with descriptions
SECRET_PATTERNS = {
    'AWS Access Key': r'(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}',
    'AWS Secret Key': r'(?i)aws_secret_access_key\s*[=:]\s*[\'"]?([A-Za-z0-9/+=]{40})[\'"]?',
    'GitHub Token': r'gh[pousr]_[A-Za-z0-9]{36,}',
    'GitHub PAT (fine-grained)': r'github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59}',
    'GitLab Token': r'glpat-[A-Za-z0-9\-]{20,}',
    'Google API Key': r'AIza[0-9A-Za-z\-_]{35}',
    'Stripe Secret Key': r'sk_(live|test)_[0-9a-zA-Z]{24,}',
    'Stripe Restricted Key': r'rk_(live|test)_[0-9a-zA-Z]{24,}',
    'Slack Token': r'xox[bprs]-[0-9]{10,13}-[0-9]{10,13}[a-zA-Z0-9-]*',
    'Slack Webhook': r'https://hooks\.slack\.com/services/T[A-Z0-9]{8,}/B[A-Z0-9]{8,}/[A-Za-z0-9]{24}',
    'SendGrid API Key': r'SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}',
    'Twilio Account SID': r'AC[a-f0-9]{32}',
    'OpenAI API Key': r'sk-[A-Za-z0-9]{48,}',
    'Anthropic API Key': r'sk-ant-[A-Za-z0-9\-_]{90,}',
    'JWT Token': r'eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*',
    'Private Key Header': r'-----BEGIN (RSA |DSA |EC |OPENSSH )?PRIVATE KEY-----',
    'Password Assignment': r'(?i)(password|passwd|pwd)\s*[=:]\s*[\'"][^\'"]{8,}[\'"]',
    'API Key Assignment': r'(?i)(api[_-]?key|apikey)\s*[=:]\s*[\'"][^\'"]{16,}[\'"]',
    'Secret Assignment': r'(?i)(secret|token)\s*[=:]\s*[\'"][^\'"]{16,}[\'"]',
    'Bearer Token': r'(?i)bearer\s+[A-Za-z0-9_-]{20,}',
    'Basic Auth': r'(?i)basic\s+[A-Za-z0-9+/=]{20,}',
    'Connection String (Postgres)': r'postgres(ql)?://[^:]+:[^@]+@[^\s]+',
    'Connection String (MySQL)': r'mysql://[^:]+:[^@]+@[^\s]+',
    'Connection String (MongoDB)': r'mongodb(\+srv)?://[^:]+:[^@]+@[^\s]+',
    'Connection String (Redis)': r'redis://[^:]+:[^@]+@[^\s]+',
    'Azure Storage Key': r'(?i)accountkey\s*=\s*[A-Za-z0-9+/=]{88}',
    'Heroku API Key': r'(?i)heroku.*[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}',
    'Mailchimp API Key': r'[a-f0-9]{32}-us[0-9]{1,2}',
    'NPM Token': r'npm_[A-Za-z0-9]{36}',
    'PyPI Token': r'pypi-[A-Za-z0-9]{60,}',
}

# Files to scan
INCLUDE_EXTENSIONS = {
    '.js', '.jsx', '.ts', '.tsx', '.py', '.go', '.rb', '.java', '.php',
    '.cs', '.rs', '.kt', '.swift', '.env', '.yaml', '.yml', '.json',
    '.xml', '.properties', '.conf', '.config', '.ini', '.sh', '.tf'
}

# Directories to skip
EXCLUDE_DIRS = {
    '.git', 'node_modules', 'vendor', 'venv', 'env', '.venv',
    '__pycache__', 'dist', 'build', 'target', '.next', '.nuxt',
    'coverage', '.pytest_cache', '.tox', 'eggs', '.eggs', '.security-audit'
}

# False positive patterns to ignore
FALSE_POSITIVE_PATTERNS = [
    r'example\.com',
    r'test@',
    r'placeholder',
    r'changeme',
    r'your[-_]?',
    r'<.*>',
    r'\[.*\]',
    r'xxx+',
    r'dummy',
    r'sample',
    r'fake',
    r'mock',
    r'\$\{.*\}',  # Template variables
    r'\{\{.*\}\}',  # Template variables
    r'process\.env\.',  # Environment variable references
    r'os\.environ',
    r'ENV\[',
]

# A known token format is worth reviewing even if its value resembles a fixture.
# Placeholder suppression applies only to generic assignment and entropy matches.
SPECIFIC_SECRET_TYPES = {
    'AWS Access Key', 'AWS Secret Key', 'GitHub Token',
    'GitHub PAT (fine-grained)', 'GitLab Token', 'Google API Key',
    'Stripe Secret Key', 'Stripe Restricted Key', 'Slack Token',
    'Slack Webhook', 'SendGrid API Key', 'Twilio Account SID',
    'OpenAI API Key', 'Anthropic API Key', 'JWT Token',
    'Private Key Header', 'Azure Storage Key', 'Heroku API Key',
    'Mailchimp API Key', 'NPM Token', 'PyPI Token',
}

HIGH_ENTROPY_STRING = re.compile(r'["\']([A-Za-z0-9+/=_-]{20,})["\']')


@dataclass
class SecretFinding:
    """Represents a found secret."""
    file_path: str
    line_number: int
    secret_type: str
    start: int
    end: int
    entropy: float
    confidence: str  # high, medium, low


def calculate_entropy(s: str) -> float:
    """Calculate Shannon entropy of a string."""
    if not s:
        return 0.0
    length = len(s)
    freq = Counter(s)
    return -sum((count/length) * math.log2(count/length) for count in freq.values())


def is_false_positive(value: str, secret_type: str) -> bool:
    """Suppress obvious placeholders without using unrelated line content."""
    if secret_type in SPECIFIC_SECRET_TYPES:
        return False
    return any(re.search(pattern, value, re.IGNORECASE) for pattern in FALSE_POSITIVE_PATTERNS)


def get_confidence(secret_type: str, value: str, entropy: float) -> str:
    """Determine confidence level of the finding."""
    # High confidence for well-defined patterns
    if secret_type in SPECIFIC_SECRET_TYPES:
        return 'high'
    
    # Medium confidence for generic patterns with high entropy
    if entropy > 4.5:
        return 'medium'
    
    # Low confidence for generic patterns with low entropy
    return 'low'


def scan_text(file_path: Path, content: str, min_entropy: float = 4.5) -> List[SecretFinding]:
    """Scan text once, retaining only locations and classifications."""
    findings = []

    for line_num, line in enumerate(content.splitlines(), 1):
        line_findings = []
        for secret_type, pattern in SECRET_PATTERNS.items():
            for match in re.finditer(pattern, line):
                value = match.group(0)
                if is_false_positive(value, secret_type):
                    continue
                if secret_type not in SPECIFIC_SECRET_TYPES and any(
                    finding.secret_type in SPECIFIC_SECRET_TYPES
                    and finding.start < match.end()
                    and match.start() < finding.end
                    for finding in line_findings
                ):
                    continue

                entropy = calculate_entropy(value)
                confidence = get_confidence(secret_type, value, entropy)
                if confidence in ('high', 'medium') or entropy > 4.0:
                    line_findings.append(SecretFinding(
                        file_path=str(file_path),
                        line_number=line_num,
                        secret_type=secret_type,
                        start=match.start(),
                        end=match.end(),
                        entropy=round(entropy, 2),
                        confidence=confidence,
                    ))

        for match in HIGH_ENTROPY_STRING.finditer(line):
            value = match.group(1)
            if is_false_positive(value, 'High-Entropy String'):
                continue
            entropy = calculate_entropy(value)
            if entropy < min_entropy:
                continue
            # A known secret pattern takes precedence over a generic entropy hit.
            if any(f.start < match.end(1) and match.start(1) < f.end for f in line_findings):
                continue
            line_findings.append(SecretFinding(
                file_path=str(file_path),
                line_number=line_num,
                secret_type='High-Entropy String',
                start=match.start(1),
                end=match.end(1),
                entropy=round(entropy, 2),
                confidence='medium',
            ))

        findings.extend(line_findings)

    return findings


def scan_project(project_path: str) -> dict:
    """Scan entire project for secrets."""
    path = Path(project_path).resolve()
    
    if not path.is_dir():
        return {'error': f'Project directory does not exist: {project_path}'}
    
    all_findings = []
    files_scanned = 0
    files_skipped = 0
    skipped_directories = []
    scan_errors = []

    def record_walk_error(error: OSError) -> None:
        filename = Path(error.filename) if error.filename else path
        try:
            relative_name = str(filename.relative_to(path))
        except ValueError:
            relative_name = str(filename)
        scan_errors.append({'file': relative_name, 'reason': type(error).__name__})
    
    for root, dirs, files in os.walk(path, onerror=record_walk_error):
        # Skip configured exclusions and record linked directories as coverage gaps.
        kept_dirs = []
        for dirname in dirs:
            if dirname in EXCLUDE_DIRS:
                continue
            directory = Path(root) / dirname
            if directory.is_symlink():
                skipped_directories.append(str(directory.relative_to(path)))
            else:
                kept_dirs.append(dirname)
        dirs[:] = kept_dirs
        
        for filename in files:
            file_path = Path(root) / filename
            
            # Check extension
            if file_path.suffix.lower() not in INCLUDE_EXTENSIONS:
                # Also check files without extension (like .env files)
                if not filename.startswith('.env') and filename not in ['Dockerfile', 'Makefile']:
                    continue
            
            relative_name = str(file_path.relative_to(path))
            if file_path.is_symlink():
                files_skipped += 1
                scan_errors.append({'file': relative_name, 'reason': 'symlink'})
                continue

            try:
                content = file_path.read_text(encoding='utf-8')
            except (OSError, UnicodeError) as error:
                files_skipped += 1
                scan_errors.append({'file': relative_name, 'reason': type(error).__name__})
                continue

            files_scanned += 1
            all_findings.extend(scan_text(file_path, content))
    
    # Sort by confidence and severity
    confidence_order = {'high': 0, 'medium': 1, 'low': 2}
    all_findings.sort(key=lambda x: (confidence_order.get(x.confidence, 3), -x.entropy))
    
    # Convert to serializable format
    findings_dict = [
        {
            'file': f.file_path.replace(str(path) + '/', ''),
            'line': f.line_number,
            'type': f.secret_type,
            'entropy': f.entropy,
            'confidence': f.confidence
        }
        for f in all_findings
    ]
    
    return {
        'project_path': str(path),
        'files_scanned': files_scanned,
        'files_skipped': files_skipped,
        'skipped_directories': sorted(skipped_directories),
        'scan_errors': scan_errors,
        'secrets_found': len(findings_dict),
        'by_confidence': {
            'high': len([f for f in findings_dict if f['confidence'] == 'high']),
            'medium': len([f for f in findings_dict if f['confidence'] == 'medium']),
            'low': len([f for f in findings_dict if f['confidence'] == 'low']),
        },
        'findings': findings_dict
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 scan_secrets.py /path/to/project")
        sys.exit(1)
    
    project_path = sys.argv[1]
    result = scan_project(project_path)
    
    if 'error' in result:
        print(f"Error: {result['error']}")
        sys.exit(1)
    
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
