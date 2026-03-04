---
name: apk-bugbounty
description: Android APK static analysis for bug bounty hunting. Analyzes decompiled APK (apktool output) focusing on HIGH-IMPACT, EXPLOITABLE findings. Covers secrets, exported components, WebViews, deep links, Firebase, certificates, and business logic flaws. Every finding MUST have concrete evidence and real exploit impact.
---

# Android APK Bug Bounty Analysis Skill

Static analysis of decompiled Android APKs (apktool output) for bug bounty programs.
**Rule #1: No impact = not reported. Every finding must be exploitable and have real-world consequence.**

## Target Structure (apktool output)

```
<apk_root>/
├── AndroidManifest.xml     ← Entry point: exported components, permissions, deep links
├── assets/                 ← Secrets, certs, configs, proto files
├── res/                    ← xml/network_security_config.xml, strings.xml, xml/file_paths.xml
├── smali*/                 ← Decompiled bytecode (main logic)
└── unknown/                ← Bundled files, proto schemas, build artifacts
```

## Workflow Overview

Execute phases in order. Stop a phase only if zero relevant files found.

```
Phase 1: Manifest & Permissions   → exported components, deep links, dangerous permissions
Phase 2: Secrets & Certificates   → hardcoded keys, certs, tokens in assets/smali/res
Phase 3: Network Security         → cleartext, cert pinning, MITM surface
Phase 4: WebView Analysis         → JS enabled, file access, addJavascriptInterface, deep link → WebView
Phase 5: Data Storage             → SharedPreferences, SQLite, files, external storage
Phase 6: IPC & Component Abuse    → Intent injection, provider traversal, broadcast abuse
Phase 7: Firebase & Cloud         → misconfig, exposed endpoints, hardcoded project IDs
Phase 8: Business Logic           → payment flows, auth bypass, privilege escalation hints
Phase 9: Report                   → Only confirmed findings, sorted by impact
```

---

## Phase 1: Manifest & Permissions Analysis

**Goal:** Map attack surface — what can an external app or user invoke?

**Search commands:**
```bash
# Find all exported components
grep -n 'android:exported="true"' AndroidManifest.xml
grep -n 'android:exported="true"' AndroidManifest.xml | grep -i "activity\|service\|receiver\|provider"

# Deep links / custom schemes
grep -n 'android:scheme\|android:host\|android:pathPrefix\|data android:' AndroidManifest.xml

# Dangerous permissions
grep -n 'uses-permission' AndroidManifest.xml

# Backup enabled (data extraction)
grep -n 'android:allowBackup\|android:fullBackupContent\|android:dataExtractionRules' AndroidManifest.xml

# Debug flag
grep -n 'android:debuggable' AndroidManifest.xml

# Network security config
grep -n 'android:networkSecurityConfig' AndroidManifest.xml

# Content providers with grants
grep -n 'android:grantUriPermissions\|android:readPermission\|android:writePermission' AndroidManifest.xml

# TaskAffinity hijacking candidates
grep -n 'android:taskAffinity' AndroidManifest.xml
```

**High-impact findings:**
| Finding | Impact | Severity |
|---------|--------|----------|
| Exported Activity without permission | UI redress, data theft, auth bypass | High |
| Exported Activity handling deep links | Deep link hijacking → open redirect, XSS in WebView | High |
| Exported ContentProvider without permission | Arbitrary file read via path traversal | Critical |
| Exported Service | Unauthorized command execution | High |
| `android:allowBackup="true"` | Data extraction via adb backup | Medium |
| `android:debuggable="true"` | Full app compromise via JDWP | Critical |
| Exported BroadcastReceiver | Intent spoofing, sensitive data interception | Medium-High |
| `android:exported` implicit (API<31, has intent-filter) | Same as explicit exported=true | High |

**For each exported component, document:**
- Component name (full class name)
- Type (Activity/Service/Receiver/Provider)
- Intent filters / schemes / hosts
- Permission protection (none = exploitable)
- Attack scenario with PoC intent

---

## Phase 2: Secrets & Certificates

**Goal:** Find credentials, private keys, API tokens with actual access.

