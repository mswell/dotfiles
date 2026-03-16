---
name: apk-bugbounty
description: Android APK static analysis for bug bounty hunting. Decompiles APKs with BOTH Jadx AND Apktool for maximum coverage. Analyzes secrets, exported components, WebViews (Taint Analysis), deep links, Firebase, Native Libs, IPC abuse, and business logic flaws. Every finding MUST have concrete evidence and real exploit impact.
---

# Android APK Bug Bounty Analysis Skill

Static analysis of decompiled Android APKs for bug bounty programs.

**Rule #1: NO HALLUCINATION.** Every finding MUST be backed by concrete code evidence (file path + line + snippet) and a clear, reproducible exploit path.
**Rule #2: No impact = not reported.** Ignore theoretical issues without an attack vector.
**Rule #3: BRAIN DUMP MANDATE.** Before listing vulnerabilities, output a Brain Dump documenting your reasoning, what you searched and failed to find, and why you discarded false positives.
**Rule #4: DUAL DECOMPILATION.** ALWAYS run BOTH Jadx AND Apktool on every APK. Never skip one. Each tool reveals data the other misses.

## Tool Usage

Subagents MUST use Claude Code's dedicated tools for code analysis:
- **Grep tool** for all text/pattern searches (NOT `grep` or `rg` via Bash)
- **Glob tool** for file discovery (NOT `find` or `ls` via Bash)
- **Read tool** for file reading (NOT `cat`/`head`/`tail` via Bash)
- **Bash tool** ONLY for: `jadx`, `apktool`, `strings`, `openssl`, `curl`, `adb`, `mkdir`, `unzip`, `bundletool`

---

## Phase 0: Setup & Decompilation

**Goal:** Validate tools, decompile with BOTH engines, create output directory, assess target.

### Step 1: Validate Tools
```bash
which jadx && jadx --version || echo "FATAL: jadx not found in PATH"
which apktool && apktool --version || echo "FATAL: apktool not found in PATH"
```
If either tool is missing, STOP and inform the user immediately.

### Step 2: Handle Input Format

| Input | Action |
|---|---|
| `.apk` | Proceed to Step 3 directly |
| `.xapk` | `unzip target.xapk -d xapk_contents/` → locate `base.apk` and split APKs → decompile `base.apk` |
| `.aab` | `bundletool build-apks --bundle=target.aab --output=target.apks` → `unzip target.apks` → decompile |
| Split APKs | Identify `base.apk` → decompile it; note split configs for reference |
| Already decompiled | Verify both Java sources AND `smali*/` exist. If only one, run the missing tool |

### Step 3: Dual Decompilation (MANDATORY — NO EXCEPTIONS)
```bash
mkdir -p .apk-audit

# ALWAYS run both tools
jadx -d out_jadx "$APK_FILE" --no-res --threads-count 4 2>&1 | tail -5
apktool d "$APK_FILE" -o out_apktool -f 2>&1 | tail -5
```

**Why both:**
- **Jadx** → readable Java source in `out_jadx/sources/` — best for business logic, control flow, taint analysis
- **Apktool** → faithful smali bytecode + properly decoded XML + raw assets in `out_apktool/` — catches obfuscated strings, resource values, and structures Jadx misses or decompiles incorrectly

### Step 4: Map Target Structure
```
<workspace>/
├── out_jadx/
│   ├── sources/             ← Java source (PRIMARY for logic analysis)
│   └── resources/           ← Jadx-extracted resources
├── out_apktool/
│   ├── AndroidManifest.xml  ← Properly decoded manifest (USE THIS ONE)
│   ├── smali*/              ← Bytecode (catches what Jadx misses)
│   ├── res/                 ← Decoded XML (strings.xml, network_security_config, file_paths)
│   ├── assets/              ← Raw assets, configs, certs, proto files
│   ├── lib/                 ← Native libraries (.so)
│   └── unknown/             ← Proto schemas, build artifacts
└── .apk-audit/
    └── report.md            ← Final report
```

### Step 5: Initial Assessment
Quickly determine using Grep/Read:
1. **Package name, version, minSdk, targetSdk** from `out_apktool/AndroidManifest.xml`
2. **Obfuscation level** — are class names readable or `a.b.c` style?
3. **Component count** — how many activities, services, receivers, providers?

**Search paths for ALL subsequent phases:** `out_jadx/sources/`, `out_apktool/smali*/`, `out_apktool/assets/`, `out_apktool/res/`, `out_apktool/unknown/`, `out_apktool/lib/`

