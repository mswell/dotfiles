# Android CWE Quick Reference for Bug Bounty

Prioritized CWE list for Android APK static analysis.
Sorted by typical bug bounty impact.

## Critical / High

| CWE | Title | What to Look For | CVSS Range |
|---|---|---|---|
| CWE-798 | Hardcoded Credentials | API keys, tokens, passwords in source/assets/native libs | 7.5–9.8 |
| CWE-749 | Exposed Dangerous Method | `addJavascriptInterface` on API < 17 → RCE | 9.8 |
| CWE-94 | Code Injection | JS injection via `loadUrl("javascript:...")` with user input | 8.1–9.8 |
| CWE-78 | OS Command Injection | `Runtime.exec()` / `ProcessBuilder` with tainted input | 8.1–9.8 |
| CWE-89 | SQL Injection | ContentProvider `query()` with unsanitized `selection` param | 7.5–9.8 |
| CWE-22 | Path Traversal | ContentProvider `openFile()` without `../` validation | 7.5–8.6 |
| CWE-926 | Improper Export | Components with `exported=true` and no permission protection | 6.5–8.1 |
| CWE-319 | Cleartext Transmission | `http://` URLs, missing network_security_config, `ws://` | 5.9–7.5 |
| CWE-295 | Improper Cert Validation | TrustAllCerts, empty checkServerTrusted, ALLOW_ALL_HOSTNAME | 5.9–7.4 |

## Medium

| CWE | Title | What to Look For | CVSS Range |
|---|---|---|---|
| CWE-312 | Cleartext Storage | Tokens/passwords in SharedPreferences/SQLite unencrypted | 5.5–6.5 |
| CWE-532 | Sensitive Info in Logs | `Log.d()` with tokens, passwords, PII, session IDs | 4.3–5.5 |
| CWE-927 | Implicit Intent Broadcast | Sensitive data sent via implicit intents (readable by any app) | 4.3–5.5 |
| CWE-1275 | Cookie without Secure Flag | WebView cookies without `setSecure(true)` | 4.3–5.3 |
| CWE-829 | Untrusted Functionality | `loadUrl()` from deep link without domain validation | 5.4–6.1 |
| CWE-250 | Unnecessary Privileges | Excessive permissions not required for app functionality | 3.3–5.3 |
| CWE-939 | Improper Auth on Resource | FileProvider with overly broad paths (`<root-path path="/" />`) | 5.3–6.5 |
| CWE-940 | Improper Verification of Source | PendingIntent with FLAG_MUTABLE on implicit intent | 4.3–6.1 |

## Low

| CWE | Title | What to Look For | CVSS Range |
|---|---|---|---|
| CWE-200 | Information Exposure | Debug logs, stack traces, internal paths, version info | 3.3–4.3 |
| CWE-921 | External Storage | Sensitive data on external storage (world-readable) | 3.3–4.3 |
| CWE-1021 | Tapjacking | Missing `filterTouchesWhenObscured` on sensitive UI | 3.3–4.3 |
| CWE-524 | Caching Sensitive Info | WebView cache with auth tokens, session data | 2.4–3.3 |
| CWE-693 | Protection Mechanism Failure | Client-side root/emulator detection only (bypassable) | 3.3–4.3 |

## Common Android Attack Chains

Use these chains to escalate individual findings into higher-severity reports.

### Deep Link → WebView → RCE
```
CWE-926 (exported activity) → CWE-829 (untrusted URL load) → CWE-749 (JS bridge) = RCE
```
CVSS: 9.8 — Full remote code execution via crafted deep link.

### Intent Injection → Data Theft
```
CWE-926 (exported component) → CWE-927 (implicit intent) → CWE-200 (info leak)
```
CVSS: 7.5 — Sensitive data exfiltration via malicious intent.

### Provider Traversal → Arbitrary File Read
```
CWE-926 (exported provider) → CWE-22 (path traversal in openFile) = File Read
```
CVSS: 7.5–8.6 — Read arbitrary files from app sandbox.

### FileProvider Misconfiguration → File Access
```
CWE-939 (overly broad FileProvider paths) + CWE-926 (exported/grantable) = File Access
```
CVSS: 5.3–7.5 — Access to files outside intended scope.

### Task Hijacking → Credential Phishing
```
CWE-1021 (singleTask + taskAffinity) → Overlay activity = Phishing
```
CVSS: 6.5 — Steal credentials via fake login overlay.

### PendingIntent Hijacking → Privilege Escalation
```
CWE-940 (mutable implicit PendingIntent) → Attacker redirects intent = Priv Esc
```
CVSS: 6.1–7.5 — Execute actions with victim app's permissions.

### Insecure Storage + Backup → Data Extraction
```
CWE-312 (cleartext storage) + android:allowBackup=true = Data Extraction via adb backup
```
CVSS: 5.5–6.5 — Extract stored credentials via backup.

## CVSS 3.1 Quick Scoring Guide

**Attack Vector (AV):**
- Network (N): deep links, web-triggered, no physical access
- Adjacent (A): same network (rare in mobile)
- Local (L): malicious app on same device
- Physical (P): physical device access

**For Android bug bounty, most findings are AV:L** (malicious app) or **AV:N** (deep link / web trigger).

**Privileges Required (PR):**
- None (N): no app install needed (deep link from browser)
- Low (L): malicious app installed (most IPC attacks)
- High (H): privileged access needed

**User Interaction (UI):**
- None (N): exploit works without user action
- Required (R): user must click link / install app
