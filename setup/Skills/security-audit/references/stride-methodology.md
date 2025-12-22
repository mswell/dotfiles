# STRIDE Threat Modeling Methodology

## Overview

STRIDE is a threat classification model for identifying security threats. Apply each category to every component and data flow.

## Categories

### S - Spoofing (Authentication)
**Question:** Can an attacker pretend to be someone/something else?

**Targets:**
- User authentication
- Service-to-service auth
- API authentication
- Session management

**Common vulnerabilities:**
| Vulnerability | CWE | Pattern to find |
|---------------|-----|-----------------|
| Weak password policy | CWE-521 | Password validation regex, min length checks |
| Missing auth | CWE-306 | Endpoints without auth middleware |
| JWT algorithm confusion | CWE-347 | `algorithms: ['HS256', 'RS256']` |
| Session fixation | CWE-384 | Session not regenerated after login |
| Credential stuffing | CWE-307 | No rate limiting on login |

**Search patterns:**
```bash
grep -rn "verify\|authenticate\|login\|session" --include="*.{js,ts,py,go}"
grep -rn "jwt\|token\|bearer" --include="*.{js,ts,py,go}"
```

### T - Tampering (Integrity)
**Question:** Can an attacker modify data they shouldn't?

**Targets:**
- User input
- Database records
- Files/uploads
- Configuration
- Memory/variables

**Common vulnerabilities:**
| Vulnerability | CWE | Pattern to find |
|---------------|-----|-----------------|
| SQL injection | CWE-89 | String concatenation in queries |
| Mass assignment | CWE-915 | `Object.assign`, spread operator on user input |
| Path traversal | CWE-22 | User input in file paths |
| XML injection | CWE-91 | Unvalidated XML parsing |
| Prototype pollution | CWE-1321 | `__proto__`, `constructor.prototype` |

**Search patterns:**
```bash
grep -rn "SELECT.*\+\|INSERT.*\+\|UPDATE.*\+" --include="*.{js,ts,py}"
grep -rn "\.assign\|spread\|merge" --include="*.{js,ts}"
grep -rn "open\|read\|write" --include="*.py"
```

### R - Repudiation (Audit)
**Question:** Can an attacker deny performing an action?

**Targets:**
- Critical transactions
- Authentication events
- Data modifications
- Administrative actions

**Common vulnerabilities:**
| Vulnerability | CWE | Pattern to find |
|---------------|-----|-----------------|
| Insufficient logging | CWE-778 | Missing audit trails |
| Log injection | CWE-117 | User input in log messages |
| Missing timestamps | CWE-223 | Events without timestamps |
| No user attribution | CWE-778 | Actions without user ID |

**Search patterns:**
```bash
grep -rn "log\.\|logger\.\|console\." --include="*.{js,ts,py,go}"
grep -rn "audit\|track\|record" --include="*.{js,ts,py,go}"
```

### I - Information Disclosure (Confidentiality)
**Question:** Can an attacker access data they shouldn't?

**Targets:**
- API responses
- Error messages
- Debug information
- Logs
- Source code exposure

**Common vulnerabilities:**
| Vulnerability | CWE | Pattern to find |
|---------------|-----|-----------------|
| Verbose errors | CWE-209 | Stack traces in responses |
| IDOR | CWE-639 | Direct object references without authz |
| Directory listing | CWE-548 | Static file serving config |
| Hardcoded secrets | CWE-798 | API keys, passwords in code |
| GraphQL introspection | CWE-200 | Introspection enabled in prod |

**Search patterns:**
```bash
grep -rn "stack\|trace\|debug\|dump" --include="*.{js,ts,py,go}"
grep -rn "password\|secret\|api.key\|token" --include="*.{js,ts,py,env,yaml}"
```

### D - Denial of Service (Availability)
**Question:** Can an attacker disrupt service availability?

**Targets:**
- API endpoints
- File uploads
- Database queries
- External service calls
- Resource-intensive operations

