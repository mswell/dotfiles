# Business Logic Vulnerability Checklist

## Overview

Business logic vulnerabilities are flaws in the design and implementation of an application that allow attackers to manipulate legitimate functionality to achieve a malicious goal. They're often missed by automated scanners and require manual review.

## Authentication & Session Management

### Account Registration
| Check | Vulnerability | Impact |
|-------|--------------|--------|
| Can same email register twice? | Duplicate accounts | Account takeover |
| Is email verification required? | Unverified accounts | Spam, abuse |
| Can registration be automated? | Bot accounts | Platform abuse |
| Are there rate limits? | Mass registration | Resource exhaustion |
| Can special chars in email bypass checks? | Email validation bypass | Account linking |

**Test cases:**
```
victim@example.com
victim@example.com.attacker.com
victim+anything@example.com
victim@examp1e.com (homograph)
VICTIM@example.com (case sensitivity)
```

### Password Reset
| Check | Vulnerability | Impact |
|-------|--------------|--------|
| Is token predictable? | Token prediction | Account takeover |
| Is token reusable? | Token reuse | Persistent access |
| Does token expire? | No expiry | Extended attack window |
| Can I reset to another email? | Email parameter manipulation | Account takeover |
| Is there rate limiting? | Brute force | Token enumeration |
| Does reset invalidate sessions? | Session persistence | Continued access |

**Test cases:**
```
- Request reset for victim, intercept link
- Change email param: email=victim@x.com&email=attacker@x.com
- Use expired tokens
- Brute force short tokens
- Reset, don't use, reset again (token collision)
```

### Session Management
| Check | Vulnerability | Impact |
|-------|--------------|--------|
| Session regenerated after login? | Session fixation | Account takeover |
| Session invalidated after logout? | Session persistence | Unauthorized access |
| Session invalidated after password change? | Stale sessions | Continued access |
| Concurrent sessions allowed? | No session limit | Shared access |
| Session timeout implemented? | Infinite sessions | Extended attack window |

---

## Authorization & Access Control

### Role-Based Access
| Check | Vulnerability | Impact |
|-------|--------------|--------|
| Can user modify their role? | Privilege escalation | Admin access |
| Is role stored client-side? | Client-side trust | Role manipulation |
| Can user access admin functions? | Broken access control | Unauthorized actions |
| Are hidden features protected? | Security by obscurity | Feature abuse |

**Test cases:**
```
- Change role in JWT/cookie
- Access /admin/* without admin role
- Modify isAdmin field in profile update
- IDOR on role management endpoints
```

### Object-Level Authorization
| Check | Vulnerability | Impact |
|-------|--------------|--------|
| Can I access others' resources? | IDOR | Data exposure |
| Can I modify others' resources? | IDOR | Data manipulation |
| Can I delete others' resources? | IDOR | Data loss |
| Are IDs predictable? | Enumeration | Mass data access |

**Test cases:**
```
- Change user_id in URL: /users/123 → /users/124
- Change resource_id in body
- Enumerate sequential IDs
- Use UUIDs from other contexts
```

---

## E-Commerce & Payments

### Pricing & Discounts
| Check | Vulnerability | Impact |
|-------|--------------|--------|
| Can price be modified in request? | Price manipulation | Financial loss |
| Can quantity be negative? | Negative quantity | Credit/refund abuse |
| Can discount be applied multiple times? | Coupon reuse | Revenue loss |
| Can I combine incompatible discounts? | Discount stacking | Revenue loss |
| Is total recalculated server-side? | Client-side total | Underpayment |

**Test cases:**
```
# Price manipulation
{"product_id": 1, "price": 0.01, "quantity": 1}

# Negative quantity
{"product_id": 1, "quantity": -5}  # Creates credit

# Discount stacking
{"coupons": ["50OFF", "FREESHIP", "BOGO"]}

# Currency confusion
{"price": 100, "currency": "JPY"}  # vs intended USD
```

### Cart & Checkout
| Check | Vulnerability | Impact |
|-------|--------------|--------|
| Can I add items after checkout started? | Race condition | Free items |
| Can I modify cart during payment? | TOCTOU | Price bypass |
| Is inventory decremented atomically? | Race condition | Overselling |
| Can I checkout with empty cart? | Logic bypass | Payment bypass |

**Test cases:**
```
1. Add expensive item to cart
2. Start checkout (hold inventory)
3. In parallel: modify price/remove item
4. Complete checkout
```

### Gift Cards & Credits
| Check | Vulnerability | Impact |
|-------|--------------|--------|
| Is card number predictable? | Enumeration | Theft |
| Can balance be manipulated? | Balance tampering | Fraud |
| Can card be used multiple times simultaneously? | Race condition | Double spend |
| Can card be transferred to cash? | Money laundering | Financial abuse |

---

## Race Conditions

### Common Race Condition Scenarios

```python
# VULNERABLE: Check-then-act pattern
if user.balance >= amount:
    user.balance -= amount  # Race window!
    process_withdrawal()

# VULNERABLE: Follow/Like count
follow_count = get_count()
set_count(follow_count + 1)  # Race window!

# SECURE: Atomic operation
User.update(
    {"$inc": {"balance": -amount}},
    {"balance": {"$gte": amount}}  # Atomic check
)
```

**Test methodology:**
1. Identify state-changing operations
2. Send parallel requests (10-100x)
3. Check for inconsistent state

**Tools:**
```bash
# Turbo Intruder (Burp)
# Race-the-web
# GNU Parallel
seq 100 | parallel -j50 curl -X POST http://target/api/action
```