---

## Subagent Orchestration

Delegate to 3 parallel specialized subagents (balanced workload), then compile report.

```
Wave 1 (PARALLEL — launch all three in a single message):
  ├── mobile-security agent     → Phases 1 + 4 (Manifest/Attack Surface + WebView/Taint)
  ├── security-automation agent → Phases 2 + 3 + 5 (Secrets + Network + Data Storage)
  └── pentest agent             → Phases 6 + 7 + 8 (IPC + Firebase + Business Logic/Native)

Wave 2 (SEQUENTIAL — after Wave 1 completes):
  └── report-writer agent → Phase 9: Compile all findings into .apk-audit/report.md
```

**Steps:**
1. **Phase 0:** Run decompilation yourself (NOT delegated).
2. **Wave 1:** Launch three `Agent` calls in parallel. Provide each with:
   - Full phase instructions for their assigned phases
   - APK root path and both decompiled directory paths (`out_jadx/`, `out_apktool/`)
   - Phase 2 agent: reference `references/secret-patterns.md`
   - Pentest agent: reference `references/frida-templates.md`
3. **Wave 2:** After all Wave 1 agents finish, launch `report-writer` with all findings and `references/android-cwe-checklist.md`.
4. Output the final report path.

---

## Workflow Overview

```
Phase 1: Manifest & Attack Surface  → exports, deep links, permissions, Task Hijacking, tapjacking
Phase 2: Secrets & Certificates     → keys, tokens, certs across ALL dirs (Jadx + Apktool)
Phase 3: Network Security           → cleartext, cert pinning, MITM, WebSocket, TrustManager
Phase 4: WebView & Taint Analysis   → JS bridges, file access, mandatory source-to-sink tracing
Phase 5: Data Storage               → SharedPrefs, SQLite, logs, external storage, clipboard
Phase 6: IPC & Component Abuse      → Intent injection, Provider traversal, FileProvider, PendingIntent
Phase 7: Firebase & Cloud           → misconfig, exposed endpoints, unauthenticated access
Phase 8: Business Logic & Native    → CmdInjection, ZipSlip, auth bypass, proto/gRPC, native libs
Phase 9: Report & PoC Generation    → Confirmed findings with evidence + Frida scripts
```

---

## Phase 1: Manifest & Attack Surface

**Goal:** Map the full attack surface from the manifest and component configuration.

**Use `out_apktool/AndroidManifest.xml` as the source of truth** (properly decoded by Apktool).

**Core checks:**
1. **Exported components:** `android:exported="true"` — cross-reference with intent filters
2. **Deep links:** `android:scheme=`, `android:host=`, `android:pathPrefix=`, `android:pathPattern=`
3. **Dangerous permissions:** `uses-permission` — flag: CAMERA, LOCATION, CONTACTS, SMS, STORAGE, PHONE, READ_LOGS
4. **Backup enabled:** `android:allowBackup`, `android:fullBackupContent`, `android:dataExtractionRules`
5. **Debug flag:** `android:debuggable="true"`
6. **Provider grants:** `android:grantUriPermissions`, `android:readPermission`, `android:writePermission`

**Commonly missed checks:**
7. **Task Hijacking:** `launchMode="singleTask"` + `taskAffinity` set to empty string or another package → phishing via activity overlay
8. **Custom permission protectionLevel:** `<permission` with `protectionLevel="normal"` or `"dangerous"` without `"signature"` → any app can request it
9. **Tapjacking:** Search source for `filterTouchesWhenObscured`. Exported activities with sensitive UI lacking this are vulnerable to overlay attacks
10. **Broadcast receivers with priority:** `android:priority` in `<intent-filter>` — high priority on ordered broadcasts enables interception and abort
11. **SDK versions:** `minSdkVersion < 28` → cleartext allowed by default. Low `targetSdkVersion` weakens many security defaults

**For each exported component, document:**
- Full class name and type (Activity/Service/Receiver/Provider)
- Intent filters / schemes / hosts
- Permission protection (none = exploitable)
- Concrete attack scenario with PoC `adb` command

---

## Phase 2: Secrets & Certificates

**Goal:** Find credentials, keys, and tokens with actual access potential.

**Reference:** Read `references/secret-patterns.md` for comprehensive regex patterns by provider.