**Search commands:**
```bash
# High-entropy strings / API keys in smali
grep -rn "const-string\|const-string/jumbo" smali*/ | grep -iE "(api[_-]?key|secret|token|password|passwd|apikey|auth|bearer|private[_-]?key|access[_-]?key)" | head -50

# AWS
grep -rn "AKIA\|ASIA\|AROA" smali*/ assets/ res/ unknown/ 2>/dev/null

# Firebase / Google API keys
grep -rn "AIza[0-9A-Za-z_-]{35}" smali*/ assets/ res/ unknown/ 2>/dev/null

# Firebase URLs
grep -rn "firebaseio\.com\|firebase\.google\.com" smali*/ assets/ res/ unknown/ 2>/dev/null | head -20

# Google Maps / Places
grep -rn "AIza" res/values/strings.xml assets/ 2>/dev/null

# Certificates and keystores
find assets/ -name "*.pfx" -o -name "*.p12" -o -name "*.keystore" -o -name "*.jks" -o -name "*.pem" -o -name "*.crt" -o -name "*.key" 2>/dev/null
find . -name "*.pfx" -o -name "*.p12" -o -name "*.jks" 2>/dev/null

# PFX/PKCS12 password attempts in smali (often near the filename)
grep -rn "Promise12\|\.pfx\|\.p12\|\.jks\|KeyStore\|PKCS12" smali*/ 2>/dev/null | head -30

# JWT
grep -rn "eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*" smali*/ assets/ res/ 2>/dev/null | head -20

# OAuth / app secrets
grep -rn "client_secret\|client_id\|app_secret\|consumer_key\|consumer_secret" smali*/ assets/ res/ unknown/ 2>/dev/null | head -20

# Stripe / Payment keys
grep -rn "sk_live\|pk_live\|sk_test\|pk_test\|rk_live" smali*/ assets/ res/ 2>/dev/null

# Hardcoded passwords / credentials
grep -rn "const-string" smali*/ | grep -iE '"(password|passwd|pwd|secret|credential)[s]?"\s*$' | head -20

# AppsFlayor / analytics keys
grep -rn "appsflyer\|AF_KEY\|devKey" smali*/ assets/ unknown/ 2>/dev/null | head -10

# Encryption keys (symmetric)
grep -rn "AES\|DES\|RC4\|Blowfish" smali*/ | grep -i "key\|secret\|encrypt" | head -20
```

**Certificate analysis (PFX/P12):**
```bash
# Inspect certificate metadata (does NOT extract private key)
openssl pkcs12 -info -in assets/Certificat_Promise12.pfx -nokeys -passin pass: 2>/dev/null || true
openssl pkcs12 -info -in assets/Certificat_Promise12.pfx -nokeys 2>&1 | head -30

# Check if password is empty, app name, or "123456"
for pw in "" "password" "123456" "lvmh" "vuitton" "louisvuitton" "Promise12" "android" "changeit"; do
  openssl pkcs12 -in assets/Certificat_Promise12.pfx -nokeys -passin "pass:$pw" 2>/dev/null && echo "PASSWORD: $pw" && break
done
```

**For each secret found, assess:**
- Is it a live credential? (prod vs dev/test)
- What system does it grant access to?
- What is the blast radius? (read-only vs admin)

---

## Phase 3: Network Security Analysis

**Goal:** Identify MITM opportunities and cert pinning bypass surfaces.

