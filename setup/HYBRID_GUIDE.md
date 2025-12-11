# Claude Code Hybrid System - Complete Guide

## 🎯 Architecture Overview

This hybrid system combines the **best of both worlds**:

### **Subagents = Executors** (12 agents)
- **Purpose**: Run tools, create files, execute commands
- **Tools**: Bash, Write, Edit, Grep, Glob
- **Invocation**: Explicit (`@agent-name`) or Claude decides
- **Context**: Isolated - doesn't pollute main conversation
- **Location**: `~/.claude/agents/`

### **Skills = Knowledge Libraries** (5 skills)
- **Purpose**: Passive knowledge that Claude reads
- **Tools**: None (read-only knowledge)
- **Invocation**: Automatic based on conversation context
- **Context**: Part of main conversation
- **Location**: `~/.claude/skills/`

---

## 📊 When to Use What?

| You Need... | Use | Example |
|-------------|-----|---------|
| Run reconnaissance tools | **Subagent**: `@webapp-recon` | "enumerate subdomains for target.com" |
| XSS payload suggestions | **Skill**: xss-encyclopedia (auto) | "need XSS payloads for attribute context" |
| Test APIs actively | **Subagent**: `@api-hunter` | "test this API for IDOR" |
| API testing methodology | **Skill**: api-security-methodology (auto) | "how to test GraphQL?" |
| Create exploit script | **Subagent**: `@exploit-writer` | "write Python exploit for this SQLi" |
| Exploitation techniques | **Skill**: exploit-techniques (auto) | "escalate XSS to RCE" |
| Write bug report | **Skill**: bugbounty-reporting (auto) | "create HackerOne report" |
| Analyze mobile app | **Subagent**: `@mobile-scanner` | "decompile this APK" |
| Test cloud security | **Subagent**: `@cloud-auditor` | "check AWS S3 misconfigurations" |

---

## 🚀 Complete Workflows

### Workflow 1: Bug Bounty - Full Assessment

```bash
# Open Claude Code
claude

# PHASE 1: RECONNAISSANCE (Subagent - Executor)
"@webapp-recon

Target: example.com
Scope: *.example.com, example.net

Tasks:
1. Subdomain enumeration (passive + active)
2. Live host detection with technology stack
3. Endpoint discovery from JS files
4. Directory bruteforcing on main domain
5. Generate comprehensive target inventory

Output:
- subdomains.txt
- live-hosts.txt
- endpoints.txt
- technologies.txt
- target-report.md"

# Claude invokes webapp-recon subagent which:
# - Runs subfinder, amass, assetfinder
# - Executes httpx for live hosts
# - Extracts endpoints with gospider
# - Creates organized files

# PHASE 2: VULNERABILITY DISCOVERY (Skills auto-load)
"I found these endpoints from recon:
- GET /api/v1/users/{id}/profile
- POST /api/v1/users/settings
- GET /search?q=
- POST /admin/upload

Test each for:
1. IDOR/BOLA in user endpoints
2. Mass assignment in settings
3. XSS in search
4. File upload vulnerabilities"

# Claude automatically loads:
# - api-security-methodology skill (for API testing)
# - xss-encyclopedia skill (for XSS payloads)
# Then suggests specific tests for each endpoint

# PHASE 3: ACTIVE TESTING (Subagent - Executor)
"@api-hunter

Test the user profile endpoint for BOLA:
GET /api/v1/users/{id}/profile

Steps:
1. Test with my user_id (123)
2. Test with incremental IDs (1-1000)
3. Check for authorization bypass
4. Document any accessible profiles
5. Create PoC script if vulnerable"

# api-hunter executes actual HTTP requests and creates exploit

# PHASE 4: EXPLOITATION (Subagent + Skills)
"@exploit-writer

Create Python exploit for the IDOR found:
- Enumerate user IDs 1-10000
- Extract email, phone, address from each
- Save to CSV
- Handle rate limiting
- Add progress bar
- Include error handling"

# exploit-writer creates working Python script
# Meanwhile, exploit-techniques skill provides guidance

# PHASE 5: REPORTING (Skill auto-loads)
"Create professional HackerOne report for this IDOR vulnerability:

Endpoint: GET /api/v1/users/{id}/profile
Impact: Access to all user profiles
Severity: High
Include: PoC code, screenshots, CVSS score"

# bugbounty-reporting skill auto-loads
# Claude generates professional report following template
```

### Workflow 2: Web Application Pentest

