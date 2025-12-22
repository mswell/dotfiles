#!/usr/bin/env python3
"""
Analyze project dependencies for potential security issues.
Usage: python3 analyze_dependencies.py /path/to/project
"""

import os
import re
import sys
import json
from pathlib import Path
from typing import Dict, List, Optional
from dataclasses import dataclass

# Known vulnerable packages (sample - in production, use a real vulnerability database)
KNOWN_VULNERABLE = {
    # npm packages
    'lodash': {'versions': ['<4.17.21'], 'cve': 'CVE-2021-23337', 'severity': 'high', 'issue': 'Prototype Pollution'},
    'minimist': {'versions': ['<1.2.6'], 'cve': 'CVE-2021-44906', 'severity': 'critical', 'issue': 'Prototype Pollution'},
    'node-fetch': {'versions': ['<2.6.7', '>=3.0.0 <3.1.1'], 'cve': 'CVE-2022-0235', 'severity': 'high', 'issue': 'Information Disclosure'},
    'express': {'versions': ['<4.17.3'], 'cve': 'CVE-2022-24999', 'severity': 'high', 'issue': 'Open Redirect'},
    'jsonwebtoken': {'versions': ['<9.0.0'], 'cve': 'CVE-2022-23529', 'severity': 'critical', 'issue': 'Algorithm Confusion'},
    'axios': {'versions': ['<0.21.2'], 'cve': 'CVE-2021-3749', 'severity': 'high', 'issue': 'ReDoS'},
    'serialize-javascript': {'versions': ['<3.1.0'], 'cve': 'CVE-2020-7660', 'severity': 'critical', 'issue': 'Remote Code Execution'},
    'highlight.js': {'versions': ['<10.4.1'], 'cve': 'CVE-2020-26237', 'severity': 'medium', 'issue': 'ReDoS'},
    'underscore': {'versions': ['<1.13.6'], 'cve': 'CVE-2021-23358', 'severity': 'high', 'issue': 'Arbitrary Code Execution'},
    'glob-parent': {'versions': ['<5.1.2'], 'cve': 'CVE-2020-28469', 'severity': 'high', 'issue': 'ReDoS'},
    
    # Python packages
    'django': {'versions': ['<3.2.25', '>=4.0 <4.2.11'], 'cve': 'CVE-2024-27351', 'severity': 'high', 'issue': 'ReDoS'},
    'flask': {'versions': ['<2.3.2'], 'cve': 'CVE-2023-30861', 'severity': 'high', 'issue': 'Session Cookie Security'},
    'requests': {'versions': ['<2.31.0'], 'cve': 'CVE-2023-32681', 'severity': 'medium', 'issue': 'Information Disclosure'},
    'pyyaml': {'versions': ['<6.0'], 'cve': 'CVE-2020-14343', 'severity': 'critical', 'issue': 'Arbitrary Code Execution'},
    'pillow': {'versions': ['<10.0.1'], 'cve': 'CVE-2023-44271', 'severity': 'high', 'issue': 'DoS'},
    'cryptography': {'versions': ['<41.0.0'], 'cve': 'CVE-2023-38325', 'severity': 'high', 'issue': 'Certificate Verification Bypass'},
    'urllib3': {'versions': ['<1.26.18', '>=2.0.0 <2.0.7'], 'cve': 'CVE-2023-45803', 'severity': 'medium', 'issue': 'Cookie Leakage'},
    'jinja2': {'versions': ['<3.1.3'], 'cve': 'CVE-2024-22195', 'severity': 'medium', 'issue': 'XSS'},
    'werkzeug': {'versions': ['<3.0.1'], 'cve': 'CVE-2023-46136', 'severity': 'high', 'issue': 'Path Traversal'},
    
    # Ruby gems
    'rails': {'versions': ['<7.0.8'], 'cve': 'CVE-2023-38037', 'severity': 'medium', 'issue': 'Information Disclosure'},
    'nokogiri': {'versions': ['<1.15.4'], 'cve': 'CVE-2023-36792', 'severity': 'high', 'issue': 'XXE'},
    
    # Go modules
    'golang.org/x/crypto': {'versions': ['<0.17.0'], 'cve': 'CVE-2023-48795', 'severity': 'medium', 'issue': 'SSH Prefix Truncation'},
}