**Search commands:**
```bash
# Network security config
cat res/xml/network_security_config.xml 2>/dev/null || find res/ -name "network_security_config.xml" -exec cat {} \;

# Cleartext traffic allowed
grep -n "cleartextTrafficPermitted\|usesCleartextTraffic" res/xml/network_security_config.xml AndroidManifest.xml 2>/dev/null

# Trust user CAs / custom trust anchors
grep -n "certificates\|trust-anchors\|user\|system" res/xml/network_security_config.xml 2>/dev/null

# HTTP URLs (not HTTPS)
grep -rn "http://" smali*/ assets/ res/ | grep -v "schemas.android\|w3.org\|#\|localhost\|127.0.0.1\|comment" | head -30

# Certificate pinning implementation
grep -rn "CertificatePinner\|PinningTrustManager\|TrustManagerImpl\|checkServerTrusted\|getAcceptedIssuers\|OkHttp\|pinned\|SSLPinning" smali*/ 2>/dev/null | head -20

# TrustAllCerts / disabled validation (CRITICAL)
grep -rn "TrustManager\|X509TrustManager\|checkClientTrusted\|checkServerTrusted" smali*/ | grep -v "^Binary" | head -20

# HostnameVerifier bypass
grep -rn "HostnameVerifier\|ALLOW_ALL\|verify.*return.*true" smali*/ 2>/dev/null | head -10

# Interesting domains / endpoints
grep -rn "const-string" smali*/ | grep -iE '"https?://[^"]{10,}"' | grep -v "schemas\|w3\.org\|google\.com/fonts" | head -40
```

**Impact scoring:**
- `cleartextTrafficPermitted="true"` for production domain → High (MITM)
- `<certificates src="user"/>` → Trivial MITM with user-installed CA → High
- `checkServerTrusted` empty body → Critical (no cert validation)
- HTTP endpoints handling auth/PII → High

---

## Phase 4: WebView Analysis

**Goal:** Find XSS, arbitrary URL load, file access, JS bridge abuse.

**Search commands:**
```bash
# JavaScript enabled
grep -rn "setJavaScriptEnabled\|JavaScriptEnabled" smali*/ | head -20

# addJavascriptInterface (JS bridge = RCE potential on older APIs)
grep -rn "addJavascriptInterface" smali*/ | head -20

# File access
grep -rn "setAllowFileAccess\|setAllowFileAccessFromFileURLs\|setAllowUniversalAccessFromFileURLs" smali*/ | head -20

# loadUrl with user-controlled data (deep link → WebView)
grep -rn "loadUrl\|loadData\|loadDataWithBaseURL" smali*/ | head -20

# WebViewClient - shouldOverrideUrlLoading (open redirect)
grep -rn "shouldOverrideUrlLoading\|shouldInterceptRequest" smali*/ | head -20

# WebChromeClient - geolocation, file chooser
grep -rn "WebChromeClient\|onGeolocationPermissionsShowPrompt" smali*/ | head -10

# ShouldInterceptRequest → custom scheme handling
grep -rn "shouldInterceptRequest\|loadUrl" smali*/ | head -20

# Find WebView class usages near deep link handlers
grep -rn "WebView\|webview" smali*/ | grep -iv "import\|#" | head -30
```

**Critical patterns:**
- Deep link scheme → `loadUrl(uri)` without validation = open redirect / XSS
- `addJavascriptInterface` + `setJavaScriptEnabled` = JS bridge exposed
- `setAllowUniversalAccessFromFileURLs(true)` + `file://` loadable = file theft
- `shouldOverrideUrlLoading` returns `false` by default = all URLs loaded

---

## Phase 5: Insecure Data Storage

**Goal:** Find PII/secrets written to accessible locations.

**Search commands:**
```bash
# SharedPreferences (MODE_WORLD_READABLE is deprecated but check)
grep -rn "getSharedPreferences\|MODE_WORLD_READABLE\|MODE_WORLD_WRITEABLE" smali*/ | head -20

# External storage (world-readable on older Android)
grep -rn "getExternalStorage\|getExternalFilesDir\|Environment\.getExternal" smali*/ | head -20

# SQLite databases
grep -rn "openOrCreateDatabase\|SQLiteOpenHelper\|getWritableDatabase\|getReadableDatabase" smali*/ | head -20

# Cleartext logging of sensitive data
grep -rn "Log\.d\|Log\.v\|Log\.i\|Log\.w\|Log\.e" smali*/ | grep -iE "token|password|secret|key|user|email|credit|card|cvv|pin" | head -20

# File providers (path exposure)
cat res/xml/file_paths.xml 2>/dev/null || find res/ -name "file_paths.xml" -exec cat {} \;

# Clipboard (sensitive data copied)
grep -rn "ClipboardManager\|setPrimaryClip\|copyToClipboard" smali*/ | head -10

# Backup rules
find res/ -name "backup_rules.xml" -o -name "data_extraction_rules.xml" 2>/dev/null | xargs cat 2>/dev/null
```