```bash
claude

# DAY 1: INFORMATION GATHERING
"@webapp-recon start comprehensive recon on target-webapp.com"

# Skill auto-loads: pentest-methodology
# Provides systematic checklist

# DAY 2: AUTHENTICATION TESTING
"Test login functionality at /login for:
- SQL injection
- Weak password policy
- Account lockout
- Session management issues"

# Skills auto-load:
# - pentest-methodology (auth testing checklist)
# - exploit-techniques (SQLi patterns)

# Test JWT token manually with provided payloads
# Then automate with api-hunter

"@api-hunter test JWT token for algorithm confusion and weak secrets"

# DAY 3: AUTHORIZATION TESTING
"@api-hunter scan all API endpoints for IDOR vulnerabilities"

# api-security-methodology skill provides BOLA checklist

# DAY 4: INPUT VALIDATION
"Test all form inputs for:
- XSS (reflected, stored, DOM-based)
- SQL injection
- Command injection
- File upload bypasses"

# xss-encyclopedia skill auto-loads with context-aware payloads
# exploit-techniques skill provides SQLi patterns

# DAY 5: REPORTING
"Generate executive pentest report with:
- All findings categorized by severity
- Business impact assessment
- Detailed remediation guidance
- Technical appendices"

# bugbounty-reporting skill formats everything
```

### Workflow 3: API Security Assessment

```bash
claude

# DISCOVERY
"@webapp-recon

Target: https://api.target.com
Focus on:
- API documentation endpoints (swagger, openapi)
- Endpoint discovery from JS files
- GraphQL introspection
- API versioning (v1, v2, v3)"

# METHODOLOGY
"Create comprehensive API testing plan for REST API at /api/v1"

# api-security-methodology skill auto-loads with OWASP API Top 10

# TESTING - BOLA/IDOR
"@api-hunter

Test all endpoints for BOLA:
1. /api/v1/users/{id}
2. /api/v1/orders/{id}
3. /api/v1/payments/{id}
4. /api/v1/documents/{id}

For each:
- Test cross-user access
- Test with different HTTP methods
- Test parameter pollution
- Document any issues"

# TESTING - AUTHENTICATION
"@api-hunter test JWT token:
- Algorithm confusion (RS256 → HS256)
- Weak secret brute force
- Token expiration
- Signature validation"

# EXPLOITATION
"@exploit-writer

Found IDOR in /api/v1/orders/{id}

Create tool to:
1. Enumerate all order IDs
2. Extract order details
3. Calculate financial impact
4. Generate report"

# REPORTING
"Document all API vulnerabilities for Bugcrowd submission"
```

### Workflow 4: Mobile App Security Testing

```bash
claude

# APK ANALYSIS
"@mobile-scanner

Analyze app.apk:
1. Decompile with jadx
2. Extract API endpoints
3. Find hardcoded secrets
4. Check for insecure data storage
5. Identify exported components
6. Generate security report"

# DYNAMIC ANALYSIS
"@mobile-scanner

Setup Frida environment and:
1. Bypass SSL pinning
2. Hook crypto functions
3. Log all API calls
4. Intercept sensitive data
5. Test for jailbreak detection bypass"

# API TESTING
"Found these API endpoints in the app:
- https://api.mobile.com/auth/login
- https://api.mobile.com/user/profile
- https://api.mobile.com/payments/process

@api-hunter test each for mobile-specific vulnerabilities"

# REPORTING
"Generate mobile security assessment report with:
- Static analysis findings
- Dynamic analysis results
- Frida hook scripts
- API vulnerabilities
- Remediation recommendations"
```

### Workflow 5: Cloud Security Testing

```bash
claude

# AWS ASSESSMENT
"@cloud-auditor

AWS Account Security Audit:
1. Enumerate public S3 buckets
2. Check IAM permissions
3. Test for SSRF to metadata
4. Review Lambda functions
5. Check RDS public exposure
6. Analyze security groups"

# EXPLOITATION
"Found public S3 bucket: company-backups

@cloud-auditor:
1. List all objects
2. Download sensitive files
3. Check for AWS credentials
4. Test for write access
5. Document impact"

# AZURE TESTING
"@cloud-auditor

Test Azure environment:
1. Enumerate storage accounts
2. Check for public blob containers
3. Test managed identities
4. Review NSG rules
5. Check for exposed databases"
```

---

## 💡 Pro Tips

### 1. Let Skills Work Automatically

**❌ Don't do this:**
```bash
"Load the XSS payload skill and give me payloads"
```

**✅ Do this:**
```bash
"I need to test XSS in an HTML attribute context"
# xss-encyclopedia skill auto-loads with relevant payloads
```