# Risky packages that warrant extra scrutiny
RISKY_PACKAGES = {
    # Packages with history of vulnerabilities
    'lodash': 'Multiple prototype pollution CVEs - consider lodash-es or native alternatives',
    'moment': 'Deprecated, use date-fns or dayjs instead',
    'request': 'Deprecated, use axios or node-fetch instead',
    'crypto-js': 'Use Web Crypto API or node:crypto instead',
    'node-uuid': 'Deprecated, use uuid package instead',
    'colors': 'Had supply chain attack - verify version',
    'faker': 'Had supply chain attack - verify version',
    'event-stream': 'Had supply chain attack - use alternatives',
    
    # Python
    'pickle': 'Never unpickle untrusted data',
    'yaml': 'Use yaml.safe_load() instead of yaml.load()',
    'eval': 'Avoid eval() with user input',
    'subprocess': 'Use shell=False and validate inputs',
    
    # Security-sensitive packages
    'jsonwebtoken': 'Ensure algorithm is explicitly specified',
    'bcrypt': 'Good choice for password hashing',
    'passport': 'Check all strategies are properly configured',
}


@dataclass
class Dependency:
    name: str
    version: Optional[str]
    source: str  # package.json, requirements.txt, etc.


@dataclass
class Finding:
    package: str
    version: str
    source: str
    severity: str
    issue: str
    cve: Optional[str]
    recommendation: str


def parse_package_json(file_path: Path) -> List[Dependency]:
    """Parse npm package.json for dependencies."""
    deps = []
    try:
        content = json.loads(file_path.read_text())
        
        for dep_type in ['dependencies', 'devDependencies', 'peerDependencies']:
            if dep_type in content:
                for name, version in content[dep_type].items():
                    # Clean version string
                    clean_version = re.sub(r'^[\^~>=<]+', '', str(version))
                    deps.append(Dependency(name=name, version=clean_version, source='package.json'))
    except Exception:
        pass
    
    return deps


def parse_requirements_txt(file_path: Path) -> List[Dependency]:
    """Parse Python requirements.txt for dependencies."""
    deps = []
    try:
        for line in file_path.read_text().split('\n'):
            line = line.strip()
            if not line or line.startswith('#') or line.startswith('-'):
                continue
            
            # Parse package==version or package>=version
            match = re.match(r'^([a-zA-Z0-9_-]+)([>=<~!]+)?(.+)?$', line)
            if match:
                name = match.group(1).lower()
                version = match.group(3) if match.group(3) else None
                deps.append(Dependency(name=name, version=version, source='requirements.txt'))
    except Exception:
        pass
    
    return deps


def parse_gemfile(file_path: Path) -> List[Dependency]:
    """Parse Ruby Gemfile for dependencies."""
    deps = []
    try:
        content = file_path.read_text()
        # Simple gem parser
        for match in re.finditer(r'gem\s+[\'"]([^\'"]+)[\'"](?:,\s*[\'"]([^\'"]+)[\'"])?', content):
            name = match.group(1)
            version = match.group(2) if match.group(2) else None
            deps.append(Dependency(name=name, version=version, source='Gemfile'))
    except Exception:
        pass
    
    return deps


def parse_go_mod(file_path: Path) -> List[Dependency]:
    """Parse Go go.mod for dependencies."""
    deps = []
    try:
        content = file_path.read_text()
        for match in re.finditer(r'^\s*([^\s]+)\s+v?([^\s]+)', content, re.MULTILINE):
            name = match.group(1)
            version = match.group(2)
            if not name.startswith('go ') and not name.startswith('module '):
                deps.append(Dependency(name=name, version=version, source='go.mod'))
    except Exception:
        pass
    
    return deps


def parse_composer_json(file_path: Path) -> List[Dependency]:
    """Parse PHP composer.json for dependencies."""
    deps = []
    try:
        content = json.loads(file_path.read_text())
        
        for dep_type in ['require', 'require-dev']:
            if dep_type in content:
                for name, version in content[dep_type].items():
                    if name != 'php':
                        clean_version = re.sub(r'^[\^~>=<]+', '', str(version))
                        deps.append(Dependency(name=name, version=clean_version, source='composer.json'))
    except Exception:
        pass
    
    return deps


