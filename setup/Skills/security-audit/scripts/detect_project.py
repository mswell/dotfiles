#!/usr/bin/env python3
"""
Detect project languages, frameworks, and recommend exclusions.
Usage: python3 detect_project.py /path/to/project
"""

import os
import sys
import json
from pathlib import Path
from collections import defaultdict

# Language detection by file extension
LANGUAGE_EXTENSIONS = {
    '.py': 'Python',
    '.js': 'JavaScript',
    '.jsx': 'JavaScript',
    '.ts': 'TypeScript',
    '.tsx': 'TypeScript',
    '.go': 'Go',
    '.rb': 'Ruby',
    '.java': 'Java',
    '.php': 'PHP',
    '.cs': 'C#',
    '.rs': 'Rust',
    '.kt': 'Kotlin',
    '.swift': 'Swift',
}

# Framework detection patterns
FRAMEWORK_INDICATORS = {
    # Python
    'requirements.txt': {'check': lambda c: 'django' in c.lower(), 'framework': 'Django'},
    'manage.py': {'check': lambda c: 'django' in c.lower(), 'framework': 'Django'},
    'app.py': {'check': lambda c: 'flask' in c.lower(), 'framework': 'Flask'},
    'main.py': {'check': lambda c: 'fastapi' in c.lower(), 'framework': 'FastAPI'},
    
    # JavaScript/TypeScript
    'package.json': {'check': lambda c: '"express"' in c, 'framework': 'Express.js'},
    'next.config.js': {'check': lambda c: True, 'framework': 'Next.js'},
    'nuxt.config.js': {'check': lambda c: True, 'framework': 'Nuxt.js'},
    'angular.json': {'check': lambda c: True, 'framework': 'Angular'},
    'vue.config.js': {'check': lambda c: True, 'framework': 'Vue.js'},
    
    # Go
    'go.mod': {'check': lambda c: 'gin-gonic' in c, 'framework': 'Gin'},
    
    # Ruby
    'Gemfile': {'check': lambda c: 'rails' in c.lower(), 'framework': 'Ruby on Rails'},
    
    # PHP
    'composer.json': {'check': lambda c: 'laravel' in c.lower(), 'framework': 'Laravel'},
    'artisan': {'check': lambda c: True, 'framework': 'Laravel'},
    
    # Java
    'pom.xml': {'check': lambda c: 'spring' in c.lower(), 'framework': 'Spring'},
    'build.gradle': {'check': lambda c: 'spring' in c.lower(), 'framework': 'Spring Boot'},
}

# Database indicators
DATABASE_INDICATORS = {
    'postgres': ['psycopg2', 'pg', 'postgres', 'postgresql'],
    'mysql': ['mysql', 'pymysql', 'mysql2'],
    'mongodb': ['mongoose', 'pymongo', 'mongodb', 'mongo'],
    'sqlite': ['sqlite', 'sqlite3'],
    'redis': ['redis', 'ioredis'],
    'elasticsearch': ['elasticsearch', '@elastic'],
}

# Exclusions by language
EXCLUSIONS = {
    'Python': ['venv/', 'env/', '.venv/', '__pycache__/', '.pytest_cache/', '.tox/', '*.egg-info/'],
    'JavaScript': ['node_modules/', '.npm/', '.yarn/', 'dist/', 'build/'],
    'TypeScript': ['node_modules/', '.npm/', '.yarn/', 'dist/', 'build/', '.next/'],
    'Go': ['vendor/', 'bin/', 'pkg/'],
    'Ruby': ['vendor/', '.bundle/', 'tmp/'],
    'Java': ['target/', 'build/', '.gradle/', '.m2/'],
    'PHP': ['vendor/', '.composer/'],
    'C#': ['bin/', 'obj/', 'packages/'],
    'Rust': ['target/'],
    'Kotlin': ['build/', '.gradle/'],
    'Swift': ['.build/', '.swiftpm/', 'Packages/'],
}

# Universal exclusions
UNIVERSAL_EXCLUSIONS = ['.git/', '.svn/', '.hg/', '.idea/', '.vscode/', '*.min.js', '*.min.css']


def count_files_by_extension(project_path: Path) -> dict:
    """Count files by extension."""
    counts = defaultdict(int)
    for root, dirs, files in os.walk(project_path):
        # Skip common excluded directories
        dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules', 'vendor', 'venv', '__pycache__']]
        for f in files:
            ext = Path(f).suffix.lower()
            if ext in LANGUAGE_EXTENSIONS:
                counts[LANGUAGE_EXTENSIONS[ext]] += 1
    return dict(counts)