**Common vulnerabilities:**
| Vulnerability | CWE | Pattern to find |
|---------------|-----|-----------------|
| ReDoS | CWE-1333 | Complex regex with user input |
| Resource exhaustion | CWE-400 | No limits on uploads, queries |
| Algorithmic complexity | CWE-407 | Unbounded loops with user input |
| Missing rate limiting | CWE-770 | No throttling on endpoints |
| Uncontrolled recursion | CWE-674 | Recursive functions with user input |

**Search patterns:**
```bash
grep -rn "while\|for\|recursion" --include="*.{js,ts,py,go}"
grep -rn "upload\|file\|stream" --include="*.{js,ts,py,go}"
grep -rn "rate.limit\|throttle" --include="*.{js,ts,py,go}"
```

### E - Elevation of Privilege (Authorization)
**Question:** Can an attacker gain unauthorized permissions?

**Targets:**
- Role-based access
- Resource ownership
- Administrative functions
- Cross-tenant access

**Common vulnerabilities:**
| Vulnerability | CWE | Pattern to find |
|---------------|-----|-----------------|
| IDOR | CWE-639 | User ID from request without validation |
| Missing function-level access control | CWE-285 | Admin endpoints without role check |
| Privilege escalation | CWE-269 | Role modification without validation |
| Insecure defaults | CWE-276 | Default admin/root permissions |
| JWT claim manipulation | CWE-287 | Role/permission in JWT without server validation |

**Search patterns:**
```bash
grep -rn "role\|admin\|permission\|isAdmin" --include="*.{js,ts,py,go}"
grep -rn "user.id\|userId\|user_id" --include="*.{js,ts,py,go}"
grep -rn "authorize\|can\|allow\|deny" --include="*.{js,ts,py,go}"
```

## STRIDE Analysis Template

For each component/flow, document:

```json
{
  "component": "User Authentication",
  "stride_analysis": {
    "spoofing": {
      "applicable": true,
      "threats": ["Credential stuffing", "Session hijacking"],
      "existing_controls": ["bcrypt hashing"],
      "gaps": ["No rate limiting", "No MFA"]
    },
    "tampering": {
      "applicable": true,
      "threats": ["JWT modification"],
      "existing_controls": ["Signature verification"],
      "gaps": ["Algorithm confusion possible"]
    },
    "repudiation": {
      "applicable": true,
      "threats": ["Login attempts not logged"],
      "existing_controls": ["None found"],
      "gaps": ["No audit trail"]
    },
    "information_disclosure": {
      "applicable": true,
      "threats": ["User enumeration via error messages"],
      "existing_controls": ["Generic error messages"],
      "gaps": ["Timing differences in response"]
    },
    "denial_of_service": {
      "applicable": true,
      "threats": ["Brute force attacks"],
      "existing_controls": ["None found"],
      "gaps": ["No account lockout"]
    },
    "elevation_of_privilege": {
      "applicable": true,
      "threats": ["Role manipulation in JWT"],
      "existing_controls": ["Server-side role lookup"],
      "gaps": ["None identified"]
    }
  }
}
```

## Severity Rating Guide

| Severity | CVSS | Criteria |
|----------|------|----------|
| Critical | 9.0-10.0 | Remote code execution, auth bypass, data breach |
| High | 7.0-8.9 | Privilege escalation, significant data access |
| Medium | 4.0-6.9 | Limited data exposure, requires user interaction |
| Low | 0.1-3.9 | Information disclosure, minor impact |

## Bug Bounty Relevance

High-value targets for bounty programs:
1. **Authentication bypass** - Almost always critical
2. **IDOR** - Very common, often high severity
3. **SSRF** - Can lead to internal network access
4. **SQL injection** - Classic, always valuable
5. **Privilege escalation** - Horizontal and vertical
6. **Business logic flaws** - Often missed by automated tools
7. **Race conditions** - Hard to find, valuable