---

## Phase 6: IPC & Component Abuse

**Goal:** Intent injection, ContentProvider path traversal, broadcast interception.

**Search commands:**
```bash
# ContentProvider file access (path traversal vector)
grep -rn "openFile\|openAssetFile\|query\|ParcelFileDescriptor" smali*/ | head -20

# File paths served by ContentProvider
cat res/xml/file_paths.xml 2>/dev/null

# Intent handling (extras used unsafely)
grep -rn "getIntent\|getStringExtra\|getIntExtra\|getBundleExtra\|getParcelableExtra" smali*/ | head -30

# Pending intents (hijacking)
grep -rn "PendingIntent\|FLAG_MUTABLE\|FLAG_IMMUTABLE" smali*/ | head -20

# Dynamic broadcast receivers (no permission)
grep -rn "registerReceiver" smali*/ | head -20

# Implicit broadcasts sent with sensitive data
grep -rn "sendBroadcast\|sendOrderedBroadcast" smali*/ | grep -v "permission" | head -20

# Fragment injection (older apps)
grep -rn "Fragment\|PreferenceActivity\|isValidFragment" smali*/ | head -10
```

**ContentProvider path traversal PoC:**
```bash
# If provider is exported without permission:
# adb shell content read --uri content://com.vuitton.android.provider/../../../data/data/com.vuitton.android/shared_prefs/secret.xml
```

---

## Phase 7: Firebase & Cloud Misconfigurations

**Goal:** Exposed Firebase databases, storage buckets, unauthenticated access.

**Search commands:**
```bash
# Firebase project IDs and keys
cat unknown/firebase-analytics.properties 2>/dev/null
cat unknown/firebase-analytics-ktx.properties 2>/dev/null
find . -name "google-services.json" 2>/dev/null | xargs cat 2>/dev/null
find . -name "*.properties" | xargs grep -l "firebase\|google" 2>/dev/null | xargs cat

# Firebase DB URL
grep -rn "firebaseio\.com" smali*/ assets/ res/ unknown/ 2>/dev/null

# Firebase storage bucket
grep -rn "appspot\.com\|storage\.googleapis\.com" smali*/ assets/ res/ unknown/ 2>/dev/null

# FCM server key (if hardcoded)
grep -rn "AAAA[A-Za-z0-9_-]{100,}" smali*/ assets/ 2>/dev/null

# Remote config keys
grep -rn "RemoteConfig\|FirebaseRemoteConfig\|fetchAndActivate" smali*/ | head -10
```

**Firebase DB test:**
```bash
# Test unauthenticated read (manual step - note the URL from findings)
# curl https://<project-id>.firebaseio.com/.json
# curl https://<project-id>.firebaseio.com/users.json
```

---

## Phase 8: Business Logic & Auth Flows

**Goal:** Find payment bypass, privilege escalation, auth token mishandling.

**Search commands:**
```bash
# Authentication logic
grep -rn "isLoggedIn\|isAuthenticated\|checkAuth\|verifyToken\|validateSession" smali*/ | head -20

# Payment / order flows
grep -rn "payment\|checkout\|order\|purchase\|cart\|price\|amount\|discount\|coupon\|promo" smali*/ | grep -i "const-string\|getExtra\|putExtra" | head -30

# Token storage
grep -rn "access_token\|refresh_token\|id_token\|bearer\|authorization" smali*/ | grep -v "^Binary" | head -20

# Biometric bypass
grep -rn "BiometricPrompt\|FingerprintManager\|setAllowDeviceCredential\|onAuthenticationSucceeded" smali*/ | head -20

# Root/emulator detection (bypass hints)
grep -rn "isRooted\|detectRoot\|RootBeer\|isEmulator\|BuildConfig\|Build\.FINGERPRINT" smali*/ | head -20

# SSL pinning kill switches (bypass hints)
grep -rn "pinning.*false\|disablePin\|bypassPin\|trustAll\|debug.*pin" smali*/ 2>/dev/null | head -10

# NFC payment handling
grep -rn "IsoDep\|NfcAdapter\|HCE\|HostApduService\|APDU\|processCommandApdu" smali*/ | head -20

# Korean payment SDK (from manifest queries)
grep -rn "shinhan\|samsung.*pay\|toss\|kakao\|kbcard\|hyundaicard" smali*/ | head -20
```

