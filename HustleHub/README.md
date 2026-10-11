# HustleHub+ — INSY7314 Part 2

HustleHub+ is a secure freelance marketplace where freelancers publish Gigs and clients book them. A confirmed booking automatically creates a transaction, and freelancers can review related bookings, transaction history and income. The integrated Part 2 submission includes a React frontend, Express HTTPS API, MongoDB persistence, JWT authentication, role-based access control, automated tests, Postman/Newman regression testing and a reproducible OWASP ZAP workflow.

## Implemented functionality

- Client and freelancer registration; public admin registration is prohibited.
- Secure login, short-lived JWTs, profile restoration and complete logout.
- Public Gig browsing, search, filtering, pagination and detail views.
- Freelancer-only Gig creation, own-Gig listing, editing and deletion.
- Server-enforced Gig ownership and role restrictions.
- Client-only booking with price and freelancer derived from the stored Gig.
- Automatic completed transaction creation after booking confirmation.
- User-scoped client bookings, freelancer bookings, transactions and income.
- Protected administrator overview with safe aggregate platform counts.
- Responsive role-aware React interface with loading, empty, success and error states.

## Technology stack

| Area | Technology |
|---|---|
| API | Node.js, Express 5, HTTPS |
| Data | MongoDB Atlas or MongoDB, Mongoose |
| Authentication | bcryptjs, JSON Web Tokens |
| Security | Helmet, restrictive CSP, explicit CORS allowlist, rate limiting, strict validation |
| Frontend | React 18, React Router 7, Vite |
| Tests | Node test runner, mongodb-memory-server, Vitest, Testing Library |
| API regression | Postman collection and Newman |
| Dynamic security | OWASP ZAP workflow using the official Docker image |

Node.js 24 or later is required by this project and its current test dependencies.

## Architecture

The backend uses a layered flow:

```text
HTTPS request
  → security middleware / authentication / role checks / validation
  → route
  → controller
  → service
  → Mongoose model
  → safe response envelope
```

The React application uses one authoritative session store for the JWT and public user profile. All protected API requests read that same token. Frontend role checks control the user experience only; backend JWT, database role and ownership checks are authoritative.

## Roles

### Client

- Browse and view Gigs.
- Book a Gig.
- View only their own bookings.
- Cannot create or modify Gigs.
- Cannot access freelancer income or administration.

### Freelancer

- Browse Gigs.
- Create, edit and delete only their own Gigs.
- View bookings associated with their own Gigs.
- View only their own transactions and income.
- Cannot create client bookings or access administration.

### Administrator

- View safe aggregate counts for users, roles, Gigs, bookings and transactions.
- Cannot be created through public registration.
- Must be deliberately provisioned by an authorised operator.

To create an administrator, set temporary process variables and run the provisioning command. Do not add these variables to `.env` or commit their values:

```powershell
$env:ADMIN_NAME='HustleHub Administrator'
$env:ADMIN_EMAIL='admin@example.com'
$env:ADMIN_PASSWORD='<strong unique password>'
npm.cmd run admin:create
Remove-Item Env:ADMIN_NAME,Env:ADMIN_EMAIL,Env:ADMIN_PASSWORD
```

The command stores only a bcrypt cost-12 hash and does not print the password.

## Security controls