### 2. Be Specific with Subagents

**❌ Vague:**
```bash
"@webapp-recon scan the target"
```

**✅ Specific:**
```bash
"@webapp-recon 

Target: example.com
Scope: *.example.com
Tasks:
1. Subdomain enumeration
2. Live host detection
3. Endpoint discovery
Output files with organized results"
```

### 3. Chain Subagents for Complex Tasks

```bash
# Step 1: Recon
"@webapp-recon enumerate target.com"

# Step 2: Test APIs
"@api-hunter test the APIs found by recon"

# Step 3: Create exploits
"@exploit-writer automate the IDOR found"

# Step 4: Report
"Create bug bounty report for all findings"
```

### 4. Use Skills for Quick Reference

```bash
# Need a specific payload?
"XSS payload for JavaScript string context"
# xss-encyclopedia auto-loads

# Need methodology?
"How to test GraphQL APIs?"
# api-security-methodology auto-loads

# Need report format?
"HackerOne report template for XSS"
# bugbounty-reporting auto-loads
```

### 5. Combine Development Agents When Needed

```bash
# Build security dashboard
"@architect design security dashboard architecture"
"@backend implement REST API with Go"
"@frontend create React dashboard with charts"

# All development agents work together
```

---

## 🔧 Customization

### Add Your Own Payload to Skills

```bash
# Edit skill file
nano ~/.claude/skills/xss-encyclopedia.md

# Add custom section:
## Custom Company Bypasses
[Your specific WAF bypasses here]
```

### Create Custom Subagent

```bash
# Create new agent
cat > ~/.claude/agents/custom-tool.md << 'EOF'
---
name: custom-tool
description: Your custom security tool
tools: Read, Write, Bash
---

[Your tool's functionality]
EOF
```

### Create Custom Skill

```bash
# Create new skill
cat > ~/.claude/skills/custom-knowledge.md << 'EOF'
---
name: custom-knowledge
description: Your custom knowledge base
---

[Your knowledge content]
EOF
```

---

## 📈 Performance Comparison

### Before Hybrid (All Subagents)

```
Query: "Give me XSS payloads"
→ Claude invokes @js-security-expert (800 lines loaded)
→ Time: ~15s
→ Tokens: High
→ Must explicitly invoke every time
```

### After Hybrid (Subagents + Skills)

```
Query: "Give me XSS payloads"
→ xss-encyclopedia skill auto-loads (300 lines)
→ Time: ~3s
→ Tokens: Medium
→ Automatically available
```

---

## 🎓 Best Practices

1. **Start with Recon** - Always begin with `@webapp-recon`
2. **Let Skills Auto-Load** - Don't mention them explicitly
3. **Be Specific** - Detailed instructions = better results
4. **Chain When Needed** - Use multiple agents for complex workflows
5. **Iterate** - Refine based on results
6. **Document** - Keep notes of successful workflows

---

## 🐛 Troubleshooting

### Agent Not Found
```bash
# List agents
ls -la ~/.claude/agents/

# Verify agent file exists and has correct format
cat ~/.claude/agents/webapp-recon.md
```

### Skill Not Loading
```bash
# Check skill file
cat ~/.claude/skills/xss-encyclopedia.md

# Skill triggers on keywords - make sure you're using relevant terms
```

### Agent Not Executing Tools
```bash
# Check tools in agent frontmatter
# Make sure it has: tools: Read, Write, Bash, Grep, Glob
```

---

## 📚 Further Learning

- Read each skill file for detailed knowledge
- Experiment with different agent combinations
- Customize for your specific needs
- Share your workflows with the team

---

## 🆘 Quick Reference

### All Subagents (Executors)
1. `@webapp-recon` - Active reconnaissance
2. `@api-hunter` - API security testing
3. `@exploit-writer` - Exploit development
4. `@mobile-scanner` - Mobile app analysis
5. `@cloud-auditor` - Cloud security testing
6. `@automation-builder` - Tool development
7. `@architect` - System architecture
8. `@backend` - Backend development
9. `@frontend` - Frontend development
10. `@devops` - Infrastructure/deployment
11. `@security` - General security review
12. `@qa-tester` - Testing strategies

### All Skills (Auto-Load)
1. `xss-encyclopedia` - XSS payloads
2. `api-security-methodology` - API testing
3. `bugbounty-reporting` - Report templates
4. `pentest-methodology` - Testing checklist
5. `exploit-techniques` - Exploitation patterns

---

Happy hunting! 🎯