**Search strategy (prioritized):**
1. **Known config files first:** `BuildConfig.java`, `strings.xml`, `google-services.json`, any `.properties` files
2. **High-value patterns:** Apply regex from `references/secret-patterns.md` across BOTH `out_jadx/sources/` AND `out_apktool/smali*/`
3. **Assets directory:** Check all `.json`, `.xml`, `.properties`, `.cfg`, `.conf`, `.yaml` files in `out_apktool/assets/`
4. **Native libraries:** Use Bash `strings` on each `.so` file in `out_apktool/lib/`, search for URLs, keys, tokens
5. **Unknown directory:** Check `out_apktool/unknown/` for config files and build artifacts

**Certificate analysis:**
```bash
# Find cert files (use Glob: *.pfx, *.p12, *.keystore, *.jks, *.pem, *.crt, *.key)
# Test common passwords
for pw in "" "password" "123456" "android" "changeit"; do
  openssl pkcs12 -in <cert_path> -nokeys -passin "pass:$pw" 2>/dev/null && echo "CRACKED: $pw" && break
done
```

**Validation for every secret found:**
- Is it a live production key or test/example value?
- What access does it grant externally?
- Can it be exploited without device access?

---

## Phase 3: Network Security

**Goal:** Identify MITM opportunities, cleartext exposure, and transport security flaws.

**Checks:**
1. **Network security config:** Read `out_apktool/res/xml/network_security_config.xml`
   - If **absent** + `targetSdkVersion >= 28`: cleartext blocked by default (good)
   - If **absent** + `targetSdkVersion < 28`: cleartext allowed by default (report it)
   - If **present:** check `cleartextTrafficPermitted`, `<trust-anchors>`, user-installed CA trust, custom pins

2. **TrustAllCerts (CRITICAL):** Search for `X509TrustManager`, `checkServerTrusted`, `TrustManager` — empty method body = disabled validation

3. **HostnameVerifier bypass:** Search for `HostnameVerifier`, `ALLOW_ALL_HOSTNAME_VERIFIER`, `verify` methods returning `true` unconditionally

4. **HTTP URLs:** Search for `http://` across sources and assets — exclude `schemas.android.com`, `www.w3.org`, `localhost`, `127.0.0.1`, `10.0.`

5. **WebSocket without TLS:** Search for `ws://` (not `wss://`) — unencrypted WebSocket traffic

6. **Certificate pinning implementation:** Search for `CertificatePinner`, `sha256/`, pin entries in network_security_config — note class names for Frida bypass PoC (see `references/frida-templates.md`)

---

## Phase 4: WebView & Taint Analysis

**Goal:** Find XSS, arbitrary URL load, file access, and JS bridge abuse via source-to-sink tracing.

**Step 1 — Identify Sinks & Configs (search both Jadx and Apktool output):**
- `setJavaScriptEnabled(true)` — JS execution enabled
- `addJavascriptInterface` — JS-to-Java bridge (RCE on API < 17)
- `setAllowFileAccess`, `setAllowFileAccessFromFileURLs`, `setAllowUniversalAccessFromFileURLs`
- `loadUrl`, `loadData`, `loadDataWithBaseURL`, `evaluateJavascript` — URL loading sinks
- `postMessage`, `onMessage`, `WebMessageListener` — JS-to-native bridge via postMessage
- `shouldOverrideUrlLoading` returning `false` for unvalidated URLs — allows navigation to attacker-controlled pages

**Step 2 — Identify Sources:**
- `getIntent().getData()`, `getIntent().getStringExtra()`
- Deep link parameters from Phase 1
- `getQueryParameter`, `getPathSegments`
- Data from `SharedPreferences`, `ContentProvider` queries

**Step 3 — MANDATORY Taint Analysis (for each sink found):**
1. **Trace backward:** Where does the URL/data argument originate?
2. **Check validation:** Does `shouldOverrideUrlLoading` filter domains? Is there a whitelist?
3. **Check sanitization:** Is input validated/escaped before reaching the sink?
4. **Determine exploitability:** Can an attacker control the input from an external app or deep link?

**Only report if:** Untrusted data flows from Source → Sink WITHOUT adequate validation. Document the complete chain.

---

## Phase 5: Insecure Data Storage

**Goal:** Find PII/secrets written to accessible or logged locations.

**Checks:**
1. **SharedPreferences with sensitive data:**
   - Find `getSharedPreferences` → identify preference file names
   - Trace `.putString`, `.putInt` in same class — flag tokens, passwords, PII stored without encryption (EncryptedSharedPreferences)

2. **SQLite databases:**
   - Search for `openOrCreateDatabase`, `SQLiteDatabase`, `SQLiteOpenHelper`
   - Check if sensitive data is stored; check for SQLCipher encryption