def check_vulnerabilities(deps: List[Dependency]) -> List[Finding]:
    """Check dependencies against known vulnerabilities."""
    findings = []
    
    for dep in deps:
        name_lower = dep.name.lower()
        
        # Check known vulnerable packages
        if name_lower in KNOWN_VULNERABLE:
            vuln = KNOWN_VULNERABLE[name_lower]
            findings.append(Finding(
                package=dep.name,
                version=dep.version or 'unknown',
                source=dep.source,
                severity=vuln['severity'],
                issue=vuln['issue'],
                cve=vuln.get('cve'),
                recommendation=f"Update to latest version. Vulnerable versions: {', '.join(vuln['versions'])}"
            ))
        
        # Check risky packages
        elif name_lower in RISKY_PACKAGES:
            findings.append(Finding(
                package=dep.name,
                version=dep.version or 'unknown',
                source=dep.source,
                severity='info',
                issue='Potentially risky package',
                cve=None,
                recommendation=RISKY_PACKAGES[name_lower]
            ))
    
    return findings


def check_outdated_patterns(deps: List[Dependency]) -> List[Finding]:
    """Check for obviously outdated or deprecated packages."""
    findings = []
    
    deprecated = {
        'request': 'Package deprecated, use axios or node-fetch',
        'moment': 'Package in maintenance mode, use date-fns or dayjs',
        'node-uuid': 'Package deprecated, use uuid',
        'querystring': 'Use URLSearchParams instead',
        'nomnom': 'Package deprecated, use commander or yargs',
        'optimist': 'Package deprecated, use yargs',
    }
    
    for dep in deps:
        if dep.name.lower() in deprecated:
            findings.append(Finding(
                package=dep.name,
                version=dep.version or 'unknown',
                source=dep.source,
                severity='low',
                issue='Deprecated package',
                cve=None,
                recommendation=deprecated[dep.name.lower()]
            ))
    
    return findings


def analyze_project(project_path: str) -> dict:
    """Analyze project dependencies."""
    path = Path(project_path).resolve()
    
    if not path.exists():
        return {'error': f'Path does not exist: {project_path}'}
    
    all_deps = []
    dep_files_found = []
    
    # Find and parse dependency files
    parsers = {
        'package.json': parse_package_json,
        'requirements.txt': parse_requirements_txt,
        'Gemfile': parse_gemfile,
        'go.mod': parse_go_mod,
        'composer.json': parse_composer_json,
    }
    
    # Also check common subdirectories
    search_paths = [path] + list(path.glob('*/'))
    
    for search_path in search_paths:
        for filename, parser in parsers.items():
            file_path = search_path / filename
            if file_path.exists():
                deps = parser(file_path)
                all_deps.extend(deps)
                if deps:
                    dep_files_found.append(str(file_path.relative_to(path)))
    
    # Check for vulnerabilities
    vuln_findings = check_vulnerabilities(all_deps)
    outdated_findings = check_outdated_patterns(all_deps)
    all_findings = vuln_findings + outdated_findings
    
    # Sort by severity
    severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'info': 4}
    all_findings.sort(key=lambda x: severity_order.get(x.severity, 5))
    
    # Convert to serializable format
    findings_dict = [
        {
            'package': f.package,
            'version': f.version,
            'source': f.source,
            'severity': f.severity,
            'issue': f.issue,
            'cve': f.cve,
            'recommendation': f.recommendation
        }
        for f in all_findings
    ]
    
    # Summary stats
    summary = {
        'critical': len([f for f in findings_dict if f['severity'] == 'critical']),
        'high': len([f for f in findings_dict if f['severity'] == 'high']),
        'medium': len([f for f in findings_dict if f['severity'] == 'medium']),
        'low': len([f for f in findings_dict if f['severity'] == 'low']),
        'info': len([f for f in findings_dict if f['severity'] == 'info']),
    }
    
    return {
        'project_path': str(path),
        'dependency_files': dep_files_found,
        'total_dependencies': len(all_deps),
        'unique_packages': len(set(d.name.lower() for d in all_deps)),
        'issues_found': len(findings_dict),
        'summary': summary,
        'findings': findings_dict,
        'note': 'This is a basic check. For comprehensive vulnerability scanning, use npm audit, pip-audit, or similar tools.'
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 analyze_dependencies.py /path/to/project")
        sys.exit(1)
    
    project_path = sys.argv[1]
    result = analyze_project(project_path)
    
    if 'error' in result:
        print(f"Error: {result['error']}")
        sys.exit(1)
    
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
