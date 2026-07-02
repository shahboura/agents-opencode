---
name: security-audit
description: >-
  Comprehensive security audit of code, infrastructure, dependencies, and
  deployment practices. Covers authentication, injection prevention, data
  protection, API security, secret management, and logging.
license: MIT
compatibility: opencode
metadata:
  author: shahboura
  version: "1.0.0"
  audience: developers
  workflow: code-review
---

## What I do

- Audit authentication & authorization (password hashing, MFA, sessions, RBAC, IDOR)
- Scan for injection vulnerabilities (SQL, XSS, command injection, path traversal)
- Review data protection at rest and in transit (encryption, TLS, sensitive data handling)
- Assess API surface security (rate limiting, CORS, query depth, pagination)
- Check dependency health (known CVEs, stale packages, license risks)
- Evaluate infrastructure hardening (containers, cloud IAM, firewall, SSH)
- Hunt hardcoded secrets and verify secret management hygiene
- Validate logging/monitoring for security events and anomaly detection
- Deliver a structured audit report with severity-graded findings and an action plan

## When to use me

Activate this skill when:
- A user requests a security audit, security review, or vulnerability assessment
- A new feature, endpoint, or deployment surface is being introduced
- Pre-release hardening or compliance (GDPR, PCI-DSS, HIPAA, SOC 2) is needed

## Key Rules

### Audit Areas — Checklist
#### 1. Authentication & Authorization

**Authentication:**
- Passwords hashed with strong algorithm (bcrypt, Argon2)
- Multi-factor authentication available
- Session management secure (httpOnly, secure, sameSite cookies)
- Password length/complexity requirements enforced
- Account lockout after repeated failed attempts
- JWT tokens properly validated, signed, and rotated
- Token expiration implemented; refresh token rotation in place

**Authorization:**
- Role-based access control (RBAC) applied; least privilege enforced
- Authorization checked on every request
- Resource ownership verified — no IDOR (Insecure Direct Object References)
- Horizontal and vertical privilege escalation prevented

#### 2. Input Validation & Injection Prevention

- **SQL Injection:** Parameterized queries only — no string concatenation; ORM raw queries avoided
- **XSS:** Output encoding/escaping used; Content-Security-Policy header set; dangerous methods avoided (innerHTML, dangerouslySetInnerHTML)
- **Command Injection:** No shell commands built from user input; use safe APIs (execFile, not exec); allowlist validation
- **Path Traversal:** File paths validated; relative paths (../) blocked; files served from restricted directories

#### 3. Data Protection & Encryption

- **Data at rest:** PII/PCI data encrypted; encryption keys managed properly; database/file-system encryption enabled; backups encrypted
- **Data in transit:** HTTPS/TLS enforced everywhere; TLS 1.2+ required (1.0/1.1 disabled); strong cipher suites; HSTS header set
- **Sensitive data handling:** No secrets in logs, URLs, or query params; PCI-DSS/GDPR/CCPA compliance reviewed; secrets excluded from git

#### 4. API Security

- Rate limiting on all endpoints; CORS configured with explicit origins (no wildcard)
- API keys rotated regularly; versioned APIs with backward compatibility
- Request size limits enforced; GraphQL query depth limiting; REST pagination enforced
- Authentication required on all non-public endpoints

#### 5. Dependency Vulnerabilities

- Dependencies up to date; no known CVEs (npm audit, pip-audit, safety check)
- Automated scanning configured (Dependabot, Snyk, Renovate)
- Unused dependencies removed; licenses reviewed for compatibility

#### 6. Infrastructure Security

- **Servers:** Firewall restricts to required ports; SSH key-only auth (passwords disabled); root login disabled; automatic security updates enabled; unused services disabled
- **Containers:** Trusted base images; images scanned for CVEs; non-root user in containers; secrets excluded from image layers; minimal attack surface
- **Cloud:** IAM roles with least privilege; restrictive security groups; encryption at rest (S3, RDS); VPC properly configured; audit logging (CloudTrail) enabled; MFA on all accounts

