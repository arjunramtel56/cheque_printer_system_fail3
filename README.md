# Reactify Cheque Printer System

**Current Release: Version 1.8.0**

Version 1.8.0 rewrites the entire application as a modern, responsive, accessible
**Next.js (React) application** — Landing page, User Panel, Guest Trial Panel and
Administrator Panel — with cohesive layouts, a shared design-token system and
**Light / Dark / System** themes. Every page in now server-rendered React over the
preserved, Express-free security core (`core/platform.mjs`), so no approved
functionality, security control, historical data or cheque-printing configuration
is altered. See the [Version 1.8 Release Report](RELEASE-NOTES-v1.8.md) for the
verified change summary and actual test results.

The **Reactify Cheque Printer System** is a secure commercial cheque-printing platform designed around a server-authorized printing workflow. It supports **Administrator, Subscriber/User, and one-day Guest access**, with authentication, subscription management, printer calibration, payment processing, audit logging, and security controls.

* **Developed by:** Reactify Software Technologies Pvt. Ltd.
* **Support:** [support@reactifysoftwaretechnologies.com.np](mailto:support@reactifysoftwaretechnologies.com.np)
* **Phone:** 9743836026
* **Address:** Kankai Municipality-3, Nepal
* **PAN:** 65284125
* **Website:** [https://www.reactifysoftwaretechnologies.com.np](https://www.reactifysoftwaretechnologies.com.np)
* **Production Deployment:** [Railway + Cloudflare Production Runbook](docs/RAILWAY-CLOUDFLARE-PRODUCTION-v1.7.md)
* **Version 1.7 Release Report:** [Release Notes and Verified Results](RELEASE-NOTES-v1.7.md)

---

## Key Features and Implemented Functionality

### Authentication and Security

* Server-side authentication with role-based access control.
* Subscription and trial eligibility enforcement.
* CSRF protection and secure HTTP security headers.
* Scrypt password hashing with unique salts.
* Mandatory TOTP-based MFA for all Administrator accounts.
* Rotating, expiring, and remotely revocable server-side sessions using HTTP-only, SameSite cookies.
* Email-based verification for registered Users.
* Production fail-closed CAPTCHA integration.
* Phone numbers are collected for registered-account contact purposes but are not used as a verification mechanism.

### Guest Access

* Password-free Guest access using:

  * Personal or Organizational usage type
  * Full name
  * Email address
* Guest access creates a secure server session immediately without requiring:

  * Registration
  * Password
  * OTP
  * Email verification
* One-day Guest access is resumable on the previously registered device.
* Guest access is protected through:

  * Signed device cookies
  * Pseudonymous device fingerprints
  * IP-risk history
  * Rate limiting
  * Abuse detection
  * Configurable print limits

### Registered User Trial

* Registered Users receive one free 24-hour access period after email verification.
* A shared eligibility ledger prevents Guest and User trials from being stacked.
* Authorized Administrators can record an override reason when an exception is required.

### Printing and Calibration

The system supports four print profiles:

1. Custom Short
2. Custom Long
3. A4 Vertical Carrier
4. A4 Horizontal Carrier

Additional printing functionality includes:

* Independent X/Y calibration for each User and print profile.
* Server-generated, two-minute, single-use print tickets.
* Server-side print authorization to prevent premium printing from being unlocked by manipulating browser elements.
* Bank-template-based cheque configuration.
* Printer-specific calibration settings.
* Print preview and alignment testing.
* Plain-paper overlay testing before production printing.

### Bank Templates

* Includes 54 Nepal Rastra Bank Class A, B, and C institution names.
* Only verified/calibrated templates are marked as calibrated.
* Siddhartha Bank currently has a calibrated template based on the supplied reference and safe-zone requirements.
* Other bank templates must undergo a physical plain-paper alignment test before an Administrator can mark them as calibrated.
* Bank selection is never silently applied.

On every page load and form reset:

> **Select a Bank Template**

The User must explicitly select a bank before saving or printing. No bank is selected automatically.

### Cheque Layout and Calibration

The system supports configurable cheque fields, including:

* Bank name
* Date
* Payee name
* Amount in words
* Numeric amount
* Account/reference information
* A/C PAYEE positioning
* Signature areas
* X/Y printer corrections

The preview and print output use the same coordinate system to maintain consistency between screen preview and physical printing.

### Audit, Billing, and Records

The system provides server-side management for:

* Cheque history
* Payment and invoice records
* Subscription status
* Support records
* Security events
* Backups
* Append-only HMAC-chained audit logs

---

## Subscription and Pricing

The platform supports separate **Personal** and **Organizational** plans with configurable:

* Pricing
* Print allowances
* Benefits
* Permissions
* Support levels
* Discounts
* Promotions
* Subscription lifecycle status

Plan selection is available from:

* Landing page
* User dashboard

A plan selected on the landing page is displayed as a read-only registration summary and carried into the User dashboard.

**Registration does not contain a separate plan-selection field.**

---

## Payment and Invoice Management

**Fonepay QR** is currently the only supported payment method.

Users can:

1. Create an invoice.
2. Upload a payment voucher in PNG, JPEG, or PDF format.
3. View the payment status.
4. Receive Pending, Approved, or Rejected status.
5. View rejection reasons.
6. Resubmit a voucher after rejection.

### Invoice Features

Company-branded one-page A4 invoices include:

* Customer information
* Plan information
* Immutable pricing snapshot
* Issue date
* Due date
* Subscription dates after activation
* Tax/VAT information
* Payment method
* Payment reference
* Terms and conditions
* Authorized-signature area
* View
* Print
* Download PDF

### Tax and VAT Administration

Authorized tax administrators can configure:

* Verified seller PAN/VAT registration
* VAT rate in basis points
* 13% VAT default
* VAT-inclusive pricing
* VAT-exclusive pricing
* Separate Personal and Organizational defaults
* Customer-specific PAN/VAT treatment

Each invoice stores an immutable server-side snapshot of:

* Original price
* Approved adjustment
* Taxable amount
* VAT rate
* VAT amount
* Final payable amount
* Applicable policy version

Future tax-policy changes do not modify previously issued invoice snapshots.

---

## Administrator Dashboard

The Administrator dashboard provides centralized management for:

* Plan creation and editing
* Subscription requests
* Custom quotations
* Individual pricing adjustments
* Invoice generation
* Payment voucher review
* Paid/Unpaid decisions
* Subscription activation
* Trial overrides
* Reports
* Backups
* Audit verification
* Bank-template management
* User management
* Security monitoring

### Real-Time Server Events

The platform uses live server events to push changes to active dashboards without requiring users to:

* Refresh the browser
* Log out
* Log in again

Supported live updates include:

* Payment approvals
* Subscription changes
* Plan changes
* Bank-template changes

---

## Supported Devices and Browsers

The interface is responsive and designed for:

* Windows
* macOS
* Android
* iPhone
* Modern desktop and mobile browsers

---

## Nepal Timezone Support

The landing-page demonstration cheque date uses the **Asia/Kathmandu** timezone.

The system:

* Calculates the demonstration date using Nepal time.
* Renders the date as eight independent `DD/MM/YYYY` digits.
* Reschedules the demonstration date at Nepal midnight.
* Does not modify any saved or printable cheque date.

---

## Backup and Security Operations

The system supports:

* AES-256-GCM encrypted backups
* Backup integrity verification
* Scheduled backups
* Isolated restore testing
* High-severity security alert hooks
* Cross-site request validation
* Weekly automated dependency and security scanning
* HMAC-based audit-chain verification

---

# Important Launch Boundary

This release is a **tested commercial MVP/foundation**. It should not be interpreted as confirmation that the production financial system has passed an independent security audit, penetration test, compliance review, or financial-system certification.

Before public production use:

* Perform physical printer alignment testing on every printer and cheque format.
* Replace the Fonepay placeholder graphic with the official company QR before accepting payments.
* Verify the company's PAN/VAT registration status and applicable tax requirements.
* Configure production email-verification and CAPTCHA providers.
* Perform an independent penetration test.
* Complete an OWASP ASVS/security review.
* Migrate from SQLite to managed PostgreSQL before multi-instance deployment or significant production scale.

### Fonepay QR

The included Fonepay graphic is intentionally a placeholder labelled:

> **This is a Fonepay QR.**

It must be replaced with the official company payment QR before accepting real payments.

### Tax/VAT

The default configuration stores the supplied company PAN but does not automatically claim VAT registration or charge VAT.

An authorized Administrator must verify the company's VAT registration status and applicable legal requirements before enabling taxable treatment.

Existing invoice snapshots remain unchanged when future tax policies are modified.

### Production Verification

Production User email verification and CAPTCHA require properly configured providers.

Guest access does not require email verification; however, **CAPTCHA remains mandatory in production**.

Development CAPTCHA challenges are generated dynamically at runtime. No shared CAPTCHA bypass token is included in the production package.

### Database

SQLite is suitable for a controlled single-server pilot environment.

For:

* Multiple application instances
* Higher traffic
* Material production scale

the system should be migrated to a managed PostgreSQL deployment.

---

# Running the Verified Pilot Locally

### Requirements

* Node.js **22.21 or newer**
* No third-party runtime packages are required.

### 1. Start the Application

On Windows, run:

```text
Start-Cheque-Platform.bat
```

Alternatively:

```text
npm start
```

### 2. First Launch

On the first local launch, the application automatically creates a private `.env` file containing independently generated:

* Administrator credentials
* MFA secrets
* Session secrets
* Audit secrets
* IP-hashing secrets
* Backup secrets

Credentials are not printed to the console or committed to Git.

### 3. Open the Application

Open:

```text
http://127.0.0.1:8787/
```

To access the Administrator account, open the locally generated `.env` file and enroll `ADMIN_TOTP_SECRET` in an authenticator application.

### 4. Application Routes

| Function             | URL                                  |
| -------------------- | ------------------------------------ |
| Landing Page         | `http://127.0.0.1:8787/`             |
| User Login           | `http://127.0.0.1:8787/login`        |
| User Registration    | `http://127.0.0.1:8787/register`     |
| Guest Trial          | `http://127.0.0.1:8787/trial`        |
| Email Verification   | `http://127.0.0.1:8787/verify-email` |
| Administrator Portal | `http://127.0.0.1:8787/admin`        |

### 5. Administrator Login

Sign in using the Administrator email and password configured in the private environment, together with the current TOTP code generated by the enrolled authenticator application.

No default Administrator password or MFA secret is bundled with the application or printed in server logs.

---

# Existing Administrator Credential Management

For an existing installation, update:

```text
ADMIN_EMAIL
ADMIN_PASSWORD
ADMIN_TOTP_SECRET
```

in the private `.env` file or protected service environment while preserving the existing:

```text
AUDIT_HMAC_KEY
```

Then run:

```text
npm run admin:update
```

The command:

* Validates the credentials.
* Synchronizes all three Administrator credentials with the existing database.
* Keeps MFA mandatory.
* Preserves Administrator permissions.
* Clears login lockout state.
* Revokes existing Administrator sessions.
* Records the change in the tamper-evident audit log.
* Leaves customer, subscription, payment, and invoice records unchanged.

Enroll the exact `ADMIN_TOTP_SECRET` in an authenticator application before attempting to sign in.

**Never commit Administrator passwords or MFA secrets to GitHub or include them in downloadable source archives.**

---

# Administrator Troubleshooting

If Administrator login fails, run:

```text
npm run admin:diagnose
```

The diagnostic report checks:

* Configured Administrator email
* Password/database synchronization
* MFA configuration
* Account lock status
* Server UTC time
* Standard six-digit TOTP configuration
* Standard 30-second TOTP interval

Sensitive information is never displayed, including:

* Passwords
* MFA secrets
* One-time authentication codes

If an Administrator password or authenticator seed has been exposed, run:

```text
npm run admin:rotate
```

This generates:

* A new random Administrator password
* A new 32-character Base32 MFA seed

The new values are stored only in the private `.env` file.

Enroll the replacement MFA seed in your authenticator application, restart the application, and sign in using the newly generated credentials.

---

# Secret Generation

Generate each security secret independently:

```text
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Generate a fresh Administrator TOTP seed:

```text
node -e "const c=require('node:crypto');console.log([...c.randomBytes(32)].map(v=>'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[v&31]).join(''))"
```

Keep all generated values exclusively in the private `.env` file or an approved managed secret store.

---

# Testing and Security Scanning

Run the test suite:

```text
node --test tests/*.test.mjs
```

Run the dependency and security scan:

```text
npm run security:scan
```

Both should be completed successfully before production deployment.

---

# Production Configuration

Copy the required values from `.env.example` into the production secret manager or protected service environment.

**Never commit real credentials or secrets to the repository.**

When:

```text
NODE_ENV=production
```

the application refuses to start without the required:

* Session secrets
* Audit secrets
* IP-pseudonymization secrets
* Administrator credentials
* TOTP configuration
* CAPTCHA configuration
* Email-verification provider

---

# Backup Management

Create an encrypted backup:

```text
npm run backup:create
```

Verify an existing backup:

```text
npm run backup:verify -- /absolute/path/to/backup.rcbackup
```

Backups should be tested regularly through an isolated restore-verification process.

---

# Production Deployment

Deploy the stateful application to **Railway** behind its managed HTTPS endpoint and configure **Cloudflare DNS** as required.

Refer to:

```text
docs/RAILWAY-CLOUDFLARE-PRODUCTION-v1.7.md
docs/SECURITY-AND-OPERATIONS.md
docs/PRICING-RESEARCH.md
```

### Railway Build Configuration

Railway builds this release using the committed `Dockerfile`.

The npm download cache is mounted at:

```text
/root/.npm
```

outside:

```text
/app/node_modules
```

This prevents npm cache files from interfering with the application dependency directory and avoids the previous:

```text
EBUSY: resource busy or locked,
rmdir '/app/node_modules/.cache'
```

error produced by the previous automatic Nixpacks/Railpack build process.

---

# Printer Configuration

For accurate physical printing, use the following browser print settings:

* **Scale:** 100% / Actual Size
* **Margins:** None
* **Headers and Footers:** Off
* **Pages per Sheet:** 1
* **Two-sided Printing:** Off
* **Fit to Page:** Never

Always perform a plain-paper overlay test before using a new bank template or printer combination.

### Print Profiles

| Profile               | Paper / Cheque Size | Orientation  |
| --------------------- | ------------------- | ------------ |
| Custom Short          | 88.9 × 190.5 mm     | 90° rotation |
| Custom Long           | 190.5 × 88.9 mm     | No rotation  |
| A4 Vertical Carrier   | 210 × 297 mm        | Portrait     |
| A4 Horizontal Carrier | 210 × 297 mm        | Landscape    |

The default calibration values are based on the documented Nepal printer workflow and tray-centering requirements.

* Rotated vertical cheque: **60.55 mm X**
* Horizontal cheque: **9.75 mm X**

Per-user X/Y calibration values are applied as printer-specific corrections to these defaults.

---

# Source Code Structure

* `server.mjs` — single-process Next.js application server. Renders every page
  (landing, auth, guest trial, user panel, administrator panel) and mounts the
  preserved security core in-process for `/api`, `/print`, `/health`, crawler
  guidance and the byte-protected printing assets.
* `core/platform.mjs` — consolidated backend: HTTP/API, authentication, access
  control, trials, billing, VAT, Administrator operations, audit and backups.
* `database.mjs` — database schema, subscription plans, bank templates, audit chain.
* `security.mjs` — password hashing, TOTP, secure cookies, security headers, CSRF,
  CAPTCHA and rate limiting.
* `print-engine.mjs` — amount-to-words conversion, geometry validation, safe-zone
  rendering and print-page generation. `invoice-pdf.mjs`, `invoice-math.mjs`,
  `plan-catalogue.mjs`, `backup-crypto.mjs`, `mfa-crypto.mjs` — invoice PDFs,
  approved pricing/VAT arithmetic, plan catalogue, encrypted backups, MFA secrets.
* `app/` — Next.js App Router pages and design system:
  * `layout.jsx`, `globals.css` — root layout and shared Light/Dark/System tokens.
  * `page.jsx` — public landing page.
  * `login`, `register`, `trial`, `verify-email`, `reset-password`, `admin` — auth + Admin portal.
  * `app/` — authenticated User workspace.
* `components/` — React components: `ui.jsx`, `Captcha.jsx`, `AuthShell.jsx`,
  `AppShell.jsx`, `user/*` (compose, templates, history, subscription, account)
  and `admin/AdminDashboard.jsx`.
* `lib/` — `theme.jsx` (Light/Dark/System), `api.js` (CSRF + device fingerprint),
  `nepal-date.js` (Asia/Kathmandu).
* `scripts/` — startup, admin credential management, backups, env diagnostics,
  plan-price migrations.
* `tests/` — unit tests and full API integration tests (the Next.js production
  build path is exercised by `tests/deployment.test.mjs`).

---

# Privacy and Device Identification

The platform does **not** attempt to access or read a device's MAC address.

Instead, it uses pseudonymous hashes derived from:

* Signed device cookies
* Browser signals
* Network-risk signals

Device fingerprinting is used only as supporting evidence.

It does not replace the platform's other security controls, which include:

* Submitted identity information
* Signed device tokens
* Rate limiting
* CAPTCHA
* Server-side sessions
* IP-risk thresholds
* Security-event monitoring
* Administrator review and controls

---

## Release Status

**Version 1.8.0 is the current commercial release.** It rewrites the entire
application as a modern, responsive, accessible **Next.js (React)** experience —
Landing page, User Panel, Guest Trial Panel and Administrator Panel — with a
cohesive layout system, shared design tokens and **Light / Dark / System** themes.
All approved Version 1.7 functionality is preserved: the server-authoritative
plan catalogue, configurable VAT with immutable invoice snapshots, the 54 bank
templates, precise X/Y calibration, protected single-use print tickets, mandatory
MFA, deny-by-default Administrator permission profiles, idempotent financial
decisions, the append-only audit chain and encrypted backups.

Before accepting real customer payments or sensitive financial records in production, complete the required **printer validation, provider configuration, tax verification, independent penetration testing, security review, backup recovery testing, and production infrastructure review**.