---

## Phase 9: Report

**Output:** Write `.apk-audit/report.md` and `.apk-audit/findings.json`

**Only include confirmed findings with:**
1. Exact location (file path + line or grep output)
2. Reproduction steps (adb command, curl, Frida script hint, or manual step)
3. Real-world impact (what can an attacker do?)
4. CVSS score + CWE
5. Remediation

**Report template:**
```markdown
# APK Bug Bounty Report: [app.package.name]
APK version: [from apktool.yml]
Analysis date: [date]
Platform: YesWeHack / [program name]

## Executive Summary
- Findings: [N] total | Critical: X | High: X | Medium: X | Low: X
- Key risks: [top 3 one-liners]

---

## [VULN-001] Title — SEVERITY

**CWE:** CWE-XXX
**CVSS:** X.X (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N)
**Impact:** [Concrete impact — what can attacker do?]

### Evidence
File: `smali/com/vuitton/android/SomeClass.smali:42`
```smali
[exact code snippet]
```

### Reproduction Steps
```bash
# adb / curl / manual steps
```

### Business Impact
[Why does this matter for Louis Vuitton / their customers?]

### Remediation
[Specific fix]

---
[repeat per finding]

## Excluded (Low/No-Impact)
[Brief list of things checked but not reported and why]
```

---

## Android-Specific High-Value Bug Bounty Targets

### Tier 1 — Critical (always report if confirmed)
- Private key / cert with extractable password → mTLS impersonation
- Firebase DB open without auth → user data read/write
- Exported ContentProvider + path traversal → arbitrary file read
- `debuggable=true` in production build → JDWP full compromise
- `TrustManager` that accepts all certs → MITM of all traffic
- JWT/session token hardcoded in smali → account takeover

### Tier 2 — High
- Exported Activity handling deep links → open redirect / XSS in WebView
- `addJavascriptInterface` in WebView with JS enabled → RCE on Android < 4.2
- API keys with write/admin access (Firebase, Stripe live keys)
- Cleartext traffic to auth/payment endpoints
- Auth token stored in external storage / SharedPreferences without encryption

### Tier 3 — Medium (report only with clear exploit path)
- `allowBackup=true` + sensitive data in SharedPreferences
- `setAllowFileAccess(true)` in WebView loading http URLs
- Log statements leaking tokens in debug builds
- Implicit PendingIntents (FLAG_MUTABLE) → intent hijacking

### Do NOT report (no impact / out of scope typical)
- SSL cert expiry
- Missing certificate pinning (unless there's a MITM-able endpoint)
- Exported components that require user interaction with no auth bypass
- Generic "information exposure" without actual sensitive data
- Low-entropy secrets that don't grant access to anything

---

## Quick Command Reference

```bash
# Set working directory
APK_ROOT="/home/mswell/BB/YWH/louisvuitton.com/2026-03-04/com.vuitton.android.xapk.out/unknown/com.vuitton.android"
cd "$APK_ROOT"

# Full secret scan (fast)
grep -rn "const-string" smali*/ | grep -iE "(api[_-]?key|secret|token|password|AIza|AKIA|bearer)" | grep -v "^Binary" | head -60

# All exported components
grep -n 'exported="true"' AndroidManifest.xml

# Deep links
grep -A5 'android:scheme' AndroidManifest.xml

# Certificate files
find . -name "*.pfx" -o -name "*.p12" -o -name "*.jks" -o -name "*.pem" 2>/dev/null

# Network security
cat res/xml/network_security_config.xml 2>/dev/null

# Firebase config
find . -name "*.properties" | xargs grep -l "firebase" 2>/dev/null | xargs cat
```

## Output Directory

Create before starting:
```bash
mkdir -p "$APK_ROOT/.apk-audit"
```

All reports go to `.apk-audit/` inside the APK root.