#### 7. Secret Management

- No secrets in source code or config files; environment variables or secret manager used
- Secret management service in place (Vault, AWS Secrets Manager, Doppler)
- Secrets rotated regularly; git history cleaned of any leaked secrets; .env in .gitignore
- Pre-commit hooks or CI secret scanning active (TruffleHog, GitGuardian)

#### 8. Logging & Monitoring

- Security events logged (failed logins, permission denials, privilege changes)
- Logs centralized and monitored; anomaly detection configured
- Alerts for suspicious activity (brute force, unusual patterns, privilege escalation)
- Log retention policy defined; logs must not contain sensitive data

### Security Headers Reference

Required HTTP response headers:
```text
X-Frame-Options: DENY
X-Content-Type-Options: nosniff
Content-Security-Policy: default-src 'self'
Strict-Transport-Security: max-age=31536000; includeSubDomains
Referrer-Policy: strict-origin-when-cross-origin
```

TLS: require TLS 1.2+, disable 1.0/1.1, use strong cipher suites.

### Report Template

```markdown
# Security Audit Report
**Date:** YYYY-MM-DD | **Scope:** [What was audited]
**Overall Risk Level:** Critical / High / Medium / Low

## Executive Summary
[High-level findings]

## Critical Issues
### [Issue Title]
- **Severity:** Critical | **Category:** [area] | **Location:** `path:line`
- **Description:** [What is wrong] | **Impact:** [What could happen]
- **Recommendation:** [How to fix]

## High / Medium / Low Priority Issues
[Same format, tiered by severity]

## Compliance
- [ ] GDPR  [ ] PCI-DSS  [ ] HIPAA  [ ] SOC 2

## Action Items
| Issue | Priority | Owner | Due | Status |
|---|---|---|---|

## Next Steps
1. Fix critical issues immediately
2. Schedule high-priority fixes
3. Re-audit after remediation
4. Implement continuous monitoring
```

### Automated Tools

Integrate into CI/CD:

| Category | Tools |
|---|---|
| SAST (static analysis) | SonarQube, Semgrep, Checkmarx |
| DAST (dynamic testing) | OWASP ZAP, Burp Suite |
| Dependency scanning | Snyk, Dependabot, npm audit, pip-audit |
| Secret scanning | TruffleHog, GitGuardian |
| Container scanning | Trivy, Clair, Docker Scout |

### Audit Commands

Run these during the audit:

```bash
# Dependency vulnerability scans (by ecosystem)
npm audit                              # Node.js
pip-audit                              # Python
safety check                           # Python (alternative)
dotnet list package --vulnerable       # .NET
go list -json -m all | nancy sleuth   # Go
bundle audit                           # Ruby

# Secret scanning
trufflehog git file://. --only-verified
git grep -E 'password.*=.*["'"'"'].*["'"'"']'     # Manual: hardcoded passwords
git grep -E 'api[_-]?key.*=.*["'"'"'].*["'"'"']'  # Manual: API keys

# Infrastructure
docker scan <image>                    # Container CVE scan
trivy image <image>                    # Container scan (alternative)
```

## Validation Commands

```bash
# Manual verification checklist — no automated validation
# [ ] All 8 audit areas reviewed against checklist
# [ ] Auth: hashing algo, session config, RBAC, IDOR verified
# [ ] Injection: SQL, XSS, command injection, path traversal checked
# [ ] Data: TLS config, encryption at rest, sensitive data handling validated
# [ ] API: rate limiting, CORS, auth, size limits confirmed
# [ ] Dependencies: audit tool run, zero known CVEs
# [ ] Infrastructure: container non-root, SSH key-only, IAM least privilege
# [ ] Secrets + Logging: no hardcoded secrets, security events captured
# [ ] Report generated with severity-graded findings + action plan + compliance review
```
