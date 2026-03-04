# Android Bug Bounty Impact Matrix

## Impact Assessment Framework

### What makes a finding valid for YesWeHack?

1. **Reproducible** — Can be demonstrated with concrete steps
2. **Impactful** — Has real consequence (data breach, account takeover, financial loss)
3. **Not theoretical** — Requires actual vulnerable code evidence, not just "could be vulnerable"
4. **In-scope** — The com.vuitton.android app itself, not third-party SDKs unless the vulnerability is in LV's usage

---

## Vulnerability × Impact Matrix

| Vulnerability | Attacker Position | Impact | CVSS Range | Priority |
|--------------|-------------------|--------|------------|----------|
| Exported Activity (no permission) → auth bypass | Malicious app on device | Account takeover | 7.5-9.0 | P0 |
| ContentProvider path traversal | Malicious app on device | Arbitrary file read (tokens, DB) | 7.5-8.5 | P0 |
| Hardcoded Firebase admin key | Remote | Full DB read/write | 9.0-10.0 | P0 |
| Private key in APK (extractable) | Remote (download APK) | mTLS impersonation, MITM | 8.0-9.5 | P0 |
| WebView + deep link → XSS | Remote (phishing link) | Script exec in app context | 7.0-8.5 | P0 |
| TrustManager bypass | Network position | MITM all traffic | 7.5-9.0 | P0 |
| debuggable=true (production) | ADB access | Full app compromise | 9.0 | P0 |
| Stripe/payment live key | Remote | Financial fraud | 9.0-10.0 | P0 |
| Firebase DB open (unauth read) | Remote | Customer PII exposure | 8.0-9.0 | P1 |
| Exported BroadcastReceiver | Malicious app on device | Sensitive data interception | 5.5-7.5 | P1 |
| HTTP cleartext (auth endpoints) | Network MITM | Credential theft | 6.5-8.0 | P1 |
| JWT hardcoded | Remote | Fixed account access | 7.0-8.5 | P1 |
| addJavascriptInterface (API<17) | Remote (WebView) | Code execution | 9.0+ | P1 |
| Biometric bypass | Physical access | Auth bypass | 6.5-8.0 | P1 |
| allowBackup=true + sensitive data | ADB access | Data extraction | 4.0-6.0 | P2 |
| Log statements with tokens | Debug/ADB | Info disclosure | 4.0-5.5 | P2 |
| External storage sensitive data | Malicious app on device | PII leakage | 5.0-7.0 | P2 |

---

## Escalating Impact

### Device-only → Remote escalation
Some "local" findings become critical when combined:
- Exported Activity + deep link from web = **remote exploitable** (no malicious app needed)
- Exported WebView + JavaScript enabled + user-reachable URL = **phishing → code execution**
- Firebase misconfiguration = **fully remote, no device access needed**

### SDK vs App code
If a vulnerability is in a third-party SDK (OkHttp, Glide, etc.):
- Only report if **LV is using it insecurely** (e.g., disabled cert checking in their OkHttp config)
- Don't report upstream SDK vulns unless they have a CVE and the SDK is outdated

---

## CWE Quick Reference

| CWE | Name | Common Android manifestation |
|-----|------|------------------------------|
| CWE-200 | Information Exposure | Logcat, SharedPrefs, external storage |
| CWE-312 | Cleartext Storage of Sensitive Info | SharedPreferences, SQLite unencrypted |
| CWE-319 | Cleartext Transmission | HTTP endpoints, no cert pinning with sensitive data |
| CWE-321 | Use of Hard-coded Cryptographic Key | smali const-string with AES key |
| CWE-798 | Use of Hard-coded Credentials | API keys, tokens, passwords in smali |
| CWE-489 | Active Debug Code | android:debuggable="true" |
| CWE-502 | Deserialization of Untrusted Data | Parcelable/Serializable from intents |
| CWE-601 | Open Redirect | WebView loadUrl(intent.getData()) |
| CWE-611 | XML External Entity | XML parsers in smali |
| CWE-639 | IDOR | Object references in ContentProvider |
| CWE-749 | Exposed Dangerous Method | addJavascriptInterface |
| CWE-921 | Storage of Sensitive Data in Mechanism without Access Control | External storage |
| CWE-926 | Improper Export of Android Application Component | exported=true components |
| CWE-927 | Use of Implicit Intent for Sensitive Communication | Implicit broadcasts with tokens |

---

## Report Quality Checklist (YesWeHack standard)

- [ ] Title is specific (not "Hardcoded Secret" but "Hardcoded Stripe Live API Key Allows Unauthorized Payment Creation")
- [ ] CVSS vector string included
- [ ] Step-by-step reproduction (reviewer must be able to reproduce)
- [ ] Impact is business-relevant (customer data, financial, brand reputation)
- [ ] File path + grep output as evidence
- [ ] Remediation is specific and actionable
- [ ] Not a duplicate of a known/patched issue
- [ ] Tested against the specific version analyzed
