# Secrets Detection Patterns

## Cloud Provider Credentials

### AWS
```regex
# Access Key ID
(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}

# Secret Access Key (40 chars, base64-like)
[A-Za-z0-9/+=]{40}

# Combined pattern
aws_access_key_id\s*=\s*['"]?(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}['"]?
aws_secret_access_key\s*=\s*['"]?[A-Za-z0-9/+=]{40}['"]?

# Session Token
aws_session_token\s*=\s*['"]?[A-Za-z0-9/+=]{100,}['"]?
```

**Grep command:**
```bash
grep -rEn "(AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}" --include="*.{js,ts,py,go,java,env,yaml,yml,json,tf}"
```

### Google Cloud Platform (GCP)
```regex
# Service Account Key (JSON key file)
"type"\s*:\s*"service_account"

# API Key
AIza[0-9A-Za-z\-_]{35}

# OAuth Client ID
[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com

# OAuth Client Secret
[a-zA-Z0-9_-]{24}
```

**Grep command:**
```bash
grep -rEn "AIza[0-9A-Za-z_-]{35}" --include="*.{js,ts,py,go,java,env,yaml,yml,json}"
grep -rEn "service_account" --include="*.json"
```

### Azure
```regex
# Storage Account Key
[a-zA-Z0-9+/=]{88}

# Connection String
DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[^;]+

# Client Secret
[a-zA-Z0-9_~.-]{34}

# SAS Token
sv=[0-9]{4}-[0-9]{2}-[0-9]{2}&s[a-z]=[a-z]+&sig=[A-Za-z0-9%]+
```

**Grep command:**
```bash
grep -rEn "AccountKey=[A-Za-z0-9+/=]{88}" --include="*.{js,ts,py,go,java,env,yaml,yml,json,tf}"
```

## API Keys & Tokens

### GitHub
```regex
# Personal Access Token (classic)
ghp_[A-Za-z0-9]{36}

# Personal Access Token (fine-grained)
github_pat_[A-Za-z0-9]{22}_[A-Za-z0-9]{59}

# OAuth Access Token
gho_[A-Za-z0-9]{36}

# App Token
ghu_[A-Za-z0-9]{36}

# Refresh Token
ghr_[A-Za-z0-9]{36}
```

### GitLab
```regex
glpat-[A-Za-z0-9\-]{20}
```

### Slack
```regex
# Bot Token
xoxb-[0-9]{11}-[0-9]{11}-[a-zA-Z0-9]{24}

# User Token
xoxp-[0-9]{11}-[0-9]{11}-[0-9]{11}-[a-f0-9]{32}

# Webhook URL
https://hooks\.slack\.com/services/T[A-Z0-9]{8}/B[A-Z0-9]{8}/[A-Za-z0-9]{24}
```

### Stripe
```regex
# Secret Key
sk_live_[0-9a-zA-Z]{24}
sk_test_[0-9a-zA-Z]{24}

# Publishable Key
pk_live_[0-9a-zA-Z]{24}
pk_test_[0-9a-zA-Z]{24}

# Restricted Key
rk_live_[0-9a-zA-Z]{24}
rk_test_[0-9a-zA-Z]{24}
```

### Twilio
```regex
# Account SID
AC[a-f0-9]{32}

# Auth Token
[a-f0-9]{32}
```

### SendGrid
```regex
SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}
```

### Mailchimp
```regex
[a-f0-9]{32}-us[0-9]{1,2}
```

### OpenAI / Anthropic
```regex
# OpenAI
sk-[A-Za-z0-9]{48}

# Anthropic
sk-ant-[A-Za-z0-9]{95}
```

## Authentication Tokens

### JWT
```regex
eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*
```

### Bearer Token (Generic)
```regex
[Bb]earer\s+[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+
[Aa]uthorization:\s*Bearer\s+[A-Za-z0-9_-]{20,}
```

### Basic Auth (Base64)
```regex
[Bb]asic\s+[A-Za-z0-9+/=]{10,}
```

## Cryptographic Keys

