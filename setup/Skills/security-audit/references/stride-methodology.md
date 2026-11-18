# STRIDE Threat Modeling Methodology

Use these categories to form testable hypotheses for the audited architecture.
A category or search match alone is not a confirmed vulnerability.

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

**Search leads:** `verify`, `authenticate`, `login`, `session`, `jwt`, `token`, and `bearer`.

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

**Search leads:** SQL text built by concatenation or interpolation; object assignment or merge of request data; file paths assembled from user input.

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

**Search leads:** `log`, `logger`, `console`, `audit`, `track`, and `record` near security-sensitive actions.

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

**Search leads:** `stack`, `trace`, `debug`, `dump`, `password`, `secret`, `apiKey`, and `token` in responses or logs.

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

**Search leads:** Loops or recursion over request data, upload and stream handlers, pagination limits, and throttling controls.

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

**Search leads:** `role`, `admin`, `permission`, `isAdmin`, `userId`, `user_id`, `authorize`, `allow`, and `deny`.

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

## Interpreting hypotheses

These categories and search patterns generate leads for review.
Confirm the reachable path, attacker prerequisites, effective controls, and impact before adding a vulnerability to the report.
Assign severity from the validated case rather than the STRIDE category.
