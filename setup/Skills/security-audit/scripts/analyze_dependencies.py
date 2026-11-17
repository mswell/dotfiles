#!/usr/bin/env python3
"""
Analyze project dependencies for potential security issues.
Usage: python3 analyze_dependencies.py /path/to/project
"""

import json
import os
import re
import sys
from pathlib import Path
from dataclasses import dataclass
from typing import List, Optional

# Small, bundled advisory sample. A match is a lead to verify against a current
# advisory source, not a claim that this catalog is complete or current.
KNOWN_VULNERABLE = {
    # npm packages
    ('npm', 'lodash'): {'versions': ['<4.17.21'], 'cve': 'CVE-2021-23337', 'severity': 'high', 'issue': 'Prototype Pollution'},
    ('npm', 'minimist'): {'versions': ['<1.2.6'], 'cve': 'CVE-2021-44906', 'severity': 'critical', 'issue': 'Prototype Pollution'},
    ('npm', 'node-fetch'): {'versions': ['<2.6.7', '>=3.0.0 <3.1.1'], 'cve': 'CVE-2022-0235', 'severity': 'high', 'issue': 'Information Disclosure'},
    ('npm', 'express'): {'versions': ['<4.17.3'], 'cve': 'CVE-2022-24999', 'severity': 'high', 'issue': 'Open Redirect'},
    ('npm', 'jsonwebtoken'): {'versions': ['<9.0.0'], 'cve': 'CVE-2022-23529', 'severity': 'critical', 'issue': 'Algorithm Confusion'},
    ('npm', 'axios'): {'versions': ['<0.21.2'], 'cve': 'CVE-2021-3749', 'severity': 'high', 'issue': 'ReDoS'},
    ('npm', 'serialize-javascript'): {'versions': ['<3.1.0'], 'cve': 'CVE-2020-7660', 'severity': 'critical', 'issue': 'Remote Code Execution'},
    ('npm', 'highlight.js'): {'versions': ['<10.4.1'], 'cve': 'CVE-2020-26237', 'severity': 'medium', 'issue': 'ReDoS'},
    ('npm', 'underscore'): {'versions': ['<1.13.6'], 'cve': 'CVE-2021-23358', 'severity': 'high', 'issue': 'Arbitrary Code Execution'},
    ('npm', 'glob-parent'): {'versions': ['<5.1.2'], 'cve': 'CVE-2020-28469', 'severity': 'high', 'issue': 'ReDoS'},
    
    # Python packages
    ('pypi', 'django'): {'versions': ['<3.2.25', '>=4.0 <4.2.11'], 'cve': 'CVE-2024-27351', 'severity': 'high', 'issue': 'ReDoS'},
    ('pypi', 'flask'): {'versions': ['<2.3.2'], 'cve': 'CVE-2023-30861', 'severity': 'high', 'issue': 'Session Cookie Security'},
    ('pypi', 'requests'): {'versions': ['<2.31.0'], 'cve': 'CVE-2023-32681', 'severity': 'medium', 'issue': 'Information Disclosure'},
    ('pypi', 'pyyaml'): {'versions': ['<6.0'], 'cve': 'CVE-2020-14343', 'severity': 'critical', 'issue': 'Arbitrary Code Execution'},
    ('pypi', 'pillow'): {'versions': ['<10.0.1'], 'cve': 'CVE-2023-44271', 'severity': 'high', 'issue': 'DoS'},
    ('pypi', 'cryptography'): {'versions': ['<41.0.0'], 'cve': 'CVE-2023-38325', 'severity': 'high', 'issue': 'Certificate Verification Bypass'},
    ('pypi', 'urllib3'): {'versions': ['<1.26.18', '>=2.0.0 <2.0.7'], 'cve': 'CVE-2023-45803', 'severity': 'medium', 'issue': 'Cookie Leakage'},
    ('pypi', 'jinja2'): {'versions': ['<3.1.3'], 'cve': 'CVE-2024-22195', 'severity': 'medium', 'issue': 'XSS'},
    ('pypi', 'werkzeug'): {'versions': ['<3.0.1'], 'cve': 'CVE-2023-46136', 'severity': 'high', 'issue': 'Path Traversal'},
    
    # Ruby gems
    ('rubygems', 'rails'): {'versions': ['<7.0.8'], 'cve': 'CVE-2023-38037', 'severity': 'medium', 'issue': 'Information Disclosure'},
    ('rubygems', 'nokogiri'): {'versions': ['<1.15.4'], 'cve': 'CVE-2023-36792', 'severity': 'high', 'issue': 'XXE'},
    
    # Go modules
    ('go', 'golang.org/x/crypto'): {'versions': ['<0.17.0'], 'cve': 'CVE-2023-48795', 'severity': 'medium', 'issue': 'SSH Prefix Truncation'},
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
    source: str
    ecosystem: str
    resolved: bool = False
    location: Optional[str] = None


@dataclass
class Finding:
    package: str
    version: str
    source: str
    severity: str
    issue: str
    cve: Optional[str]
    recommendation: str
    status: str = 'local_advisory_match'


def parse_package_json(file_path: Path) -> List[Dependency]:
    """Read npm declarations, which are constraints rather than installed versions."""
    content = json.loads(file_path.read_text())
    if not isinstance(content, dict):
        raise ValueError('package.json must contain an object')
    deps = []
    for dep_type in ('dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'):
        declared = content.get(dep_type, {})
        if not isinstance(declared, dict):
            raise ValueError(f'{dep_type} must be an object')
        for name, version in declared.items():
            deps.append(Dependency(name, str(version), str(file_path), 'npm'))
    return deps


def parse_package_lock(file_path: Path) -> List[Dependency]:
    """Read resolved npm versions from package-lock v1, v2, or v3."""
    content = json.loads(file_path.read_text())
    if not isinstance(content, dict):
        raise ValueError('package-lock.json must contain an object')
    deps = []
    packages = content.get('packages')
    if isinstance(packages, dict):
        for location, package in packages.items():
            if 'node_modules/' not in location:
                continue
            if not isinstance(package, dict):
                raise ValueError(f'invalid package entry: {location}')
            name = location.rsplit('node_modules/', 1)[-1]
            version = package.get('version')
            deps.append(Dependency(name, str(version) if version is not None else None,
                                   str(file_path), 'npm', bool(version), location))
    elif isinstance(content.get('dependencies'), dict):
        def visit(tree, parent_location=''):
            if not isinstance(tree, dict):
                raise ValueError('invalid nested dependencies')
            for name, package in tree.items():
                if not isinstance(package, dict):
                    raise ValueError(f'invalid package entry: {name}')
                location = f'{parent_location}node_modules/{name}'
                version = package.get('version')
                deps.append(Dependency(name, str(version) if version is not None else None,
                                       str(file_path), 'npm', bool(version), location))
                visit(package.get('dependencies', {}), f'{location}/')

        visit(content['dependencies'])
    else:
        raise ValueError('unsupported package-lock structure')
    return deps


def parse_requirements_txt(file_path: Path) -> List[Dependency]:
    """Read Python requirements as declarations, not installed packages."""
    deps = []
    for line in file_path.read_text().splitlines():
        line = line.split('#', 1)[0].strip()
        if not line:
            continue
        if line.startswith('-'):
            raise ValueError('Unsupported requirements directive')
        match = re.match(r'^([a-zA-Z0-9_.-]+)(?:\[[^]]+\])?\s*(.*)$', line)
        if not match:
            raise ValueError('Unsupported requirements entry')
        deps.append(Dependency(match.group(1).lower(), match.group(2) or None,
                               str(file_path), 'pypi'))
    return deps


def parse_gemfile(file_path: Path) -> List[Dependency]:
    """Read Ruby declarations, which may contain version constraints."""
    deps = []
    content = file_path.read_text()
    for match in re.finditer(r'gem\s+[\'"]([^\'"]+)[\'"](?:,\s*[\'"]([^\'"]+)[\'"])?', content):
        deps.append(Dependency(match.group(1), match.group(2), str(file_path), 'rubygems'))
    return deps


def parse_go_mod(file_path: Path) -> List[Dependency]:
    """Read only Go require directives, excluding other go.mod directives."""
    deps = []
    in_require_block = False
    for raw_line in file_path.read_text().splitlines():
        line = raw_line.split('//', 1)[0].strip()
        if not line:
            continue
        if re.fullmatch(r'require\s*\(', line):
            in_require_block = True
            continue
        if in_require_block and line == ')':
            in_require_block = False
            continue
        if line.startswith('require '):
            line = line[len('require '):].strip()
        elif not in_require_block:
            continue
        parts = line.split()
        if len(parts) != 2 or not parts[1].startswith('v'):
            raise ValueError(f'invalid require directive: {raw_line.strip()}')
        deps.append(Dependency(parts[0], parts[1], str(file_path), 'go'))
    if in_require_block:
        raise ValueError('unterminated require block')
    return deps


def parse_composer_json(file_path: Path) -> List[Dependency]:
    """Read Composer constraints, which do not prove installed versions."""
    content = json.loads(file_path.read_text())
    if not isinstance(content, dict):
        raise ValueError('composer.json must contain an object')
    deps = []
    for dep_type in ('require', 'require-dev'):
        declared = content.get(dep_type, {})
        if not isinstance(declared, dict):
            raise ValueError(f'{dep_type} must be an object')
        for name, version in declared.items():
            if name != 'php':
                deps.append(Dependency(name, str(version), str(file_path), 'composer'))
    return deps


def numeric_version(version: str) -> Optional[tuple]:
    """Return a comparable numeric version or None for unsupported version syntax."""
    if not re.fullmatch(r'v?\d+(?:\.\d+)*', version):
        return None
    return tuple(int(part) for part in version.lstrip('v').split('.'))


def version_in_range(version: str, ranges: List[str]) -> Optional[bool]:
    """Evaluate the simple numeric ranges in the bundled advisory sample."""
    installed = numeric_version(version)
    if installed is None:
        return None
    for version_range in ranges:
        conditions = []
        for token in version_range.split():
            match = re.fullmatch(r'(<=|>=|<|>|==|=)(v?\d+(?:\.\d+)*)', token)
            if not match:
                return None
            operator, boundary_text = match.groups()
            boundary = numeric_version(boundary_text)
            width = max(len(installed), len(boundary))
            actual = installed + (0,) * (width - len(installed))
            limit = boundary + (0,) * (width - len(boundary))
            conditions.append({
                '<': actual < limit,
                '<=': actual <= limit,
                '>': actual > limit,
                '>=': actual >= limit,
                '==': actual == limit,
                '=': actual == limit,
            }[operator])
        if all(conditions):
            return True
    return False


def check_vulnerabilities(deps: List[Dependency]):
    """Return advisory matches and cases lacking a trustworthy resolved version."""
    findings = []
    unverified = []
    for dep in deps:
        advisory = KNOWN_VULNERABLE.get((dep.ecosystem, dep.name.lower()))
        if advisory is None:
            continue
        match = version_in_range(dep.version, advisory['versions']) if dep.resolved and dep.version else None
        if match is None:
            unverified.append({
                'package': dep.name,
                'declared_version': dep.version,
                'source': dep.source,
                'ecosystem': dep.ecosystem,
                'candidate_cve': advisory['cve'],
                'status': 'version_not_resolved' if not dep.resolved else 'unsupported_version',
            })
        elif match:
            findings.append(Finding(
                package=dep.name,
                version=dep.version,
                source=dep.source,
                severity=advisory['severity'],
                issue=advisory['issue'],
                cve=advisory['cve'],
                recommendation=f"Verify the advisory and update to a fixed version. Bundled affected ranges: {', '.join(advisory['versions'])}",
            ))
    return findings, unverified


def maintenance_notes(deps: List[Dependency]) -> list:
    """Keep package-choice advice separate from vulnerability findings."""
    return [
        {
            'package': dep.name,
            'source': dep.source,
            'note': RISKY_PACKAGES[dep.name.lower()],
        }
        for dep in deps if dep.name.lower() in RISKY_PACKAGES
    ]


def analyze_project(project_path: str) -> dict:
    """Analyze project dependencies."""
    path = Path(project_path).resolve()
    if not path.is_dir():
        return {'error': f'Project directory does not exist: {project_path}'}

    all_deps = []
    dep_files_found = []
    parse_errors = []
    skipped_directories = []
    files_parsed = 0
    parsers = {
        'package.json': parse_package_json,
        'package-lock.json': parse_package_lock,
        'requirements.txt': parse_requirements_txt,
        'Gemfile': parse_gemfile,
        'go.mod': parse_go_mod,
        'composer.json': parse_composer_json,
    }
    excluded_dirs = {'.git', '.security-audit', 'node_modules', 'vendor', 'venv', '.venv',
                     'dist', 'build', 'target', '__pycache__'}
    def record_walk_error(error: OSError) -> None:
        location = Path(error.filename) if error.filename else path
        try:
            relative = str(location.relative_to(path))
        except ValueError:
            relative = str(location)
        parse_errors.append({'file': relative, 'error': type(error).__name__})

    for root, dirs, files in os.walk(path, onerror=record_walk_error):
        kept_dirs = []
        for dirname in dirs:
            if dirname in excluded_dirs:
                continue
            directory = Path(root) / dirname
            if directory.is_symlink():
                skipped_directories.append(str(directory.relative_to(path)))
            else:
                kept_dirs.append(dirname)
        dirs[:] = sorted(kept_dirs)
        parsed = {}
        for filename, parser in parsers.items():
            if filename not in files:
                continue
            file_path = Path(root) / filename
            relative = str(file_path.relative_to(path))
            dep_files_found.append(relative)
            if file_path.is_symlink():
                parse_errors.append({'file': relative, 'error': 'symlink'})
                continue
            try:
                parsed[filename] = parser(file_path)
                for dep in parsed[filename]:
                    dep.source = relative
                files_parsed += 1
            except (OSError, UnicodeError, ValueError, TypeError) as error:
                parse_errors.append({'file': relative, 'error': str(error)})

        locked_names = {
            dep.name.lower()
            for dep in parsed.get('package-lock.json', [])
            if dep.location and dep.location.lower() == f'node_modules/{dep.name.lower()}'
        }
        for filename, deps in parsed.items():
            if filename == 'package.json':
                all_deps.extend(dep for dep in deps if dep.name.lower() not in locked_names)
            else:
                all_deps.extend(deps)

    all_findings, unverified = check_vulnerabilities(all_deps)
    unresolved_dependencies_count = sum(not dep.resolved for dep in all_deps)
    severity_order = {'critical': 0, 'high': 1, 'medium': 2, 'low': 3, 'info': 4}
    all_findings.sort(key=lambda x: severity_order.get(x.severity, 5))
    findings_dict = [
        {
            'package': f.package,
            'version': f.version,
            'source': f.source,
            'severity': f.severity,
            'issue': f.issue,
            'cve': f.cve,
            'recommendation': f.recommendation,
            'status': f.status,
        }
        for f in all_findings
    ]
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
        'files_parsed': files_parsed,
        'parse_errors': parse_errors,
        'version_inventory_complete': bool(dep_files_found) and not parse_errors and not skipped_directories and unresolved_dependencies_count == 0,
        'total_dependencies': len(all_deps),
        'unresolved_dependencies_count': unresolved_dependencies_count,
        'skipped_directories': sorted(skipped_directories),
        'unique_packages': len(set((d.ecosystem, d.name.lower()) for d in all_deps)),
        'advisory_catalog': 'bundled_sample',
        'advisory_matches_found': len(findings_dict),
        'advisory_matches_by_severity': summary,
        'advisory_matches': findings_dict,
        'unverified_advisory_candidates': unverified,
        'review_notes': maintenance_notes(all_deps),
        'note': 'The version inventory and bundled advisory sample do not establish whether dependencies are secure. Verify matches and coverage with current ecosystem advisories.',
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
