---
description: Perform comprehensive security audit of code and infrastructure
agent: review
---

# Security Audit Prompt

Conduct a thorough security review of the codebase, infrastructure, and deployment practices to identify vulnerabilities and security risks.

## Audit Scope

### Areas to Review
- [ ] **Authentication & Authorization**
- [ ] **Input Validation & Sanitization**
- [ ] **Data Protection & Encryption**
- [ ] **API Security**
- [ ] **Dependency Vulnerabilities**
- [ ] **Infrastructure Security**
- [ ] **Secret Management**
- [ ] **Logging & Monitoring**

---

## Security Checklist

### 1. Authentication & Authorization

#### Authentication
- [ ] Passwords hashed with strong algorithm (bcrypt, Argon2)
- [ ] Multi-factor authentication (MFA) available
- [ ] Session management secure (httpOnly, secure, sameSite cookies)
- [ ] Password requirements enforced (length, complexity)
- [ ] Account lockout after failed attempts
- [ ] JWT tokens properly validated and signed
- [ ] Token expiration implemented
- [ ] Refresh token rotation

**Common Vulnerabilities:**
```typescript
// ❌ Bad: Weak password hashing
const hash = md5(password); // MD5 is broken

// ✅ Good: Strong password hashing
import bcrypt from 'bcrypt';
const hash = await bcrypt.hash(password, 12);

// ❌ Bad: JWT without expiration
const token = jwt.sign({ userId }, SECRET);

// ✅ Good: JWT with expiration
const token = jwt.sign({ userId }, SECRET, { expiresIn: '15m' });
```

#### Authorization
- [ ] Role-based access control (RBAC) implemented
- [ ] Principle of least privilege applied
- [ ] Authorization checked on every request
- [ ] Resource ownership verified
- [ ] No insecure direct object references (IDOR)
- [ ] Horizontal privilege escalation prevented
- [ ] Vertical privilege escalation prevented

**IDOR Example:**
```typescript
// ❌ Bad: No ownership check
app.get('/api/orders/:id', async (req, res) => {
  const order = await db.orders.findById(req.params.id);
  res.json(order); // Any user can access any order!
});

// ✅ Good: Verify ownership
app.get('/api/orders/:id', authenticateUser, async (req, res) => {
  const order = await db.orders.findById(req.params.id);
  if (order.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  res.json(order);
});
```

---

### 2. Input Validation & Injection Prevention

#### SQL Injection
- [ ] Parameterized queries used (no string concatenation)
- [ ] ORM used correctly (avoid raw queries)
- [ ] Stored procedures parameterized
- [ ] Input validation on all user data

**Examples:**
```python
# ❌ Bad: SQL Injection vulnerability
query = f"SELECT * FROM users WHERE email = '{email}'"
cursor.execute(query)

# ✅ Good: Parameterized query
query = "SELECT * FROM users WHERE email = %s"
cursor.execute(query, (email,))

# ❌ Bad: ORM with string interpolation
User.objects.raw(f"SELECT * FROM users WHERE name = '{name}'")

# ✅ Good: ORM with parameters
User.objects.filter(name=name)
```

#### XSS (Cross-Site Scripting)
- [ ] Output encoding/escaping implemented
- [ ] Content-Security-Policy header set
- [ ] User input sanitized before display
- [ ] React/Vue auto-escaping utilized
- [ ] Dangerous methods avoided (innerHTML, dangerouslySetInnerHTML)

```typescript
// ❌ Bad: XSS vulnerability
element.innerHTML = userInput;

// ✅ Good: Safe text insertion
element.textContent = userInput;

// ❌ Bad: React XSS
<div dangerouslySetInnerHTML={{ __html: userInput }} />

// ✅ Good: React auto-escapes
<div>{userInput}</div>
```

#### Command Injection
- [ ] No shell commands with user input
- [ ] If required, use safe APIs (child_process.execFile, not exec)
- [ ] Input validated against allowlist

```javascript
// ❌ Bad: Command injection
exec(`rm -rf ${userInput}`);

// ✅ Good: Use safe APIs with validation
import { execFile } from 'child_process';
const allowedCommands = ['backup', 'restore'];
if (allowedCommands.includes(command)) {
  execFile('safe-script.sh', [command]);
}
```