### Common Targets
- Account balance updates
- Coupon/voucher redemption
- Follow/unfollow counts
- Vote/like operations
- Inventory management
- File upload with processing
- One-time token usage

---

## Workflow Bypasses

### Multi-Step Processes
| Check | Vulnerability | Impact |
|-------|--------------|--------|
| Can I skip steps? | Step bypass | Incomplete validation |
| Can I repeat steps? | Step replay | Double charges |
| Can I go backwards? | State manipulation | Undo actions |
| Is state validated server-side? | Client-side workflow | Complete bypass |

**Test methodology:**
```
Step 1: /api/order/create
Step 2: /api/order/validate
Step 3: /api/order/payment
Step 4: /api/order/confirm

Test:
- Call Step 4 directly (skip 1-3)
- Call Step 3 twice (double payment)
- Call Step 2 after Step 3 (revalidate different data)
- Modify state between steps
```

### Feature Flags & Beta Access
| Check | Vulnerability | Impact |
|-------|--------------|--------|
| Can I enable disabled features? | Feature flag bypass | Unauthorized access |
| Can I access beta features? | Early access bypass | Unstable features |
| Are feature checks client-side? | Client bypass | Hidden features |

**Test cases:**
```
- Add feature flag to request: {"beta": true}
- Modify localStorage/cookie feature flags
- Access beta endpoints directly
```

---

## Abuse Prevention Bypasses

### Rate Limiting
| Check | Vulnerability | Impact |
|-------|--------------|--------|
| Is limit per IP only? | IP rotation bypass | Continued abuse |
| Is limit per user only? | User rotation bypass | Multi-account abuse |
| Can I reset the counter? | Counter reset | Unlimited requests |
| Is limit checked client-side? | Client bypass | No limiting |

**Bypass techniques:**
```
- Rotate IP (proxies, cloud functions)
- Create multiple accounts
- Change user agent
- Use different auth tokens
- Add X-Forwarded-For header
- Change case of endpoint
- Add trailing slash or query params
```

### CAPTCHA
| Check | Vulnerability | Impact |
|-------|--------------|--------|
| Can I reuse solved CAPTCHA? | Token reuse | Bypass |
| Is CAPTCHA validated server-side? | Client-only check | Complete bypass |
| Can I request without CAPTCHA? | Missing enforcement | Bypass |
| Is there an API without CAPTCHA? | Alternative endpoint | Bypass |

---

## Data Validation & Integrity

### Input Boundaries
| Check | Vulnerability | Impact |
|-------|--------------|--------|
| What happens with 0 input? | Zero handling | Logic bypass |
| What happens with negative input? | Negative handling | Credit/refund |
| What happens at MAX_INT? | Integer overflow | Unexpected behavior |
| What happens with NULL/empty? | Null handling | Crashes, bypass |
| What happens with special floats? | Float handling | Precision issues |

**Test values:**
```
0
-1
-0.01
999999999999999999
0.000000001
NaN
Infinity
-Infinity
null
undefined
""
[]
{}
```

### Type Confusion
| Check | Vulnerability | Impact |
|-------|--------------|--------|
| String vs Number comparison | Type juggling | Auth bypass |
| Array vs String | Type confusion | Logic bypass |
| Object vs primitive | Object injection | Various |

**Test cases (PHP/JS weak typing):**
```javascript
// PHP type juggling
"0e123" == "0e456"  // true (both eval to 0)
0 == "any_string"   // true
true == "any_string" // true

// JSON type confusion
{"admin": true}      // vs {"admin": "true"}
{"id": 1}           // vs {"id": "1"}
{"data": [1]}       // vs {"data": "1"}
```

---

## Time-Based Issues

### Time-of-Check to Time-of-Use (TOCTOU)
```
Time T1: Check if user has permission
         (attacker changes permission)
Time T2: Perform action based on T1 check
```

### Expiry Bypass
| Check | Vulnerability | Impact |
|-------|--------------|--------|
| Is expiry checked client-side? | Expiry bypass | Use expired items |
| Can I extend expiry? | Expiry manipulation | Extended access |
| What timezone is used? | Timezone confusion | Early/late access |

**Test cases:**
```
- Modify expires_at field in request
- Change system time
- Use expired tokens (check if server validates)
- Access time-limited content after expiry
```

---

## Application-Specific Logic

### Social Features
```
- Can I follow/friend myself?
- Can I message blocked users?
- Can I view private profiles via API?
- Can I manipulate engagement metrics?
- Can I post as another user?
```

### Content Management
```
- Can I publish without approval?
- Can I backdate content?
- Can I access draft content?
- Can I modify published content?
- Can I delete others' content?
```

### Subscription/Premium
```
- Can I access premium features without paying?
- Can I cancel and keep access?
- Can I stack trial periods?
- Can I downgrade but keep features?
- Can I share subscription?
```

---

## Testing Methodology

### 1. Map Business Flows
- Document all multi-step processes
- Identify state transitions
- Note where money/value is involved

### 2. Identify Trust Boundaries
- What comes from client vs server?
- What's validated where?
- What assumptions are made?

### 3. Test Edge Cases
- Zero, negative, very large values
- Empty, null, special characters
- Concurrent/parallel requests
- Out-of-order operations

### 4. Challenge Assumptions
- "Users won't do X" → Try X
- "This field is always positive" → Send negative
- "Steps must be in order" → Skip/reorder steps
- "This is validated elsewhere" → Is it though?

### 5. Document Impact
- Calculate actual business impact
- Show monetary value where applicable
- Demonstrate reproducibility
