# Security

## Authentication

- Argon2id password hashing
- HttpOnly secure cookies
- Session rotation on login
- Rate limiting on auth endpoints
- Brute-force protection

## Authorization

- Role-Based Access Control (RBAC)
- Organization-level data isolation
- Resource ownership verification

## Data Protection

- Encrypted backups
- Secure file upload validation
- SQL injection protection (Prisma ORM)
- XSS protection (CSP headers)
- CSRF protection

## Infrastructure

- Cloudflare WAF + DDoS protection
- Database on private network
- Secrets in environment variables
- Audit logs for all mutations
