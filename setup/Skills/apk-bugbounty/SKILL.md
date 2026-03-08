---
name: apk-bugbounty
description: Android APK static analysis for bug bounty hunting. Analyzes decompiled APKs (Jadx/Apktool output) focusing on HIGH-IMPACT, EXPLOITABLE findings. Covers secrets, exported components, WebViews (with Taint Analysis), deep links, Firebase, Native Libs, and business logic flaws. Every finding MUST have concrete evidence and real exploit impact.
---

# Android APK Bug Bounty Analysis Skill

Static analysis of decompiled Android APKs for bug bounty programs.
**Rule #1: NO HALLUCINATION. Every finding MUST be backed by concrete code evidence (file path + line + snippet) and a clear, reproducible exploit path.**
**Rule #2: No impact = not reported. Ignore theoretical issues without an attack vector.**
**Rule #3: STRICT BRAIN DUMP MANDATE. Before listing any vulnerability, you MUST output a detailed "Brain Dump" documenting your logical thinking process, what you searched for and failed to find, and technical explanations for discarding false positives.**

## Phase 0: Target Structure & Decompilation

**Goal:** Ensure the target is properly decompiled for optimal analysis.
*If the target is a raw `.apk` file, it MUST be decompiled before analysis:*
1. **Java Source (Preferred for Business Logic):** `jadx -d out_jadx target.apk` (creates `sources/` folder)
2. **Resources/Manifest (Fallback/Assets):** `apktool d target.apk` (creates `smali/`, `res/`, `assets/`)

```
<apk_root>/
├── AndroidManifest.xml     ← Entry point: exported components, permissions, deep links
├── assets/                 ← Secrets, certs, configs, proto files
├── res/                    ← xml/network_security_config.xml, strings.xml, xml/file_paths.xml
├── sources/                ← Jadx Java code (PRIMARY SEARCH TARGET)
├── smali*/                 ← Apktool bytecode (Fallback)
├── lib/                    ← Native C/C++ libraries (.so files)
└── unknown/                ← Bundled files, proto schemas, build artifacts
```

**Note:** All subsequent search commands target `sources/` and `smali*/` to ensure coverage regardless of the decompilation tool used. Prioritize reading `.java` files from `sources/` over `.smali`.

## Workflow Overview

Execute phases in order.
```
Phase 1: Manifest & Permissions   → exported components, deep links, dangerous permissions
Phase 2: Secrets & Certificates   → hardcoded keys, certs, tokens in assets/sources/smali/lib
Phase 3: Network Security         → cleartext, cert pinning, MITM surface
Phase 4: WebView & Taint Analysis → JS enabled, file access, deep link → loadUrl (source to sink)
Phase 5: Data Storage             → SharedPreferences, SQLite, files, external storage
Phase 6: IPC & Component Abuse    → Intent injection, provider traversal, broadcast abuse
Phase 7: Firebase & Cloud         → misconfig, exposed endpoints, hardcoded project IDs
Phase 8: Business Logic & Native  → Command Injection, ZipSlip, Auth flows, Native Libs
Phase 9: Report & PoC Generation  → Confirmed findings + Frida script hints
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

# Content providers with grants
grep -n 'android:grantUriPermissions\|android:readPermission\|android:writePermission' AndroidManifest.xml
```

**For each exported component, document:**
- Component name (full class name)
- Type (Activity/Service/Receiver/Provider)
- Intent filters / schemes / hosts
- Permission protection (none = exploitable)
- Attack scenario with PoC intent

---

## Phase 2: Secrets & Certificates

**Goal:** Find credentials, private keys, API tokens with actual access across Java, Smali, and Native Libs.

**Search commands:**
```bash
# High-entropy strings / API keys in Java/Smali
grep -rn "const-string\|const-string/jumbo\|String " sources/ smali*/ 2>/dev/null | grep -iE "(api[_-]?key|secret|token|password|passwd|apikey|auth|bearer|private[_-]?key|access[_-]?key)" | head -50

# Native Libraries (.so) string extraction
find lib/ -name "*.so" -exec strings {} \; 2>/dev/null | grep -iE "(api[_-]?key|http://|https://|secret|token)" | head -30

# AWS & Firebase
grep -rn "AKIA\|ASIA\|AROA\|AIza[0-9A-Za-z_-]{35}" sources/ smali*/ assets/ res/ unknown/ 2>/dev/null

# Firebase URLs
grep -rn "firebaseio\.com\|firebase\.google\.com" sources/ smali*/ assets/ res/ unknown/ 2>/dev/null | head -20

# Certificates and keystores
find assets/ res/ -name "*.pfx" -o -name "*.p12" -o -name "*.keystore" -o -name "*.jks" -o -name "*.pem" -o -name "*.crt" -o -name "*.key" 2>/dev/null

# JWT & OAuth
grep -rn "eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*" sources/ smali*/ assets/ res/ 2>/dev/null | head -20
grep -rn "client_secret\|client_id\|app_secret" sources/ smali*/ assets/ res/ unknown/ 2>/dev/null | head -20

# Stripe / Payment keys
grep -rn "sk_live\|pk_live\|sk_test\|pk_test\|rk_live" sources/ smali*/ assets/ res/ 2>/dev/null
```

