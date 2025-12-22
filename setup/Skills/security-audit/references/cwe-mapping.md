# CWE Mapping Reference

## Critical Severity (CVSS 9.0-10.0)

| CWE | Name | Description | CVSS | Remediation |
|-----|------|-------------|------|-------------|
| CWE-78 | OS Command Injection | User input executed as system command | 9.8 | Use parameterized APIs, avoid shell=True |
| CWE-89 | SQL Injection | User input in SQL queries | 9.8 | Use parameterized queries/prepared statements |
| CWE-94 | Code Injection | User input executed as code | 9.8 | Never eval() user input, use safe alternatives |
| CWE-287 | Improper Authentication | Authentication can be bypassed | 9.8 | Implement proper auth checks on all endpoints |
| CWE-434 | Unrestricted Upload | Dangerous file types uploadable | 9.8 | Validate file type, content, size; store outside webroot |
| CWE-502 | Deserialization of Untrusted Data | Deserializing attacker data | 9.8 | Avoid deserializing untrusted data, use safe formats |
| CWE-798 | Hardcoded Credentials | Credentials in source code | 9.1 | Use environment variables, secrets management |

## High Severity (CVSS 7.0-8.9)

| CWE | Name | Description | CVSS | Remediation |
|-----|------|-------------|------|-------------|
| CWE-22 | Path Traversal | Access files outside intended directory | 8.6 | Validate/sanitize paths, use allowlist |
| CWE-79 | XSS (Reflected/Stored) | Script injection in web pages | 8.2 | Encode output, use CSP, sanitize input |
| CWE-91 | XML Injection | User input in XML | 8.0 | Use safe parsers, disable external entities |
| CWE-98 | PHP File Inclusion | Include attacker-controlled files | 8.8 | Use allowlist for includes |
| CWE-269 | Improper Privilege Management | Incorrect permission assignment | 8.8 | Implement least privilege, proper RBAC |
| CWE-285 | Improper Authorization | Missing access control | 8.8 | Check authorization on every request |
| CWE-306 | Missing Authentication | Critical function without auth | 8.6 | Require authentication for sensitive operations |
| CWE-327 | Broken Crypto Algorithm | Weak cryptographic algorithm | 7.5 | Use modern algorithms (AES-256, RSA-2048+) |
| CWE-347 | Improper Verification of Signature | Signature not properly verified | 8.1 | Always verify signatures with correct algorithm |
| CWE-352 | CSRF | Cross-site request forgery | 8.0 | Use CSRF tokens, SameSite cookies |
| CWE-384 | Session Fixation | Session not regenerated | 7.5 | Regenerate session after authentication |
| CWE-611 | XXE | XML External Entity injection | 8.2 | Disable external entities in XML parser |
| CWE-639 | IDOR | Insecure Direct Object Reference | 8.1 | Verify ownership/authorization for each resource |
| CWE-918 | SSRF | Server-Side Request Forgery | 8.6 | Validate URLs, use allowlist, block internal IPs |
| CWE-1321 | Prototype Pollution | Object prototype modification | 7.5 | Use Object.create(null), validate object keys |

## Medium Severity (CVSS 4.0-6.9)

| CWE | Name | Description | CVSS | Remediation |
|-----|------|-------------|------|-------------|
| CWE-117 | Log Injection | User input in logs | 5.3 | Sanitize log messages, encode special chars |
| CWE-200 | Information Exposure | Sensitive data in error messages | 5.3 | Use generic error messages, log details server-side |
| CWE-209 | Error Message Information Leak | Stack traces exposed | 5.3 | Disable debug mode in production |
| CWE-276 | Incorrect Default Permissions | Overly permissive defaults | 6.5 | Apply least privilege by default |
| CWE-307 | Improper Restriction of Auth Attempts | No brute force protection | 5.3 | Implement rate limiting, account lockout |
| CWE-312 | Cleartext Storage | Sensitive data unencrypted | 6.5 | Encrypt sensitive data at rest |
| CWE-319 | Cleartext Transmission | Sensitive data over HTTP | 5.9 | Use HTTPS/TLS for all communications |
| CWE-400 | Resource Exhaustion | DoS through resource consumption | 6.5 | Implement rate limiting, input size limits |
| CWE-521 | Weak Password Requirements | Weak password policy | 5.3 | Enforce strong passwords (12+ chars, complexity) |
| CWE-532 | Insertion of Sensitive Info into Log | Secrets in logs | 5.5 | Never log passwords, tokens, PII |
| CWE-601 | Open Redirect | Redirect to untrusted URL | 6.1 | Validate redirect URLs, use allowlist |
| CWE-614 | Sensitive Cookie Without Secure Flag | Cookie sent over HTTP | 5.3 | Set Secure and HttpOnly flags |
| CWE-770 | Resource Allocation Without Limits | Unbounded resource usage | 6.5 | Set limits on uploads, queries, connections |
| CWE-915 | Mass Assignment | Unfiltered object update | 6.5 | Explicitly define allowed fields |
| CWE-943 | Improper Neutralization of Special Elements in Data Query Logic | NoSQL injection | 6.5 | Sanitize NoSQL queries, type-check inputs |