3. **External storage (world-readable):**
   - `getExternalStorageDirectory`, `getExternalFilesDir`, `Environment.EXTERNAL_STORAGE`
   - Any sensitive data here is readable by any app with STORAGE permission

4. **Logging sensitive data:**
   - Search for `Log.d`, `Log.v`, `Log.i`, `Log.w`, `Log.e` across sources
   - Cross-reference with sensitive terms: token, password, secret, key, email, credit, card, session, auth

5. **Clipboard exposure:**
   - Search for `ClipboardManager`, `setPrimaryClip` — clipboard data is accessible to all apps

---

## Phase 6: IPC & Component Abuse

**Goal:** Intent injection, ContentProvider path traversal, FileProvider abuse, broadcast interception.

**Checks:**
1. **ContentProvider path traversal:**
   - Search for `openFile`, `openAssetFile`, `ParcelFileDescriptor` in sources
   - Verify if `Uri` path is validated against `../` traversal
   - Check `query` method for SQL injection potential

2. **FileProvider paths (commonly missed, high impact):**
   - Read `out_apktool/res/xml/file_paths.xml` and any `*_paths.xml` variants
   - `<root-path name="root" path="/" />` → exposes entire filesystem
   - `<external-path>` with broad patterns → exposes external storage
   - Overly permissive paths combined with exported provider = file read/write

3. **Unsafe Intent handling:**
   - Search for `getStringExtra`, `getIntExtra`, `getBundleExtra`, `getParcelableExtra`
   - Trace how extras are used — flag if they reach `loadUrl`, SQL queries, file operations, `startActivity`
   - Check for intent redirection: `startActivity(getIntent().getParcelableExtra("intent"))`

4. **PendingIntent hijacking:**
   - Search for `PendingIntent.getActivity`, `PendingIntent.getBroadcast`, `PendingIntent.getService`
   - `FLAG_MUTABLE` on implicit PendingIntents → hijackable
   - Empty base intents (`new Intent()`) in PendingIntent → attacker controls destination

5. **Implicit intents leaking data:**
   - `new Intent("action")` without explicit component → data visible to all apps

6. **OAuth / SSO redirect abuse (mobile-specific):**
   - Search for OAuth redirect handling: `redirect_uri`, `callback`, `sso`, `oauth`, `authorize`
   - Path traversal in SSO redirects: `extra_data.startsWith("/accounts_center/")` bypassed via double URL encoding (`%252F..%252F`)
   - Login CSRF in mobile OAuth: endpoints accepting session tokens via URL/deep link parameters without CSRF protection
   - Account-linking flows without user confirmation dialog: attacker generates valid nonce, crafts redirect URL → victim's external account linked to attacker's account
   - `response_type=token` with app-specific redirect schemes — token in URL fragment readable by any app intercepting the custom scheme
   - Check: Is OAuth `state` parameter generated and validated? Missing = CSRF in OAuth flow

---

## Phase 7: Firebase & Cloud Misconfigurations

**Checks:**
1. **google-services.json:** Use Glob to find, then Read — extract project_id, api_key, storage_bucket, database_url

2. **Firebase/Cloud URLs:** Search for `firebaseio.com`, `appspot.com`, `storage.googleapis.com`, `cloudfunctions.net`

3. **Unauthenticated access tests:**
```bash
# Firebase Realtime Database
curl -s "https://<project_id>.firebaseio.com/.json" | head -c 500

# Cloud Storage bucket listing
curl -s "https://storage.googleapis.com/<bucket_name>/" | head -c 500

# Firestore documents
curl -s "https://firestore.googleapis.com/v1/projects/<project_id>/databases/(default)/documents" | head -c 500
```

4. **API key restriction test:**
```bash
# Test if key works for Maps API (common unrestricted key)
curl -s "https://maps.googleapis.com/maps/api/staticmap?center=0,0&zoom=1&size=100x100&key=<API_KEY>" -o /dev/null -w "%{http_code}"
```

---

## Phase 8: Business Logic & Native

**Goal:** Logic flaws, command injection, unsafe file handling, proto/gRPC leaks, native lib analysis.

**Checks:**
1. **OS Command Injection:**
   - `Runtime.getRuntime().exec(`, `ProcessBuilder` — trace if user input reaches command arguments

2. **ZipSlip (Path Traversal via Zip):**
   - `ZipEntry` + `getName()` — check if entry name is validated against `../` before extraction

