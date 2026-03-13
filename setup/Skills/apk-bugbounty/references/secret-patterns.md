# Secret Detection Patterns

Comprehensive regex patterns for detecting hardcoded secrets in Android APKs.
Apply these with the Grep tool across both `out_jadx/sources/` and `out_apktool/` (`smali*/`, `assets/`, `res/`, `unknown/`).

## Cloud Providers

### AWS
- Access Key ID: `AKIA[0-9A-Z]{16}`
- Temporary Key: `ASIA[0-9A-Z]{16}`
- ARN Role: `AROA[0-9A-Z]{16}`
- Secret Access Key: `[0-9a-zA-Z/+]{40}` (search near AWS context strings)

### Google / Firebase
- API Key: `AIza[0-9A-Za-z_-]{35}`
- OAuth Client ID: `[0-9]+-[0-9a-z]{32}\.apps\.googleusercontent\.com`
- Firebase DB URL: `https://[a-z0-9-]+\.firebaseio\.com`
- GCP Service Account: `"type"\s*:\s*"service_account"`
- Cloud Storage: `[a-z0-9-]+\.storage\.googleapis\.com`

### Azure
- Storage Key: `DefaultEndpointsProtocol=https;AccountName=[^;]+;AccountKey=[A-Za-z0-9+/=]{88}`
- Connection String: `Server=tcp:[^;]+;.*Password=[^;]+`

## Payment Providers

### Stripe
- Live Secret Key: `sk_live_[0-9a-zA-Z]{24,}`
- Live Publishable: `pk_live_[0-9a-zA-Z]{24,}`
- Restricted Key: `rk_live_[0-9a-zA-Z]{24,}`
- Test Keys: `sk_test_[0-9a-zA-Z]{24,}`, `pk_test_[0-9a-zA-Z]{24,}` (lower severity)

### PayPal
- Client ID: `AY[a-zA-Z0-9_-]{70,80}` (near PayPal context)

### Braintree
- Tokenization Key: `sandbox_|production_` + `[a-z0-9]{8}_[a-z0-9]{24,}`

## Communication Services

### Twilio
- API Key: `SK[0-9a-fA-F]{32}`
- Account SID: `AC[0-9a-fA-F]{32}`
- Auth Token: 32 hex characters near Twilio import/context

### SendGrid
- API Key: `SG\.[a-zA-Z0-9_-]{22}\.[a-zA-Z0-9_-]{43}`

### Slack
- Bot Token: `xoxb-[0-9]{10,}-[0-9]{10,}-[a-zA-Z0-9]{24}`
- User Token: `xoxp-[0-9]{10,}-[0-9]{10,}-[0-9]{10,}-[a-f0-9]{32}`
- Webhook: `https://hooks\.slack\.com/services/T[a-zA-Z0-9_]+/B[a-zA-Z0-9_]+/[a-zA-Z0-9_]+`

### Firebase Cloud Messaging
- Server Key: `AAAA[a-zA-Z0-9_-]{140,}`

## Authentication & Tokens

### JWT
- Token: `eyJ[A-Za-z0-9_-]*\.eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*`
- Decode header+payload (base64) to check `exp` claim and algorithm

### OAuth
- Client secret: `client_secret\s*[=:]\s*["'][^"']+["']`
- Client ID: `client_id\s*[=:]\s*["'][^"']+["']`
- App secret: `app_secret\s*[=:]\s*["'][^"']+["']`

### Generic Credentials
- API key/secret: `(api[_-]?key|api[_-]?secret|access[_-]?key|auth[_-]?token)\s*[=:]\s*["'][A-Za-z0-9_/+=-]{16,}["']`
- Password: `(password|passwd|pwd)\s*[=:]\s*["'][^"']{4,}["']`
- Private key: `(private[_-]?key|secret[_-]?key)\s*[=:]\s*["'][^"']+["']`
- Bearer token: `Bearer\s+[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+`

## Cryptographic Material

- RSA Private: `-----BEGIN RSA PRIVATE KEY-----`
- EC Private: `-----BEGIN EC PRIVATE KEY-----`
- Generic Private: `-----BEGIN PRIVATE KEY-----`
- PGP Private: `-----BEGIN PGP PRIVATE KEY BLOCK-----`
- PKCS8 Encrypted: `-----BEGIN ENCRYPTED PRIVATE KEY-----`

## Database Connection Strings

- MongoDB: `mongodb(\+srv)?://[^:]+:[^@]+@`
- PostgreSQL: `postgres(ql)?://[^:]+:[^@]+@`
- MySQL: `mysql://[^:]+:[^@]+@`
- Redis: `redis://[^:]+:[^@]+@`
- MSSQL: `Server=.*;.*Password=.*`

## Android-Specific Patterns

### Smali-Specific
- `const-string` with key patterns: `const-string.*"(AKIA|sk_live|pk_live|AIza|SG\.|eyJ)`
- `const-string/jumbo` for longer strings

### Build Config
- Search `BuildConfig.java` for any non-standard fields (beyond DEBUG, APPLICATION_ID, VERSION)
- Fields like `API_KEY`, `BASE_URL`, `SECRET` are often exposed

### Resource Files
- `out_apktool/res/values/strings.xml` — search for key/secret/token/url entries
- `out_apktool/res/raw/` — config files, certificates
- `out_apktool/assets/` — JSON configs, `.properties` files

### Meta-data in Manifest
- `<meta-data android:name="..." android:value="..."/>` in AndroidManifest.xml
- Common: `com.google.android.maps.v2.API_KEY`, `com.facebook.sdk.ApplicationId`

## Validation Checklist

For every secret found:
1. Is it a live production value or placeholder/test?
2. What scope/permissions does it grant?
3. Can it be used externally without the app context?
4. What is the blast radius if exploited?
5. Is it rotatable, or does compromise require architectural change?
