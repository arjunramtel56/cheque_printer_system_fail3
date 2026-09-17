<!-- Sync Impact Report -->
<!-- This comment is temporary scratch material for human review of the amendment, not governance content.
  - Version change: (none) → 1.0.0
  - Modified principles: (none — initial ratification)
  - Added sections: Core Principles I–V, Security Requirements, Development Workflow, Governance
  - Removed sections: (none)
  - Deferred TODOs: None
--># Reactify Cheque Printer System Constitution

## Core Principles

### I. Security-First Architecture
The platform MUST maintain a server-authoritative security core (`core/platform.mjs`) that validates every privileged action. Client-side UI state (layout, themes, preview) MUST NOT be trusted for authorization, print authorization, billing, or audit decisions. All security-sensitive operations (authentication, TOTP-MFA, scrypt hashing, CSRF, session management, backup encryption, audit chain) MUST execute server-side. No client manipulation (DOM, network, timing) MAY unlock premium printing or bypass subscription checks.

### II. Single-Process Server with Preserved Security Core
The application MUST run as a single Next.js server process that mounts the preserved Express-free security core in-process. All routes MUST be server-rendered with no client-side-only security. The security core MUST remain backward-compatible across UI rewrites so that no approved functionality, security control, historical data, or cheque-printing configuration is altered during UI modernization.

### III. Test-First and Verified Release
All critical security, billing, printing geometry, and audit-trail paths MUST be covered by integration tests executed via `node --test tests/*.test.mjs`. Dependency and security scanning (`npm run security:scan`) MUST pass before production deployment. The Next.js production build path MUST be exercised by `tests/deployment.test.mjs`. Physical printer-aligned test cases MUST be validated before every bank template or print profile is marked calibrated.

### IV. Server-Authorized Printing Workflow
Print authorization MUST be server-generated, single-use, two-minute, and revocable. The server MUST validate print profiles, bank templates, and X/Y calibration before generating a print ticket. Bank selection MUST never be silently applied; users MUST explicitly select a bank template before saving or printing. The print preview and physical print output MUST use the same coordinate system to maintain consistency.

### V. Immutable Financial Records and Audit Trail
All invoices MUST store an immutable server-side snapshot of pricing, adjustments, VAT rate, and final payable amount. Future tax-policy changes MUST NOT modify previously issued invoice snapshots. Audit logs MUST be append-only and HMAC-chained. Backup files MUST be AES-256-GCM encrypted and integrity-verified before restore consideration.

## Security Requirements

The following security controls are non-negotiable and MUST be enforced in every environment:

- Authentication uses server-side scrypt password hashing with unique salts.
- All Administrator accounts MUST have mandatory TOTP-based MFA enforcement.
- Sessions MUST be server-side, rotating, expiring, and remotely revocable via HTTP-only, SameSite cookies.
- CSRF protection MUST be active on every state-changing endpoint.
- Security HTTP headers MUST be set on all responses (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy).
- CAPTCHA MUST be mandatory in production; development challenges are dynamically generated with no shared bypass token.
- PAN/VAT configuration MUST require explicit Administrator verification; no automatic VAT charging.
- No Administrator password, MFA secret, or server secret MAY be printed to the console or committed to Git.
- Fonepay QR graphic MUST be replaced with the official company QR before accepting real payments.
- Production mode MUST refuse to start without all required secrets (session, audit, IP-hash, admin credentials, TOTP, CAPTCHA, email provider).
- The platform MUST NOT attempt to access or read a device's MAC address; device identification MUST use pseudonymous hashes of browser signals, signed device cookies, and network-risk data only.

## Development Workflow

- Code review is required for every merge to main; reviewers MUST verify constitution compliance.
- All tests and security scans MUST pass before production deployment.
- New bank templates or print profiles MUST undergo physical plain-paper alignment testing before being marked calibrated.
- Backups MUST be tested through an isolated restore-verification process before production reliance.
- Dependency updates MUST pass weekly automated scanning; high-severity CVEs MUST be remediated before release.
- Feature work MUST be scoped from `.specify/` specs and tracked in work items tied to the project structure.
- Local development is permitted with Node.js 22.21+; no third-party runtime packages are required for development.

## Governance

The Constitution supersedes all prior project practices and local conventions. Amendments require a documented rationale, peer review, and version bump per semantic governance rules:

- **MAJOR**: Backward-incompatible principle removal or redefinition.
- **MINOR**: New principle or materially expanded guidance.
- **PATCH**: Clarification, wording, or typo fixes.

All PRs and reviews MUST verify constitution compliance. Complexity MUST be justified against the Simplicity principle where applicable. The `.specify/` workflow artifacts (specs, plans, tasks) are the authoritative source for feature scope.

**Version**: 1.0.0 | **Ratified**: 2025-01-01 | **Last Amended**: 2025-01-01