**Certificate analysis (PFX/P12):**
```bash
# Check if password is empty, app name, or common default
for pw in "" "password" "123456" "android" "changeit" "<target_company_name>"; do
  openssl pkcs12 -in assets/Certificate.pfx -nokeys -passin "pass:$pw" 2>/dev/null && echo "PASSWORD: $pw" && break
done
```

---

## Phase 3: Network Security Analysis

**Goal:** Identify MITM opportunities and cert pinning bypass surfaces.

**Search commands:**
```bash
# Network security config
cat res/xml/network_security_config.xml 2>/dev/null || find res/ -name "network_security_config.xml" -exec cat {} \;

# Cleartext traffic allowed
grep -n "cleartextTrafficPermitted\|usesCleartextTraffic" res/xml/network_security_config.xml AndroidManifest.xml 2>/dev/null

# TrustAllCerts / disabled validation (CRITICAL)
grep -rn "TrustManager\|X509TrustManager\|checkClientTrusted\|checkServerTrusted" sources/ smali*/ | grep -v "^Binary" | head -20

# HTTP URLs (not HTTPS)
grep -rn "http://" sources/ smali*/ assets/ res/ lib/ | grep -v "schemas.android\|w3.org\|#\|localhost\|127.0.0.1\|comment" | head -30
```

---

## Phase 4: WebView & Taint Analysis

**Goal:** Find XSS, arbitrary URL load, file access, JS bridge abuse by explicitly tracing from Source to Sink.

**Search commands (Identify Sinks & Configs):**
```bash
# JavaScript enabled & JS bridges
grep -rn "setJavaScriptEnabled\|addJavascriptInterface" sources/ smali*/ | head -20

# File access
grep -rn "setAllowFileAccess\|setAllowFileAccessFromFileURLs\|setAllowUniversalAccessFromFileURLs" sources/ smali*/ | head -20

# URL Loading Sinks
grep -rn "loadUrl\|loadData\|loadDataWithBaseURL\|evaluateJavascript" sources/ smali*/ | head -20
```

**MANDATORY Taint Analysis Process:**
1. **Source:** Identify where untrusted data enters (e.g., `getIntent().getData()`, `getIntent().getStringExtra()`).
2. **Sink:** Identify the dangerous method (e.g., `webView.loadUrl(data)`).
3. **Trace Flow:** You MUST verify that the data flows from Source to Sink WITHOUT proper validation or sanitization.
4. **Validation:** If `shouldOverrideUrlLoading` blocks untrusted domains, it's NOT a vulnerability unless a bypass exists.

---

## Phase 5: Insecure Data Storage

**Goal:** Find PII/secrets written to accessible locations.

**Search commands:**
```bash
grep -rn "getSharedPreferences\|getExternalStorage\|getExternalFilesDir\|openOrCreateDatabase" sources/ smali*/ | head -20
grep -rn "Log\.d\|Log\.v\|Log\.i\|Log\.w\|Log\.e" sources/ smali*/ | grep -iE "token|password|secret|key|user|email|credit|card|cvv|pin" | head -20
```

---

## Phase 6: IPC & Component Abuse

**Goal:** Intent injection, ContentProvider path traversal, broadcast interception.

**Search commands:**
```bash
# ContentProvider file access (path traversal vector)
grep -rn "openFile\|openAssetFile\|query\|ParcelFileDescriptor" sources/ smali*/ | head -20

# Intent handling (extras used unsafely)
grep -rn "getIntent\|getStringExtra\|getIntExtra\|getBundleExtra\|getParcelableExtra" sources/ smali*/ | head -30

# Pending intents (hijacking)
grep -rn "PendingIntent\|FLAG_MUTABLE\|FLAG_IMMUTABLE" sources/ smali*/ | head -20
```

---

## Phase 7: Firebase & Cloud Misconfigurations

**Search commands:**
```bash
find . -name "google-services.json" 2>/dev/null | xargs cat 2>/dev/null
grep -rn "firebaseio\.com\|appspot\.com\|storage\.googleapis\.com" sources/ smali*/ assets/ res/ unknown/ 2>/dev/null
```
*Note: Always test Firebase DB URLs for unauthenticated access (`curl https://<project>.firebaseio.com/.json`).*

