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
from typing import List, Optional

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
    'coverage', '.pytest_cache', '.tox', 'eggs', '.eggs'
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


@dataclass
class SecretFinding:
    """Represents a found secret."""
    file_path: str
    line_number: int
    secret_type: str
    matched_value: str
    line_content: str
    entropy: float
    confidence: str  # high, medium, low


def calculate_entropy(s: str) -> float:
    """Calculate Shannon entropy of a string."""
    if not s:
        return 0.0
    length = len(s)
    freq = Counter(s)
    return -sum((count/length) * math.log2(count/length) for count in freq.values())


def is_false_positive(value: str, line: str) -> bool:
    """Check if the match is likely a false positive."""
    combined = f"{value} {line}".lower()
    for pattern in FALSE_POSITIVE_PATTERNS:
        if re.search(pattern, combined, re.IGNORECASE):
            return True
    return False


def get_confidence(secret_type: str, value: str, entropy: float) -> str:
    """Determine confidence level of the finding."""
    # High confidence for well-defined patterns
    high_confidence_types = [
        'AWS Access Key', 'GitHub Token', 'GitHub PAT', 'GitLab Token',
        'Google API Key', 'Stripe Secret Key', 'Slack Token', 'SendGrid API Key',
        'OpenAI API Key', 'Anthropic API Key', 'Private Key Header', 'JWT Token'
    ]
    
    if secret_type in high_confidence_types:
        return 'high'
    
    # Medium confidence for generic patterns with high entropy
    if entropy > 4.5:
        return 'medium'
    
    # Low confidence for generic patterns with low entropy
    return 'low'


def scan_file(file_path: Path) -> List[SecretFinding]:
    """Scan a single file for secrets."""
    findings = []
    
    try:
        content = file_path.read_text(errors='ignore')
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            # Skip comments (basic detection)
            stripped = line.strip()
            if stripped.startswith(('#', '//', '/*', '*', '<!--')):
                continue
            
            for secret_type, pattern in SECRET_PATTERNS.items():
                matches = re.finditer(pattern, line)
                for match in matches:
                    value = match.group(0)
                    
                    # Skip false positives
                    if is_false_positive(value, line):
                        continue
                    
                    # Calculate entropy for the matched value
                    entropy = calculate_entropy(value)
                    
                    # Determine confidence
                    confidence = get_confidence(secret_type, value, entropy)
                    
                    # Only report medium+ confidence or high entropy
                    if confidence in ['high', 'medium'] or entropy > 4.0:
                        findings.append(SecretFinding(
                            file_path=str(file_path),
                            line_number=line_num,
                            secret_type=secret_type,
                            matched_value=value[:50] + '...' if len(value) > 50 else value,
                            line_content=line.strip()[:100],
                            entropy=round(entropy, 2),
                            confidence=confidence
                        ))
    except Exception as e:
        pass  # Skip files that can't be read
    
    return findings


def scan_high_entropy_strings(file_path: Path, min_length: int = 20, min_entropy: float = 4.5) -> List[SecretFinding]:
    """Scan for high-entropy strings that might be secrets."""
    findings = []
    
    # Pattern for potential secrets (alphanumeric + common secret chars)
    potential_secret = re.compile(r'["\']([A-Za-z0-9+/=_-]{20,})["\']')
    
    try:
        content = file_path.read_text(errors='ignore')
        lines = content.split('\n')
        
        for line_num, line in enumerate(lines, 1):
            stripped = line.strip()
            if stripped.startswith(('#', '//', '/*', '*', '<!--')):
                continue
            
            matches = potential_secret.finditer(line)
            for match in matches:
                value = match.group(1)
                
                if is_false_positive(value, line):
                    continue
                
                entropy = calculate_entropy(value)
                
                if entropy >= min_entropy and len(value) >= min_length:
                    # Check it wasn't already found by pattern matching
                    findings.append(SecretFinding(
                        file_path=str(file_path),
                        line_number=line_num,
                        secret_type='High-Entropy String',
                        matched_value=value[:50] + '...' if len(value) > 50 else value,
                        line_content=line.strip()[:100],
                        entropy=round(entropy, 2),
                        confidence='medium'
                    ))
    except Exception:
        pass
    
    return findings


def scan_project(project_path: str) -> dict:
    """Scan entire project for secrets."""
    path = Path(project_path).resolve()
    
    if not path.exists():
        return {'error': f'Path does not exist: {project_path}'}
    
    all_findings = []
    files_scanned = 0
    
    for root, dirs, files in os.walk(path):
        # Skip excluded directories
        dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS]
        
        for filename in files:
            file_path = Path(root) / filename
            
            # Check extension
            if file_path.suffix.lower() not in INCLUDE_EXTENSIONS:
                # Also check files without extension (like .env files)
                if not filename.startswith('.env') and filename not in ['Dockerfile', 'Makefile']:
                    continue
            
            files_scanned += 1
            
            # Pattern-based scanning
            findings = scan_file(file_path)
            all_findings.extend(findings)
            
            # Entropy-based scanning
            entropy_findings = scan_high_entropy_strings(file_path)
            # Deduplicate
            existing_values = {f.matched_value for f in findings}
            for ef in entropy_findings:
                if ef.matched_value not in existing_values:
                    all_findings.append(ef)
    
    # Sort by confidence and severity
    confidence_order = {'high': 0, 'medium': 1, 'low': 2}
    all_findings.sort(key=lambda x: (confidence_order.get(x.confidence, 3), -x.entropy))
    
    # Convert to serializable format
    findings_dict = [
        {
            'file': f.file_path.replace(str(path) + '/', ''),
            'line': f.line_number,
            'type': f.secret_type,
            'value': f.matched_value,
            'context': f.line_content,
            'entropy': f.entropy,
            'confidence': f.confidence
        }
        for f in all_findings
    ]
    
    return {
        'project_path': str(path),
        'files_scanned': files_scanned,
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
