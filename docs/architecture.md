# Architecture

## Overview

Reactify Cheque Printer System is a multi-tenant SaaS application for printing Nepalese bank cheques.

## System Architecture

- **Web App** (`apps/web`): Customer-facing Next.js application with i18n
- **Admin Panel** (`apps/admin`): Administrative dashboard
- **Worker** (`apps/worker`): Background job processor

## Data Flow

1. User selects bank and cheque template
2. Enters cheque details (payee, amount, date)
3. System validates data and generates amount in words
4. Preview and calibration
5. Print via browser print API
6. Save to print history

## Security

- Argon2id password hashing
- Two-factor authentication
- RBAC with organization-level permissions
- Encrypted data at rest
- Audit logging for all mutations