---

## Phase 8: Business Logic & Native

**Goal:** Find logic flaws, payment bypass, OS command injection, and unsafe file extraction.

**Search commands:**
```bash
# OS Command Injection
grep -rn "Runtime\.getRuntime()\.exec\|ProcessBuilder" sources/ smali*/ 

# ZipSlip (Unsafe unzipping / Path Traversal)
grep -rn "ZipEntry\|java\.util\.zip" sources/ smali*/ | grep -i "getName"

# Authentication & Payment logic
grep -rn "isLoggedIn\|checkAuth\|verifyToken\|payment\|checkout\|order\|purchase\|price" sources/ smali*/ | head -30

# Root/emulator detection & Pinning bypass hints (Client-side controls)
grep -rn "isRooted\|detectRoot\|RootBeer\|isEmulator\|disablePin\|bypassPin" sources/ smali*/ | head -20
```

---

## Phase 9: Report & PoC Generation

**Output:** Write `.apk-audit/report.md`

**Only include confirmed findings with:**
1. Exact location (file path + line + Java/Smali snippet)
2. Reproduction steps
3. **Taint Analysis Proof:** Clear explanation of how data flows from user input to the vulnerable function.
4. Real-world impact & CVSS score.

**Frida PoC Requirement:**
If the vulnerability relies on bypassing a client-side control (e.g., Root detection, SSL Pinning, Biometric bypass, or specific method manipulation), you MUST provide a functional Frida script hint in the report to demonstrate exploitability.

Example Frida Hint for bypass:
```javascript
Java.perform(function() {
    var TargetClass = Java.use("com.target.app.SecurityCheck");
    TargetClass.isRooted.implementation = function() {
        console.log("[*] Bypassing root check!");
        return false; // Force false
    };
});
```

**Report template:**
```markdown
# 🧠 Brain Dump

## Reconnaissance
- **Target:**
- **Version:**
- **Platform:** Android
- **Tools Used:** Jadx-GUI, Apktool, adb, Frida, Burp Suite

## Initial Analysis
- Decompile APK with Jadx and Apktool.
- Review AndroidManifest.xml for exported components, permissions, and interesting configurations.
- Check for hardcoded strings (APIs, URLs, credentials) in decompiled source.

## Dynamic Analysis Setup
- Set up Frida for runtime instrumentation.
- Configure Burp Suite for proxying traffic.
- Install APK on a rooted emulator/device.

## Static Analysis Areas
- **Secrets:** API keys, tokens, credentials, sensitive URLs.
- **Exported Components:** Activities, Services, Broadcast Receivers, Content Providers.
- **WebViews:** JavaScript interfaces, URL loading, potential RCE via `addJavascriptInterface`.
- **Deep Links:** Schemes, hosts, paths, parameter handling.
- **Firebase:** API keys, database URLs, storage buckets.
- **Native Libraries:** JNI functions, potential vulnerabilities in native code.
- **Business Logic:** How the app handles critical functions (auth, payments, data).

## Dynamic Analysis Areas
- **Network Traffic:** Intercept and analyze all HTTP/HTTPS requests and responses. Look for sensitive data, insecure endpoints, API flaws.
- **Runtime Behavior:** Use Frida to hook into interesting functions, bypass SSL pinning, observe data flows, manipulate app logic.
- **Input Validation:** Test all input fields for injection flaws (SQLi, XSS, RCE).
- **Authorization:** Test for IDORs, privilege escalation.

## Potential Vulnerability Categories
- Hardcoded Secrets
- Insecure Data Storage
- Broken Authentication/Authorization
- Insecure Communication (SSL Pinning bypass)
- WebView Vulnerabilities (RCE, XSS)
- Deep Link Exploitation
- Exposed API Keys/Endpoints
- Business Logic Flaws
- Native Code Vulnerabilities
- Tapjacking/Overlay Attacks
- Side-channel Data Leakage

---

# APK Bug Bounty Report: [<app_package_name>]

## Executive Summary
- Findings: [N] total | Critical: X | High: X | Medium: X | Low: X

---

## [VULN-001] Title — SEVERITY

**CWE:** CWE-XXX
**CVSS:** X.X (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N)
**Impact:** [Concrete impact]

### Evidence & Taint Analysis
File: `sources/com/example/app/TargetClass.java:42`
[Explain data flow from source to sink]
```java
[exact code snippet]
```

### Reproduction Steps / Frida PoC
```bash
# adb / curl / Frida script
```

### Remediation
[Specific fix]
```

## Output Directory
```bash
mkdir -p "$APK_ROOT/.apk-audit"
```
All reports go to `.apk-audit/` inside the APK root.
```