- bcrypt cost factor 12; plaintext passwords are never stored.
- Authentication failures use a uniform response and a dummy hash comparison.
- HS256 JWT algorithm pinning, issuer, audience, expiry and claim validation.
- Authenticated users are reloaded from MongoDB so current roles remain authoritative.
- Public registration permits only `client` and `freelancer`.
- Explicit field allowlists reject mass assignment and ownership overrides.
- Scalar/type, length, ObjectId, price, decimal and query validation.
- Operator objects, arrays, markup/control characters, unknown fields, `NaN`, infinity and negative prices are rejected.
- Gig ownership is verified before updates/deletes and repeated in the database mutation filter.
- Booking price, client and freelancer identities are derived server-side.
- Authentication rate limit: 30 requests per IP per 15 minutes.
- Booking mutation rate limit: 20 requests per IP per 15 minutes.
- Gig mutation rate limit: 60 requests per IP per 15 minutes.
- Rate-limit responses include a controlled body, standard headers and `Retry-After`.
- Helmet removes technology disclosure and applies HSTS, MIME sniffing protection, frame protection and a restrictive CSP.
- `Cache-Control: no-store` is applied to API responses.
- HTTP requests are rejected with `426`; TLS 1.2 or later is required by the server.
- Cross-origin requests are allowed only from configured exact origins; wildcard credentialed CORS is not used.
- Error responses do not expose stack traces, database URIs or implementation paths.

The default CSP uses same-origin `default-src`, `script-src`, `style-src` and `connect-src`, with `object-src 'none'` and `frame-ancestors 'none'`. During development, Vite proxies `/api` to the HTTPS backend, so browser API traffic remains same-origin. For a separately hosted production frontend, set `VITE_API_BASE_URL`, list its exact origin in `CLIENT_ORIGINS`, and extend `connect-src` deliberately rather than using `*`.

## Environment configuration

Copy `.env.example` to `.env` or run the setup script. Never commit `.env`.

| Variable | Purpose |
|---|---|
| `PORT` | HTTPS API port; default `4000` |
| `HOST` | Bind host; default `127.0.0.1` |
| `JWT_SECRET` | At least 64 hexadecimal characters |
| `MONGODB_URI` | MongoDB Atlas `mongodb+srv://` or local MongoDB URI |
| `MONGODB_DNS_SERVERS` | Optional comma-separated DNS resolver IPs for SRV environments |
| `CLIENT_ORIGINS` | Exact comma-separated browser origins allowed by CORS |

The frontend optionally supports `VITE_API_BASE_URL`; local development should leave it blank and use the Vite proxy.

## HTTPS setup

From the project folder:

```powershell
npm.cmd run setup
```

The script preserves existing environment values, creates missing safe defaults, and generates:

```text
.env
certs/localhost.pem
certs/localhost-key.pem
```

Certificates and private keys are ignored by Git. OpenSSL on PATH is used first; the script can also locate Git for Windows OpenSSL.

## Install and run

Backend terminal:

```powershell
npm.cmd ci
npm.cmd run setup
npm.cmd start
```

Frontend terminal:

```powershell
cd client
npm.cmd ci
npm.cmd run dev
```

Open `http://localhost:5173`. The frontend proxy forwards `/api` requests to `https://localhost:4000` and accepts the local development certificate only for that server-to-server proxy hop.

## Application workflow

1. Register a freelancer and log in.
2. Open **My gigs**, create a Gig, and optionally edit it.
3. Log out and register or log in as a client.
4. Browse the marketplace and open the Gig detail page.
5. Select **Book this gig** and confirm the booking.
6. The API stores a confirmed booking and automatically creates a completed transaction.
7. The client sees the booking under **My bookings**.
8. The freelancer sees the related booking, transaction and updated income.

Data persists in the configured MongoDB database and survives API restarts.

## API routes

| Method and path | Access | Purpose |
|---|---|---|
| `GET /api/health` | Public | API health |
| `POST /api/auth/register` | Public | Register client/freelancer |
| `POST /api/auth/login` | Public | Authenticate |
| `GET /api/auth/me` | Authenticated | Current profile |
| `GET /api/gigs` | Public | Browse/search Gigs |
| `GET /api/gigs/:id` | Public | Gig detail |
| `GET /api/gigs/mine` | Freelancer | Own Gigs |
| `POST /api/gigs` | Freelancer | Create Gig |
| `PATCH /api/gigs/:id` | Owning freelancer | Edit Gig |
| `DELETE /api/gigs/:id` | Owning freelancer | Delete Gig |
| `POST /api/bookings` | Client | Book a Gig and create transaction |
| `GET /api/bookings/me` | Client | Own bookings |
| `GET /api/bookings/freelancer` | Freelancer | Related bookings |
| `GET /api/transactions/me` | Freelancer | Own transactions |
| `GET /api/income/me` | Freelancer | Own income summary |
| `GET /api/admin/overview` | Admin | Safe platform totals |