def detect_frameworks(project_path: Path) -> list:
    """Detect frameworks based on config files."""
    frameworks = []
    for filename, config in FRAMEWORK_INDICATORS.items():
        filepath = project_path / filename
        if filepath.exists():
            try:
                content = filepath.read_text(errors='ignore').lower()
                if config['check'](content):
                    frameworks.append(config['framework'])
            except Exception:
                pass
    
    # Check package.json for more frameworks
    pkg_json = project_path / 'package.json'
    if pkg_json.exists():
        try:
            content = pkg_json.read_text()
            pkg = json.loads(content)
            deps = {**pkg.get('dependencies', {}), **pkg.get('devDependencies', {})}
            
            if 'react' in deps:
                frameworks.append('React')
            if 'vue' in deps:
                frameworks.append('Vue.js')
            if '@angular/core' in deps:
                frameworks.append('Angular')
            if 'express' in deps:
                frameworks.append('Express.js')
            if 'fastify' in deps:
                frameworks.append('Fastify')
            if 'koa' in deps:
                frameworks.append('Koa')
            if 'hapi' in deps or '@hapi/hapi' in deps:
                frameworks.append('Hapi')
        except Exception:
            pass
    
    return list(set(frameworks))


def detect_databases(project_path: Path) -> list:
    """Detect databases based on dependencies."""
    databases = []
    
    # Check various dependency files
    dep_files = ['package.json', 'requirements.txt', 'Gemfile', 'go.mod', 'composer.json', 'pom.xml']
    
    all_content = ""
    for dep_file in dep_files:
        filepath = project_path / dep_file
        if filepath.exists():
            try:
                all_content += filepath.read_text(errors='ignore').lower()
            except Exception:
                pass
    
    for db, indicators in DATABASE_INDICATORS.items():
        if any(ind in all_content for ind in indicators):
            databases.append(db)
    
    return databases


def get_exclusions(languages: list) -> list:
    """Get combined exclusions for detected languages."""
    exclusions = set(UNIVERSAL_EXCLUSIONS)
    for lang in languages:
        if lang in EXCLUSIONS:
            exclusions.update(EXCLUSIONS[lang])
    return sorted(list(exclusions))


def analyze_project(project_path: str) -> dict:
    """Analyze project and return detection results."""
    path = Path(project_path).resolve()
    
    if not path.exists():
        return {'error': f'Path does not exist: {project_path}'}
    
    # Detect languages
    lang_counts = count_files_by_extension(path)
    languages = sorted(lang_counts.keys(), key=lambda x: lang_counts[x], reverse=True)
    
    # Detect frameworks
    frameworks = detect_frameworks(path)
    
    # Detect databases
    databases = detect_databases(path)
    
    # Get exclusions
    exclusions = get_exclusions(languages)
    
    # Find entry points
    entry_points = []
    common_entry_files = [
        'main.py', 'app.py', 'index.js', 'index.ts', 'main.go', 'main.rs',
        'server.js', 'server.ts', 'app.js', 'app.ts', 'manage.py', 'artisan'
    ]
    for entry in common_entry_files:
        if (path / entry).exists():
            entry_points.append(entry)
    
    # Find config files
    config_files = []
    common_configs = [
        '.env', '.env.example', 'config.json', 'config.yaml', 'config.yml',
        'settings.py', 'application.properties', 'appsettings.json'
    ]
    for cfg in common_configs:
        if (path / cfg).exists():
            config_files.append(cfg)
    
    return {
        'project_path': str(path),
        'languages': languages,
        'language_file_counts': lang_counts,
        'primary_language': languages[0] if languages else 'Unknown',
        'frameworks': frameworks,
        'databases': databases,
        'entry_points': entry_points,
        'config_files': config_files,
        'recommended_exclusions': exclusions,
        'scan_command': f"# Recommended grep exclusions:\n--exclude-dir={{{','.join(e.rstrip('/') for e in exclusions if e.endswith('/'))}}}",
    }


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 detect_project.py /path/to/project")
        sys.exit(1)
    
    project_path = sys.argv[1]
    result = analyze_project(project_path)
    
    if 'error' in result:
        print(f"Error: {result['error']}")
        sys.exit(1)
    
    print(json.dumps(result, indent=2))


if __name__ == '__main__':
    main()