#### Path Traversal
- [ ] File paths validated
- [ ] Relative paths blocked (../)
- [ ] Files served from restricted directory

```python
# ❌ Bad: Path traversal
filename = request.args.get('file')
with open(f'/uploads/{filename}') as f:
    return f.read()

# ✅ Good: Validate and sanitize
import os
filename = os.path.basename(request.args.get('file'))
safe_path = os.path.join('/uploads', filename)
if safe_path.startswith('/uploads/'):
    with open(safe_path) as f:
        return f.read()
```

---

### 3. Data Protection & Encryption

#### Data at Rest
- [ ] Sensitive data encrypted (PII, PCI data)
- [ ] Encryption keys properly managed
- [ ] Database encryption enabled
- [ ] File system encryption (where applicable)
- [ ] Backups encrypted

#### Data in Transit
- [ ] HTTPS/TLS enforced everywhere
- [ ] TLS 1.2+ required (TLS 1.0/1.1 disabled)
- [ ] Strong cipher suites configured
- [ ] Certificate validation enabled
- [ ] HSTS header set

```nginx
# Nginx HTTPS configuration
ssl_protocols TLSv1.2 TLSv1.3;
ssl_ciphers 'ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256';
ssl_prefer_server_ciphers on;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
```

#### Sensitive Data Handling
- [ ] No sensitive data in logs
- [ ] No sensitive data in URLs/query params
- [ ] Credit cards handled per PCI-DSS
- [ ] Personal data complies with GDPR/CCPA
- [ ] Secrets not committed to git

```typescript
// ❌ Bad: Logging sensitive data
logger.info('User login', { email, password });

// ✅ Good: Sanitized logging
logger.info('User login', { email });

// ❌ Bad: Sensitive data in URL
fetch(`/api/reset-password?token=${resetToken}`);

// ✅ Good: Sensitive data in body/header
fetch('/api/reset-password', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${resetToken}` }
});
```

---

### 4. API Security

- [ ] Rate limiting implemented
- [ ] CORS configured (not wildcard *)
- [ ] API keys rotated regularly
- [ ] Versioned APIs (backward compatibility)
- [ ] Request size limits enforced
- [ ] GraphQL query depth limiting
- [ ] REST pagination enforced

```typescript
// Rate limiting
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests'
});

app.use('/api/', limiter);

// CORS configuration
app.use(cors({
  origin: ['https://example.com', 'https://app.example.com'],
  credentials: true
}));

// Request size limits
app.use(express.json({ limit: '10kb' }));
```

---

### 5. Dependency Vulnerabilities

- [ ] Dependencies up to date
- [ ] No known vulnerabilities (npm audit, pip check)
- [ ] Automated dependency scanning (Dependabot, Snyk)
- [ ] Unused dependencies removed
- [ ] Licenses reviewed

**Run Security Audits:**
```bash
# Node.js
npm audit
npm audit fix

# Python
pip-audit
safety check

# .NET
dotnet list package --vulnerable

# Go
go list -json -m all | nancy sleuth
```

---

### 6. Infrastructure Security

#### Server Configuration
- [ ] Firewall configured (only required ports open)
- [ ] SSH key-based auth (passwords disabled)
- [ ] Root login disabled
- [ ] Automatic security updates enabled
- [ ] Unnecessary services disabled
- [ ] File permissions restrictive

#### Container Security
- [ ] Base images from trusted sources
- [ ] Images scanned for vulnerabilities
- [ ] Non-root user in containers
- [ ] Secrets not in images
- [ ] Minimal image size (fewer attack surfaces)

```dockerfile
# ❌ Bad: Running as root
FROM node:18
COPY . /app
CMD ["node", "server.js"]

