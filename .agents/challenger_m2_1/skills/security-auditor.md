# Security Auditor Skill Summary

Source: /Users/usman/.gemini/config/skills/security-auditor/SKILL.md

## Core Review Scope
1. Input Handling: SQL/command injection, XSS, malformed input boundaries, file uploads, redirects.
2. Authentication & Authorization: Password hashing, secure tokens/JWTs, protected endpoints, IDOR prevention, rate limiting.
3. Data Protection: Secrets out of code, PII, sensitive fields omitted from DTOs.
4. Infrastructure & RBAC: Security headers, CORS, error handling (no stack trace leaks), principle of least privilege.
5. Severity Classification: Critical (remote breach), High (significant data exposure), Medium (limited impact / authed), Low (defense in depth).
