# API Documentation

## Overview

RESTful API endpoints organized under `/api/`.

## Endpoints

- `/api/auth` — Authentication (login, register, refresh, logout)
- `/api/users` — User management
- `/api/organizations` — Organization CRUD
- `/api/cheques` — Cheque job operations
- `/api/templates` — Template management
- `/api/banks` — Bank directory
- `/api/subscriptions` — Subscription management
- `/api/payments` — Payment processing
- `/api/uploads` — File uploads
- `/api/support` — Support tickets
- `/api/admin` — Admin operations

## Authentication

All protected endpoints require a valid session cookie.

## Rate Limiting

API endpoints are rate-limited per IP address.