3. **Authentication & payment logic:**
   - Search for `isLoggedIn`, `checkAuth`, `verifyToken`, `payment`, `checkout`, `purchase`, `price`
   - Flag client-side-only validation (bypassable with Frida — note for PoC)

4. **Root/emulator detection:**
   - Search for `isRooted`, `detectRoot`, `RootBeer`, `isEmulator`, `SafetyNet`, `Play Integrity`
   - Record class and method names for Frida bypass (see `references/frida-templates.md`)

5. **Proto/gRPC schema files:**
   - Use Glob: `**/*.proto` across `out_apktool/assets/`, `out_apktool/unknown/`, root
   - These leak internal API structure, endpoints, message formats, and field names

6. **Native library analysis:**
   - List `.so` files with architectures in `out_apktool/lib/`
   - `strings` on each `.so` → search for URLs, keys, hardcoded credentials
   - Search for JNI registrations: `RegisterNatives`, `JNI_OnLoad`
   - Note if known vulnerable libs are bundled (old OpenSSL, libcurl, etc.)

7. **Obfuscation assessment:**
   - Check for ProGuard/R8 mapping file presence
   - Class naming pattern: readable = no obfuscation; `a.a.a` = obfuscated
   - Document level in report (affects analysis confidence)

8. **PostMessage / WebView bridge security:**
   - `postMessage` with `targetOrigin: '*'` in WebView bridges — tokens/codes sent to any origin
   - `WebMessageListener` / `addWebMessageListener` without origin validation
   - `window.name` persistence across WebView navigations — cross-origin data leakage
   - `WebView.evaluateJavascript` called with data from untrusted Intent extras
   - COOP bypass via `window.name` reuse in Android WebView (differs from Chrome browser behavior)

---

## Phase 9: Report & PoC Generation

**Output:** Write `.apk-audit/report.md`

**References for report-writer agent:**
- `references/android-cwe-checklist.md` — CWE mapping, CVSS scoring guide, attack chain escalations
- `references/android-impact-matrix.md` — Attacker position, P0/P1/P2 priority triage, SDK vs App scope guidance, report quality checklist
- `references/frida-templates.md` — Frida PoC scripts for client-side control bypasses

**Only include confirmed findings with:**
1. Exact location (file path + line + snippet — from BOTH Jadx and Apktool where relevant)
2. Reproduction steps (adb commands, curl commands, or Frida scripts)
3. **Taint Analysis Proof** for all data-flow vulnerabilities
4. Real-world impact & CVSS 3.1 score
5. Specific remediation with code example

**Frida PoC Requirement:** For vulnerabilities involving client-side controls, MUST include a Frida script. See `references/frida-templates.md`.

**CWE Reference:** Use `references/android-cwe-checklist.md` for accurate CWE mapping and CVSS scoring.

### Report Template

```markdown
# Brain Dump

## Target Overview
- **Package:** [from manifest]
- **Version:** [versionName + versionCode]
- **Min SDK:** X | **Target SDK:** Y
- **Obfuscation:** [none / ProGuard / R8 — observed pattern]
- **Decompilation:** Jadx [success/partial/failed] | Apktool [success/partial/failed]

## Attack Surface Summary
- **Exported components:** N total (X without permission protection)
- **Deep link schemes:** [list with hosts]
- **Dangerous permissions:** [list]
- **Native libraries:** [count and names]
- **Firebase/Cloud:** [project ID if found]

## Analysis Log
- [Key decisions made during analysis and reasoning]
- [Interesting patterns observed, potential attack chains identified]

## Dead Ends & False Positive Elimination
- [Searches that returned no actionable results and why]
- [Findings investigated and discarded — with specific reason]
- [Expected patterns not present in this app]

---

# APK Bug Bounty Report: [package_name]

## Executive Summary
- **Findings:** N total | Critical: X | High: X | Medium: X | Low: X
- **Scope:** Dual decompilation (Jadx + Apktool), [X] source files analyzed

---

## [VULN-001] Title — SEVERITY

**CWE:** CWE-XXX — [Title]
**CVSS 3.1:** X.X (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N)
**Impact:** [What an attacker concretely achieves]

### Evidence & Taint Analysis
**Jadx:** `out_jadx/sources/com/example/TargetClass.java:42`
```java
[exact code snippet]
```
**Apktool (corroboration):** `out_apktool/smali/com/example/TargetClass.smali:128`
```smali
[relevant smali if it adds context]
```
**Data flow:** [Source] → [intermediate] → [Sink]

### Reproduction Steps
```bash
# Exact adb / curl / Frida commands
```

### Remediation
[Specific fix with code example]
```
