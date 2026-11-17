# CWE mapping

Use this list to look up a likely weakness category after validating the behavior.
A CWE identifies the kind of weakness; it does not determine impact, severity, or a CVSS score.
Verify the chosen CWE against the specific finding before publishing a report.

| Finding type | Candidate CWE |
|---|---|
| OS command injection | CWE-78 |
| SQL injection | CWE-89 |
| Code injection | CWE-94 |
| Cross-site scripting | CWE-79 |
| XML injection | CWE-91 |
| PHP file inclusion | CWE-98 |
| XML external entity processing | CWE-611 |
| LDAP injection | CWE-90 |
| XPath injection | CWE-643 |
| NoSQL injection | CWE-943 |
| Server-side template injection | CWE-1336 |
| Path traversal | CWE-22 |
| Unrestricted file upload | CWE-434 |
| Server-side request forgery | CWE-918 |
| Prototype pollution | CWE-1321 |
| Mass assignment | CWE-915 |
| Open redirect | CWE-601 |
| Log injection | CWE-117 |
| Authentication failure | CWE-287 |
| Missing authentication | CWE-306 |
| Improper authorization | CWE-285 |
| Insecure direct object reference | CWE-639 |
| Improper privilege management | CWE-269 |
| Session fixation | CWE-384 |
| Cross-site request forgery | CWE-352 |
| Insufficient restriction of authentication attempts | CWE-307 |
| Weak password requirements | CWE-521 |
| Hardcoded credentials | CWE-798 |
| Cleartext storage of sensitive data | CWE-312 |
| Cleartext transmission of sensitive data | CWE-319 |
| Improper certificate validation | CWE-295 |
| Weak cryptographic algorithm | CWE-327 |
| Inadequate randomness | CWE-330 |
| Improper signature verification | CWE-347 |
| Sensitive data written to logs | CWE-532 |
| Information exposure | CWE-200 |
| Sensitive information in error messages | CWE-209 |
| Directory listing exposure | CWE-548 |
| Incorrect default permissions | CWE-276 |
| Permissive cross-origin resource sharing | CWE-942 |
| Sensitive cookie without Secure flag | CWE-614 |
| Sensitive cookie without HttpOnly flag | CWE-1004 |
| Uncontrolled resource consumption | CWE-400 |
| Resource allocation without limits | CWE-770 |
| Insufficient security event logging | CWE-778 |

## Severity and scoring

Assess the actual preconditions, reachability, environment, affected assets, and confidentiality, integrity, and availability impact.
State any assumptions about deployment or compensating controls.
If the report includes CVSS, record the selected version, complete vector, score, and rationale for its metrics.
When those facts are unavailable, omit the score and describe what remains to verify.