## Low Severity (CVSS 0.1-3.9)

| CWE | Name | Description | CVSS | Remediation |
|-----|------|-------------|------|-------------|
| CWE-16 | Configuration | Insecure configuration | 3.7 | Follow security hardening guides |
| CWE-223 | Omission of Security-relevant Information | Missing audit info | 3.7 | Log all security-relevant events |
| CWE-295 | Improper Certificate Validation | Certificate not validated | 3.7 | Validate SSL/TLS certificates |
| CWE-548 | Exposure of Information Through Directory Listing | Directory listing enabled | 3.7 | Disable directory listing |
| CWE-693 | Protection Mechanism Failure | Security feature missing | 3.7 | Implement defense in depth |
| CWE-778 | Insufficient Logging | Missing audit trail | 3.7 | Log authentication, authorization, errors |
| CWE-942 | Permissive CORS Policy | CORS allows any origin | 3.7 | Restrict CORS to trusted origins |
| CWE-1004 | Sensitive Cookie Without HttpOnly | Cookie accessible via JS | 3.1 | Set HttpOnly flag on session cookies |

## Quick Lookup by Vulnerability Type

### Injection Vulnerabilities
| Type | CWE | Severity |
|------|-----|----------|
| SQL Injection | CWE-89 | Critical |
| OS Command Injection | CWE-78 | Critical |
| Code Injection | CWE-94 | Critical |
| XSS | CWE-79 | High |
| XXE | CWE-611 | High |
| LDAP Injection | CWE-90 | High |
| XPath Injection | CWE-643 | High |
| NoSQL Injection | CWE-943 | Medium |
| Log Injection | CWE-117 | Medium |
| SSTI | CWE-1336 | Critical |

### Authentication/Authorization
| Type | CWE | Severity |
|------|-----|----------|
| Authentication Bypass | CWE-287 | Critical |
| Missing Authentication | CWE-306 | High |
| Improper Authorization | CWE-285 | High |
| IDOR | CWE-639 | High |
| Session Fixation | CWE-384 | High |
| CSRF | CWE-352 | High |
| Privilege Escalation | CWE-269 | High |

### Cryptographic Issues
| Type | CWE | Severity |
|------|-----|----------|
| Hardcoded Secrets | CWE-798 | Critical |
| Weak Crypto | CWE-327 | High |
| Cleartext Storage | CWE-312 | Medium |
| Cleartext Transmission | CWE-319 | Medium |
| Weak Random | CWE-330 | Medium |

### Input Validation
| Type | CWE | Severity |
|------|-----|----------|
| Path Traversal | CWE-22 | High |
| File Upload | CWE-434 | Critical |
| Open Redirect | CWE-601 | Medium |
| SSRF | CWE-918 | High |
| Prototype Pollution | CWE-1321 | High |

## CVSS v3.1 Scoring Guide

```
Base Score = Impact + Exploitability

Attack Vector (AV):
- Network (N): 0.85
- Adjacent (A): 0.62  
- Local (L): 0.55
- Physical (P): 0.20

Attack Complexity (AC):
- Low (L): 0.77
- High (H): 0.44

Privileges Required (PR):
- None (N): 0.85
- Low (L): 0.62
- High (H): 0.27

User Interaction (UI):
- None (N): 0.85
- Required (R): 0.62

Scope (S):
- Unchanged (U): 6.42
- Changed (C): 7.52

Impact (CIA each):
- High (H): 0.56
- Low (L): 0.22
- None (N): 0
```

## Bug Bounty Payout Correlation

Based on typical bounty programs:

| Severity | Typical Payout Range | Examples |
|----------|---------------------|----------|
| Critical | $5,000 - $100,000+ | RCE, Auth Bypass, SQL Injection |
| High | $1,000 - $15,000 | XSS (Stored), IDOR, SSRF |
| Medium | $200 - $3,000 | CSRF, Info Disclosure, Open Redirect |
| Low | $50 - $500 | Missing Headers, Cookie Flags |