# ✅ Good: Non-root user
FROM node:18
RUN groupadd -r appuser && useradd -r -g appuser appuser
COPY --chown=appuser:appuser . /app
USER appuser
CMD ["node", "server.js"]
```

#### Cloud Security
- [ ] IAM roles with least privilege
- [ ] Security groups restrictive
- [ ] Encryption at rest enabled (S3, RDS, etc.)
- [ ] VPC configured properly
- [ ] CloudTrail/audit logging enabled
- [ ] Multi-factor auth on cloud accounts

---

### 7. Secret Management

- [ ] No secrets in code or config files
- [ ] Environment variables used
- [ ] Secret management service (Vault, AWS Secrets Manager)
- [ ] Secrets rotated regularly
- [ ] Git history cleaned of secrets
- [ ] .env files in .gitignore

**Check for leaked secrets:**
```bash
# Scan git history for secrets
trufflehog git file://. --only-verified

# Scan for common patterns
git grep -E 'password.*=.*["|'\''].*["|'\'']'
git grep -E 'api[_-]?key.*=.*["|'\''].*["|'\'']'
```

```typescript
// ❌ Bad: Hardcoded secrets
const apiKey = 'sk_live_abc123xyz';

// ✅ Good: Environment variables
const apiKey = process.env.API_KEY;
if (!apiKey) {
  throw new Error('API_KEY not configured');
}
```

---

### 8. Logging & Monitoring

- [ ] Security events logged (failed logins, permission denials)
- [ ] Logs centralized and monitored
- [ ] Anomaly detection configured
- [ ] Alerts for suspicious activity
- [ ] Log retention policy defined
- [ ] Logs don't contain sensitive data

```typescript
// Security event logging
logger.warn('Failed login attempt', {
  email: email,
  ip: req.ip,
  timestamp: new Date(),
  userAgent: req.headers['user-agent']
});

// Monitoring alerts
if (failedLoginCount > 5) {
  alerting.notify('Possible brute force attack', {
    ip: req.ip,
    attempts: failedLoginCount
  });
}
```

---

## Security Headers

Ensure these headers are set:

```javascript
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // XSS protection
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // CSP
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  
  // HSTS
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  next();
});
```

---

## Security Audit Report Template

```markdown
# Security Audit Report

**Date:** YYYY-MM-DD  
**Auditor:** [Name]  
**Scope:** [What was audited]

## Executive Summary
[High-level findings and risk assessment]

**Overall Risk Level:** 🔴 High / 🟡 Medium / 🟢 Low

## Critical Issues 🔴

### 1. [Issue Title]
**Severity:** Critical  
**Category:** [Authentication/Authorization/Injection/etc.]  
**Location:** `file.ts:123`

**Description:** [What's wrong]

**Impact:** [What could happen]

**Reproduction:**
1. Step 1
2. Step 2
3. Exploit occurs

**Recommendation:** [How to fix]

**Priority:** Fix immediately

---

## High Priority Issues 🟡

[Similar format]

---

## Medium Priority Issues 🟠

[Similar format]

---

## Low Priority / Recommendations 🟢

[Similar format]

---

## Compliance

- [ ] GDPR compliant
- [ ] PCI-DSS compliant (if handling cards)
- [ ] HIPAA compliant (if handling health data)
- [ ] SOC 2 requirements met

---

## Action Items

| Issue | Priority | Owner | Due Date | Status |
|-------|----------|-------|----------|--------|
| Fix SQL injection | Critical | Dev Team | YYYY-MM-DD | 🔴 Open |
| Add rate limiting | High | Backend | YYYY-MM-DD | 🟡 In Progress |
| Update dependencies | Medium | DevOps | YYYY-MM-DD | 🟢 Completed |

---

## Next Steps

1. Address all critical issues immediately
2. Schedule fixes for high priority items
3. Re-audit after fixes applied
4. Implement continuous security monitoring

---

**Next Audit Date:** [Schedule follow-up]
```

## Automated Security Tools

Integrate these tools:
- **SAST:** SonarQube, Semgrep, Checkmarx
- **DAST:** OWASP ZAP, Burp Suite
- **Dependency Scanning:** Snyk, Dependabot
- **Secret Scanning:** TruffleHog, GitGuardian
- **Container Scanning:** Trivy, Clair

## Checklist Summary

After audit, verify:
- [ ] All critical vulnerabilities documented
- [ ] Action items assigned with deadlines
- [ ] Compliance requirements reviewed
- [ ] Security improvements prioritized
- [ ] Re-audit scheduled
