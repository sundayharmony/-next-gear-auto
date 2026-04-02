# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in this project, please report it responsibly:

1. **Email:** Send details to [sales@sundayharmony.com](mailto:sales@sundayharmony.com)
2. **Do NOT** create a public GitHub issue for security vulnerabilities
3. Include as much detail as possible:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will acknowledge receipt within 48 hours and aim to provide a fix within 7 days for critical issues.

## Security Measures

This project implements the following security measures:

- **HTTPS only** with HSTS preload
- **Content Security Policy** (CSP) headers
- **CSRF protection** via double-submit cookie pattern
- **JWT authentication** with httpOnly, secure, sameSite=strict cookies
- **Rate limiting** on sensitive endpoints (login, checkout, contact)
- **Input validation** and sanitization on all API routes
- **Webhook signature verification** for Stripe
- **Parameterized database queries** (via Supabase ORM)
- **File upload validation** (type whitelist, size limits, UUID filenames)
- **Audit logging** for authentication events
- **Dependabot** for automated dependency vulnerability scanning