The validated OpenAPI 3.0.3 definition is in `docs/openapi.yaml`.

## Automated tests

Backend tests use HTTPS and isolated `mongodb-memory-server` databases:

```powershell
npm.cmd test
```

The suite covers authentication, hashing, JWT validation, CORS, headers, Gig CRUD, ownership, malicious input, booking, transaction, income, admin RBAC and rate limits.

Frontend tests:

```powershell
cd client
npm.cmd test
```

They cover API handling, validation, Gig marketplace and management interactions, booking and income states.

Production build:

```powershell
cd client
npm.cmd run build
```

## Postman and Newman

Regenerate and run the six-folder Part 2 collection:

```powershell
npm.cmd run postman:build
npm.cmd run test:postman
```

The collection folders are:

1. Authentication
2. Gig Marketplace
3. Gig Ownership and RBAC
4. Bookings
5. Transactions and Income
6. Security and Error Cases

The Newman runner starts isolated HTTPS APIs backed by `mongodb-memory-server`, generates disposable roles/data, and destroys the entire temporary database in `finally`. It does not connect to team Atlas. A minimal private summary is written under ignored `evidence/private/`; no bearer token or password is included.

## Atlas persistence smoke test

With a valid Atlas URI in the ignored `.env` file:

```powershell
npm.cmd run smoke:atlas
```

This performs the complete freelancer → Gig → client booking → transaction → income flow, proves cross-owner denial and restart persistence, then deletes only its tracked disposable records and verifies cleanup.

## OWASP ZAP security testing

Read `docs/SECURITY-TESTING.md` before running dynamic scans. The safe workflow is:

```powershell
npm.cmd run openapi:validate
npm.cmd run security:server
```

Then, in another terminal with Docker Desktop running:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/run-zap.ps1
```

The scan script targets only the isolated port-4040 API and stores raw reports under ignored `evidence/private/zap/`. The current sanitised execution-status note is `evidence/security/zap-summary.md`. It accurately records that ZAP could not be run on the verification workstation while the Docker engine was unavailable; it does not claim fabricated results.

## Dependency auditing

Production dependencies only:

```powershell
npm.cmd audit --omit=dev
cd client
npm.cmd audit --omit=dev
```

Development-only advisories, where present, should be assessed separately because Newman and test tooling are not shipped with the runtime application. Do not use `npm audit fix --force` without compatibility testing.

## Evidence policy

- Sanitised, reviewed submission evidence may be committed under `evidence/security/`.
- Raw Postman/ZAP output belongs under `evidence/private/` and is ignored.
- Generated root-level JSON evidence is ignored to prevent verification runs from dirtying Git.
- Never commit `.env`, credentials, private keys, passwords or bearer tokens.

## Known limitations

- Booking and transaction creation use a compensating delete when transaction creation fails because `mongodb-memory-server` and standalone MongoDB do not provide replica-set transactions. A production Atlas deployment can migrate this operation to a Mongoose session transaction.
- Admin accounts require deliberate operator provisioning; there is intentionally no public admin registration path.
- ZAP reports still need to be executed and reviewed on a workstation with Docker Desktop running. No ZAP vulnerability result is claimed until then.
- The latest Newman release still brings 19 audit findings through its development-only Postman runtime dependency tree. Both production runtime audits are clean, Newman runs only against the disposable local harness, and no unsafe forced downgrade was applied.

## Team contribution summary

The repository history preserves the three integrated workstreams: authentication/security foundations, Gig marketplace functionality and booking/transaction/income functionality. Final integration work connects those existing contributions, adds verification/security tooling and polishes the shared application without removing team functionality.