### RSA Private Key
```regex
-----BEGIN RSA PRIVATE KEY-----
-----BEGIN PRIVATE KEY-----
-----BEGIN OPENSSH PRIVATE KEY-----
```

### SSH Private Key
```regex
-----BEGIN (RSA|DSA|EC|OPENSSH) PRIVATE KEY-----
```

### PGP Private Key
```regex
-----BEGIN PGP PRIVATE KEY BLOCK-----
```

### Certificate
```regex
-----BEGIN CERTIFICATE-----
```

## Database Credentials

### Connection Strings
```regex
# PostgreSQL
postgres(ql)?://[^:]+:[^@]+@[^/]+/[^\s]+

# MySQL
mysql://[^:]+:[^@]+@[^/]+/[^\s]+

# MongoDB
mongodb(\+srv)?://[^:]+:[^@]+@[^/]+

# Redis
redis://[^:]+:[^@]+@[^/]+

# Generic JDBC
jdbc:[a-z]+://[^:]+:[^@]+@[^/]+
```

### Password Patterns
```regex
[Pp]assword\s*[=:]\s*['"][^'"]{8,}['"]
[Pp]wd\s*[=:]\s*['"][^'"]{8,}['"]
DB_PASSWORD\s*=\s*['"]?[^'"]+['"]?
```

## Entropy-Based Detection

High-entropy strings that might be secrets:

```python
import math
from collections import Counter

def calculate_entropy(s):
    """Calculate Shannon entropy of a string"""
    if not s:
        return 0
    length = len(s)
    freq = Counter(s)
    return -sum((count/length) * math.log2(count/length) for count in freq.values())

# Thresholds:
# - Random 32-char hex: ~4.0 bits
# - Random 40-char base64: ~5.5 bits
# - English text: ~2.5-3.5 bits

ENTROPY_THRESHOLD = 4.5  # Flag strings above this
MIN_LENGTH = 16          # Minimum length to check
```

## File Types to Scan

**High Priority:**
- `.env`, `.env.local`, `.env.production`
- `config.json`, `config.yaml`, `config.yml`
- `secrets.json`, `credentials.json`
- `*.pem`, `*.key`, `*.p12`, `*.pfx`
- `terraform.tfvars`, `*.tf`
- `docker-compose.yml`, `Dockerfile`
- `.npmrc`, `.pypirc`

**Medium Priority:**
- `application.properties`, `application.yml`
- `appsettings.json`, `web.config`
- `settings.py`, `config.py`
- `package.json` (check scripts)
- `.gitconfig`, `.netrc`

## False Positive Reduction

### Exclude These Patterns
```regex
# Example/placeholder values
example\.com|test@|placeholder|changeme|your[-_]?|<.*>|\[.*\]|xxx+|dummy

# Documentation
README|EXAMPLE|SAMPLE|TEMPLATE|docs/

# Test files
test_|_test\.|\.test\.|spec\.|mock|fixture

# Package lock files
package-lock\.json|yarn\.lock|Gemfile\.lock|poetry\.lock
```

### Context Validation
Before flagging, verify:
1. Not in a comment
2. Not in documentation
3. Not a test/example value
4. Looks like actual credential (length, charset)
5. High entropy if appears random

## Combined Grep Command

```bash
# Comprehensive secrets scan
grep -rEn \
  "(AKIA|AGPA|AIDA)[A-Z0-9]{16}|\
AIza[0-9A-Za-z_-]{35}|\
ghp_[A-Za-z0-9]{36}|\
sk_live_[0-9a-zA-Z]{24}|\
xox[bprs]-[0-9]{11}|\
-----BEGIN.*PRIVATE KEY-----|\
eyJ[A-Za-z0-9_-]*\.eyJ|\
[pP]assword\s*[=:]\s*['\"][^'\"]{8,}['\"]|\
mongodb(\+srv)?://[^:]+:[^@]+@|\
postgres://[^:]+:[^@]+@" \
  --include="*.{js,ts,py,go,java,php,rb,env,yaml,yml,json,xml,tf,sh}" \
  --exclude-dir={node_modules,vendor,venv,.git,dist,build}
```
