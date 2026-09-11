# Security Auditor Skill
Source: /Users/usman/.gemini/config/skills/security-auditor/SKILL.md

Core Methodology:
1. Input handling and boundary validation.
2. Authentication & Authorization: RBAC coverage across endpoints, multi-tenant IDOR boundaries.
3. Exploitation-oriented verification: prove that unauthorized access is blocked (401/403) and tenant data is strictly isolated.
4. Verify defense-in-depth across route prefixes and HTTP methods.
