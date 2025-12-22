# API Security Checklist (OWASP API Top 10 2023)

## API1:2023 - Broken Object Level Authorization (BOLA/IDOR)

**Description:** APIs expose endpoints that handle object identifiers, creating a wide attack surface for Object Level Access Control issues.

**What to look for:**
```
- User ID in URL: /api/users/{user_id}/profile
- Resource ID without ownership check: /api/orders/{order_id}
- Predictable IDs: sequential integers
- Missing authorization in controllers
```

**Vulnerable patterns:**
```javascript
// VULNERABLE - No ownership check
app.get('/api/orders/:id', async (req, res) => {
  const order = await Order.findById(req.params.id);
  res.json(order);
});

// SECURE
app.get('/api/orders/:id', async (req, res) => {
  const order = await Order.findOne({ 
    _id: req.params.id, 
    userId: req.user.id  // Ownership check
  });
  if (!order) return res.status(404).json({ error: 'Not found' });
  res.json(order);
});
```

**Grep patterns:**
```bash
grep -rn "params\.\|params\[" --include="*.{js,ts,py,go}"
grep -rn "findById\|findOne\|find_by_id" --include="*.{js,ts,py,rb}"
```

**Test cases:**
1. Access another user's resource by changing ID
2. Use horizontal escalation (user A → user B's data)
3. Try sequential ID enumeration
4. Modify resource belonging to another user

---

## API2:2023 - Broken Authentication

**Description:** Authentication mechanisms are often implemented incorrectly, allowing attackers to compromise authentication tokens or exploit implementation flaws.

**What to look for:**
```
- Weak password policies
- Missing brute force protection
- Credentials in URL
- Token leakage in logs/responses
- JWT issues (algorithm confusion, no expiry)
- Session not invalidated on logout
```

**Vulnerable patterns:**
```javascript
// VULNERABLE - Algorithm confusion
jwt.verify(token, secret, { algorithms: ['HS256', 'RS256'] });

// VULNERABLE - No expiry check
const decoded = jwt.decode(token);  // decode != verify!

// VULNERABLE - Credentials in URL
GET /api/login?username=admin&password=secret

// VULNERABLE - Password in response
res.json({ user: { id: 1, email: 'x', password: hash } });
```

**Grep patterns:**
```bash
grep -rn "jwt\.decode\|algorithms.*\[" --include="*.{js,ts,py}"
grep -rn "password.*response\|res.*password" --include="*.{js,ts,py}"
grep -rn "rate.limit\|rateLimit\|throttle" --include="*.{js,ts,py,go}"
```

---

## API3:2023 - Broken Object Property Level Authorization

**Description:** APIs expose endpoints that return all object properties or allow updating sensitive properties without proper authorization.

**What to look for:**
```
- Mass assignment vulnerabilities
- Excessive data exposure in responses
- Hidden/sensitive fields returned
- Admin fields modifiable by users
```

**Vulnerable patterns:**
```javascript
// VULNERABLE - Mass assignment
app.put('/api/users/:id', (req, res) => {
  User.update(req.params.id, req.body);  // Can set isAdmin!
});

// VULNERABLE - Excessive data exposure
app.get('/api/users/:id', (req, res) => {
  const user = await User.findById(id);
  res.json(user);  // Returns password hash, SSN, etc.
});

// SECURE
const allowedFields = ['name', 'email'];
const updates = _.pick(req.body, allowedFields);
User.update(id, updates);
```

**Grep patterns:**
```bash
grep -rn "\.create\(req\.body\)\|\.update.*req\.body" --include="*.{js,ts}"
grep -rn "Object\.assign\|spread.*req" --include="*.{js,ts}"
grep -rn "\*\*request\." --include="*.py"  # Python mass assignment
```

---

## API4:2023 - Unrestricted Resource Consumption

**Description:** APIs don't limit the size or number of resources requested by the client, leading to DoS.

**What to look for:**
```
- No rate limiting
- No pagination limits
- Unlimited file upload size
- No timeout on expensive operations
- GraphQL query depth/complexity not limited
```

**Vulnerable patterns:**
```javascript
// VULNERABLE - No pagination limit
app.get('/api/items', (req, res) => {
  const items = await Item.find({});  // Returns ALL items
  res.json(items);
});

// VULNERABLE - No file size limit
app.use(express.json());  // Default limit very high
app.post('/upload', upload.single('file'));  // No limit

// VULNERABLE - GraphQL no depth limit
const schema = new GraphQLSchema({ query });  // No complexity analysis
```

**Grep patterns:**
```bash
grep -rn "\.find\(\)\|\.find\({}\)" --include="*.{js,ts}"  # No filters
grep -rn "limit\|pagination\|page" --include="*.{js,ts,py}"
grep -rn "rate.limit\|throttle" --include="*.{js,ts,py,go}"
```

---

## API5:2023 - Broken Function Level Authorization

**Description:** APIs rely on client to decide which endpoints to call. Administrative endpoints are accessible without proper authorization.

**What to look for:**
```
- Admin endpoints without role check
- Debug endpoints in production
- Internal APIs exposed externally
- Missing middleware on sensitive routes
```

**Vulnerable patterns:**
```javascript
// VULNERABLE - Admin route without auth
app.delete('/api/admin/users/:id', async (req, res) => {
  await User.deleteById(req.params.id);
});

// VULNERABLE - Debug endpoint exposed
app.get('/api/debug/config', (req, res) => {
  res.json(process.env);
});

// SECURE
app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  // ...
});
```

**Grep patterns:**
```bash
grep -rn "admin\|debug\|internal\|private" --include="*.{js,ts,py,go}"
grep -rn "router\.\|app\.(get|post|put|delete)" --include="*.{js,ts}"
```

---

## API6:2023 - Unrestricted Access to Sensitive Business Flows

**Description:** APIs expose business flows that can be abused through automation (ticket scalping, scraping, brute forcing).

**What to look for:**
```
- Purchase flows without rate limits
- Referral systems without fraud detection
- Comment/review submission without limits
- Password reset without rate limiting
```

**Vulnerable patterns:**
```javascript
// VULNERABLE - Purchase without limit
app.post('/api/purchase', (req, res) => {
  // No rate limit, no captcha, no device fingerprint
  processPurchase(req.body);
});

// VULNERABLE - Coupon no usage limit
app.post('/api/apply-coupon', (req, res) => {
  // Same coupon can be applied multiple times
  applyCoupon(req.body.code);
});
```

**Test cases:**
1. Automate purchase flow
2. Create unlimited accounts
3. Abuse referral system
4. Scrape data at scale

---

## API7:2023 - Server Side Request Forgery (SSRF)

**Description:** SSRF flaws occur when an API fetches a remote resource without validating the user-supplied URL.

**What to look for:**
```
- URL as user input
- Webhook URLs
- File imports from URL
- PDF/image generation from URL
- OAuth callbacks
```

**Vulnerable patterns:**
```javascript
// VULNERABLE
app.post('/api/fetch', async (req, res) => {
  const response = await fetch(req.body.url);
  res.json(await response.json());
});

// VULNERABLE - Image proxy
app.get('/api/proxy', async (req, res) => {
  const image = await axios.get(req.query.imageUrl);
  res.send(image.data);
});
```

**Test payloads:**
```
http://localhost/admin
http://127.0.0.1/
http://169.254.169.254/latest/meta-data/  # AWS metadata
http://[::1]/
http://0.0.0.0/
file:///etc/passwd
gopher://localhost:6379/_INFO
```

**Grep patterns:**
```bash
grep -rn "fetch\|axios\|request\|urllib\|http\.get" --include="*.{js,ts,py,go}"
grep -rn "url.*req\|req.*url" --include="*.{js,ts,py}"
```

---

## API8:2023 - Security Misconfiguration

**Description:** APIs and their supporting systems may have security misconfigurations at any level.

**What to look for:**
```
- Debug mode in production
- Default credentials
- Unnecessary HTTP methods enabled
- Missing security headers
- Verbose error messages
- Outdated dependencies
- CORS misconfiguration
```

**Vulnerable patterns:**
```javascript
// VULNERABLE - Debug mode
app.run(debug=True)  # Python Flask

// VULNERABLE - CORS any origin
app.use(cors({ origin: '*', credentials: true }));

// VULNERABLE - Missing headers
// No helmet.js or security headers

// VULNERABLE - Verbose errors
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.stack });  // Stack trace exposed
});
```

**Grep patterns:**
```bash
grep -rn "debug.*true\|DEBUG.*True" --include="*.{js,ts,py,yaml,yml}"
grep -rn "cors\|origin.*\*" --include="*.{js,ts}"
grep -rn "stack\|trace\|err\." --include="*.{js,ts,py}"
```

---

## API9:2023 - Improper Inventory Management

**Description:** APIs often expose more endpoints than intended, and outdated documentation makes discovering the full API surface difficult.

**What to look for:**
```
- Old API versions still active (/v1/, /v2/)
- Debug/test endpoints in production
- Undocumented endpoints
- Shadow APIs
- Beta features enabled
```

**Discovery techniques:**
```bash
# Common hidden endpoints
/api/v1/
/api/v2/
/api/internal/
/api/debug/
/api/test/
/api/admin/
/graphql
/graphiql
/.well-known/
/swagger.json
/openapi.json
```

---

## API10:2023 - Unsafe Consumption of APIs

**Description:** Developers tend to trust data from third-party APIs without proper validation.

**What to look for:**
```
- Third-party API responses used without validation
- Webhook payloads processed without verification
- Redirects followed blindly
- SSL/TLS not enforced for external calls
```

**Vulnerable patterns:**
```javascript
// VULNERABLE - Trusting third-party data
app.post('/webhook', (req, res) => {
  const data = req.body;
  User.update(data.userId, data.updates);  // No validation!
});

// VULNERABLE - Following redirects
const response = await axios.get(url, { maxRedirects: 10 });

// SECURE
const response = await axios.get(url, { 
  maxRedirects: 0,
  validateStatus: (status) => status === 200
});
```

---

## Quick Audit Checklist

### Authentication
- [ ] Rate limiting on login endpoints
- [ ] Account lockout after failed attempts
- [ ] Strong password policy enforced
- [ ] JWT properly validated with single algorithm
- [ ] Session invalidated on logout
- [ ] Credentials never in URL

### Authorization
- [ ] Every endpoint has authorization check
- [ ] Resource ownership verified (IDOR prevention)
- [ ] Role-based access control implemented
- [ ] Mass assignment prevented
- [ ] Sensitive fields filtered from responses

### Input Validation
- [ ] All inputs validated and sanitized
- [ ] File uploads restricted (type, size)
- [ ] URL parameters validated
- [ ] SQL/NoSQL injection prevented

### Rate Limiting
- [ ] Rate limits on all endpoints
- [ ] Pagination implemented with limits
- [ ] File upload size limited
- [ ] GraphQL complexity limited

### Security Headers
- [ ] Content-Type validation
- [ ] CORS properly configured
- [ ] Security headers present (CSP, X-Frame-Options, etc.)
- [ ] HTTPS enforced

### Error Handling
- [ ] Generic error messages to clients
- [ ] Stack traces not exposed
- [ ] Detailed errors logged server-side only
