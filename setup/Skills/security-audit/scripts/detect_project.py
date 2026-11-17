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

SKIP_DIRS = {'.git', 'node_modules', 'vendor', 'venv', '.venv', '__pycache__', 'dist', 'build', 'target', '.next'}
ENTRY_FILES = {
    'main.py', 'app.py', 'index.js', 'index.ts', 'main.go', 'main.rs',
    'server.js', 'server.ts', 'app.js', 'app.ts', 'manage.py', 'artisan'
}
CONFIG_FILES = {
    '.env', '.env.example', 'config.json', 'config.yaml', 'config.yml',
    'settings.py', 'application.properties', 'appsettings.json'
}
DEPENDENCY_FILES = {'package.json', 'requirements.txt', 'Gemfile', 'go.mod', 'composer.json', 'pom.xml'}


def record_error(errors: list, project_path: Path, file_path: Path, error: Exception) -> None:
    try:
        relative = str(file_path.relative_to(project_path))
    except ValueError:
        relative = str(file_path)
    errors.append({'file': relative, 'reason': type(error).__name__})


def record_symlink(errors: list, project_path: Path, file_path: Path) -> None:
    errors.append({'file': str(file_path.relative_to(project_path)), 'reason': 'symlink'})


def count_files_by_extension(project_path: Path, errors: list, skipped_directories: list) -> dict:
    """Count files by extension."""
    counts = defaultdict(int)
    def onerror(error: OSError) -> None:
        record_error(errors, project_path, Path(error.filename or project_path), error)

    for root, dirs, files in os.walk(project_path, onerror=onerror):
        # Skip common excluded directories
        kept_dirs = []
        for dirname in dirs:
            if dirname in SKIP_DIRS:
                continue
            directory = Path(root) / dirname
            if directory.is_symlink():
                skipped_directories.append(str(directory.relative_to(project_path)))
            else:
                kept_dirs.append(dirname)
        dirs[:] = kept_dirs
        for f in files:
            ext = Path(f).suffix.lower()
            if ext not in LANGUAGE_EXTENSIONS:
                continue
            file_path = Path(root) / f
            if file_path.is_symlink():
                record_symlink(errors, project_path, file_path)
                continue
            counts[LANGUAGE_EXTENSIONS[ext]] += 1
    return dict(counts)


def detect_frameworks(project_path: Path, errors: list, target_path: Path) -> list:
    """Detect frameworks based on config files."""
    frameworks = []
    for filename, config in FRAMEWORK_INDICATORS.items():
        filepath = project_path / filename
        if filepath.is_symlink():
            record_symlink(errors, target_path, filepath)
            continue
        if filepath.exists():
            try:
                content = filepath.read_text(encoding='utf-8').lower()
                if config['check'](content):
                    frameworks.append(config['framework'])
            except (OSError, UnicodeError, ValueError) as error:
                record_error(errors, target_path, filepath, error)
    
    # Check package.json for more frameworks
    pkg_json = project_path / 'package.json'
    if pkg_json.is_symlink():
        record_symlink(errors, target_path, pkg_json)
        pkg_json = None
    if pkg_json and pkg_json.exists():
        try:
            content = pkg_json.read_text(encoding='utf-8')
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
        except (OSError, UnicodeError, ValueError, TypeError) as error:
            record_error(errors, target_path, pkg_json, error)
    
    return sorted(set(frameworks))


def detect_databases(project_path: Path, errors: list, target_path: Path) -> list:
    """Detect databases based on dependencies."""
    databases = []
    
    # Check various dependency files
    dep_files = ['package.json', 'requirements.txt', 'Gemfile', 'go.mod', 'composer.json', 'pom.xml']
    
    all_content = ""
    for dep_file in dep_files:
        filepath = project_path / dep_file
        if filepath.is_symlink():
            record_symlink(errors, target_path, filepath)
            continue
        if filepath.exists():
            try:
                all_content += filepath.read_text(encoding='utf-8').lower()
            except (OSError, UnicodeError) as error:
                record_error(errors, target_path, filepath, error)
    
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


def project_roots(project_path: Path, errors: list, skipped_directories: list) -> list[Path]:
    """Find directories with application markers, including monorepo packages."""
    markers = set(FRAMEWORK_INDICATORS) | ENTRY_FILES | CONFIG_FILES | DEPENDENCY_FILES
    roots = []
    def onerror(error: OSError) -> None:
        record_error(errors, project_path, Path(error.filename or project_path), error)

    for current, dirs, files in os.walk(project_path, onerror=onerror):
        kept_dirs = []
        for dirname in dirs:
            if dirname in SKIP_DIRS:
                continue
            directory = Path(current) / dirname
            if directory.is_symlink():
                skipped_directories.append(str(directory.relative_to(project_path)))
            else:
                kept_dirs.append(dirname)
        dirs[:] = kept_dirs
        if markers.intersection(files):
            roots.append(Path(current))
    return roots or [project_path]


def analyze_project(project_path: str) -> dict:
    """Analyze project and return detection results."""
    path = Path(project_path).resolve()
    
    if not path.is_dir():
        return {'error': f'Project directory does not exist: {project_path}'}
    
    # Detect languages
    detection_errors = []
    skipped_directories = []
    lang_counts = count_files_by_extension(path, detection_errors, skipped_directories)
    languages = sorted(lang_counts.keys(), key=lambda x: lang_counts[x], reverse=True)
    
    roots = project_roots(path, detection_errors, skipped_directories)

    # Detect frameworks and databases in each application root.
    frameworks = sorted({name for root in roots for name in detect_frameworks(root, detection_errors, path)})
    databases = sorted({name for root in roots for name in detect_databases(root, detection_errors, path)})
    
    # Get exclusions
    exclusions = get_exclusions(languages)
    
    # Find entry points
    entry_points = []
    for root in roots:
        for entry in ENTRY_FILES:
            entry_path = root / entry
            if entry_path.is_symlink():
                record_symlink(detection_errors, path, entry_path)
            elif entry_path.is_file():
                entry_points.append(str(entry_path.relative_to(path)))
    entry_points.sort()
    
    # Find config files
    config_files = []
    for root in roots:
        for cfg in CONFIG_FILES:
            config_path = root / cfg
            if config_path.is_symlink():
                record_symlink(detection_errors, path, config_path)
            elif config_path.is_file():
                config_files.append(str(config_path.relative_to(path)))
    config_files.sort()
    
    return {
        'project_path': str(path),
        'languages': languages,
        'language_file_counts': lang_counts,
        'primary_language': languages[0] if languages else 'Unknown',
        'frameworks': frameworks,
        'databases': databases,
        'detected_roots': [str(root.relative_to(path)) or '.' for root in roots],
        'entry_points': entry_points,
        'config_files': config_files,
        'detection_errors': [
            {'file': file_name, 'reason': reason}
            for file_name, reason in sorted({
                (item['file'], item['reason']) for item in detection_errors
            })
        ],
        'skipped_directories': sorted(set(skipped_directories)),
        'recommended_exclusions': exclusions,
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
