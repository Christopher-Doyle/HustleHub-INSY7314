# HustleHub+ — INSY7314 Part 2

HustleHub+ is a freelance marketplace for clients and freelancers. Part 2 extends the Part 1 secure backend into the full MERN marketplace flow: authentication, gig listings, client bookings, automatic transaction records, and freelancer income tracking, behind role-based access control.

This repository currently integrates two of the three team areas:

- **Database, authentication & security foundation** (Christopher) — MongoDB, shared models, JWT auth, RBAC, Helmet/CSP, rate limiting.
- **Bookings, transactions, income & testing** (Person 3) — booking creation, automatic transaction records, freelancer income, the React booking/income pages, the Part 2 Postman/Newman collection, and this README's Part 2 sections.

Gig CRUD and the React gig marketplace pages (Daniel) are not implemented yet — see [Team boundaries](#team-boundaries).

## Implemented foundation

- MongoDB connection through Mongoose.
- Shared `User`, `Gig`, `Booking`, and `Transaction` schemas.
- MongoDB-backed registration, login, and protected profile lookup.
- bcrypt password hashing with cost factor 12.
- Signed 15-minute HS256 JWTs with issuer and audience checks.
- Reusable role-based access-control middleware.
- HTTPS, Helmet headers, an explicit Content Security Policy, request limits, and authentication rate limiting.
- Controlled JSON errors that do not expose secrets, hashes, stack traces, or file paths.

## Implemented booking, transaction & income flow

- `POST /api/bookings` — a **client** books a gig. The gig is loaded from MongoDB by id; price and freelancer are copied from that record, never trusted from the request body, so a client cannot submit its own price or freelancer.
- Booking creation is simulated confirmation (no real payment integration, per the Part 2 brief): a successful booking is created with status `confirmed`.
- A linked `Transaction` record (`status: completed`, `amount` copied from the booking) is created automatically in the same flow. If that second write fails, the booking that was just created is deleted rather than left as an orphaned "confirmed" booking with no transaction — see [Known limitations](#known-limitations) for why this is a compensating action rather than a MongoDB multi-document transaction.
- `GET /api/bookings/me` (client) and `GET /api/bookings/freelancer` (freelancer) each filter strictly by the authenticated user's id — never by anything the caller supplies.
- `GET /api/transactions/me` and `GET /api/income/me` (freelancer) return only that freelancer's own completed transactions and their sum.
- A dedicated booking rate limiter (separate from the auth limiter) returns a safe `429` JSON response once the configured threshold is exceeded.
- Tax estimation is explicitly out of scope for Part 2 (it's a Part 3/POE requirement) — `GET /api/income/me` returns totals only.

## Project structure

```text
HustleHub/
  src/
    controllers/            HTTP response handling (auth, bookings, transactions)
    middleware/              authentication, RBAC, validation, rate limits, errors
    models/                   shared Mongoose models
    routes/                    Express route definitions
    services/                   authentication, booking, and transaction/income logic
    utils/                       shared HTTP helpers
    app.cjs                       Express, security, and route configuration
    config.cjs                    environment validation
    database.cjs                  MongoDB connection lifecycle
    server.cjs                    HTTPS server startup
  scripts/
    setup.cjs                     generates .env and local HTTPS certs
    seed-dev-gigs.cjs             dev-only: seeds a demo freelancer + gigs directly in MongoDB
    build-collection.cjs          generates the Part 2 Postman collection
    run-postman.cjs               runs the collection through Newman, saves evidence/
  test/
    api.test.cjs                  auth/security tests
    bookings.test.cjs             booking/transaction/income/RBAC/rate-limit tests
    models.test.cjs               shared schema tests
  postman/                  generated Postman collections (Part 1 + Part 2)
  evidence/                 Newman run output (generated, git-ignored)
  certs/                    local generated certificates are ignored
  client/                   React frontend (Vite) — see "React client" below
  .env.example
```

## Requirements

- Node.js 24 or newer
- npm
- MongoDB Atlas or a local MongoDB instance
- Git for Windows/OpenSSL for local certificate generation

## Environment and setup

Install the locked dependencies and generate local configuration and HTTPS certificates:

```powershell
npm.cmd ci
npm.cmd run setup
```

Setup creates `.env`, `certs/localhost.pem`, and `certs/localhost-key.pem` when needed. Existing secrets and complete certificate pairs are preserved. Do not commit `.env` or private keys.

Required variables are documented in `.env.example`:

```dotenv
PORT=4000
HOST=127.0.0.1
JWT_SECRET=replace_with_at_least_64_hexadecimal_characters
MONGODB_URI=replace_with_mongodb_connection_string
MONGODB_DNS_SERVERS=
```

For MongoDB Atlas, replace `MONGODB_URI` in the local `.env` with the Atlas connection URI. Keep credentials only in `.env`. Atlas must allow the developer's current IP address and the database user must have suitable access. A normal `mongodb://` or `mongodb+srv://` URI is accepted.

`MONGODB_DNS_SERVERS` is optional. Leave it blank normally. If Node cannot resolve Atlas SRV records even though the operating system can, set it to trusted comma-separated DNS server IP addresses, for example `1.1.1.1,8.8.8.8`.

Start the HTTPS API:

```powershell
npm.cmd start
```

The default address is `https://localhost:4000`. Startup fails closed if the JWT secret or MongoDB URI is missing or invalid, or if MongoDB cannot be reached.

## Database architecture

`src/database.cjs` owns the reusable Mongoose connection lifecycle. `src/server.cjs` connects before accepting requests and disconnects during graceful shutdown.

The shared models are:

- `User`: full name, canonical unique email, hidden password hash, and `client`, `freelancer`, or `admin` role.
- `Gig`: freelancer reference, title, description, category, and non-negative price.
- `Booking`: gig, client, and freelancer references; price; and controlled status.
- `Transaction`: booking, gig, client, and freelancer references; amount; and controlled status.

Schemas provide required fields, enums, references, bounds, timestamps, and common query indexes. They deliberately contain no Gig CRUD, booking, transaction, or income business logic.

## Authentication flow

### Registration

`POST /api/auth/register` validates a strict JSON object, canonicalises the email, rejects unknown fields and public admin registration, hashes the password, and creates the MongoDB user. Only safe public fields are returned.

Public roles are `client` and `freelancer`. Administrative users must be provisioned through a separate trusted process rather than public registration.

### Login

`POST /api/auth/login` looks up the canonical email and compares the submitted password with the stored bcrypt hash. Unknown accounts and wrong passwords use the same safe `401` response. A successful login returns a short-lived Bearer token and safe user fields.

### Protected profile

`GET /api/auth/me` verifies the Bearer token's signature, expiry, HS256 algorithm, issuer, audience, subject, and claims. It then reloads the current user from MongoDB and confirms the stored role still matches the token.

## Role-based access control

Authentication answers who the user is. `requireRole` then checks whether that authenticated user has an allowed role:

```js
router.post('/example', protect(User, config), requireRole('freelancer'), controller);
```

- Missing authentication returns `401 UNAUTHENTICATED`.
- An authenticated user with the wrong role returns `403 FORBIDDEN`.
- Multiple roles can be allowed, for example `requireRole('freelancer', 'admin')`.

Future Gig, booking, and admin routes should compose authentication before RBAC.

## Security controls

- Passwords are never stored in plaintext; only bcrypt hashes are persisted.
- Password input is limited to 72 UTF-8 bytes to avoid silent bcrypt truncation.
- JWT verification pins HS256 and checks expiry, issuer, and audience.
- Protected requests reload the account instead of trusting token claims alone.
- Authentication endpoints are limited to 30 attempts per IP per 15 minutes by default.
- JSON request bodies are limited to 10 KB and compressed bodies are rejected.
- Responses use `Cache-Control: no-store` and request IDs.
- Helmet supplies security headers and removes framework-identifying headers.
- CSP defaults content, scripts, styles, and connections to the same origin; objects and framing are blocked.
- Validation rejects unknown keys, nested privilege input, incorrect types, malformed JSON, and unsupported content types.

The CSP is intentionally strict for the current API. When the React client origin and production asset sources are known, add only those explicit origins to the relevant directives; do not disable CSP.

## Tests

Run all backend tests with:

```powershell
npm.cmd test
```

Tests use `mongodb-memory-server`, a recognised development-only package, to create an isolated temporary MongoDB. They never connect to Atlas or team data. Coverage includes MongoDB registration and login, hash storage, duplicate users, public roles, rejected admin registration, JWT behavior, protected profile lookup, invalid tokens and inputs, RBAC outcomes, security headers/CSP, safe errors, rate limiting, and shared schema validation (`test/api.test.cjs`, `test/models.test.cjs`), plus booking creation, server-side price/freelancer derivation, automatic transaction creation, client/freelancer ownership isolation, freelancer income totals, invalid/forged booking input, and the booking rate limiter (`test/bookings.test.cjs`).

Run the frontend's automated tests with:

```powershell
cd client
npm.cmd test
```

These use Vitest + React Testing Library against the booking and freelancer-income pages: rendering real API data, empty states, retryable error states, and user interactions (looking up a gig, confirming a booking, retrying a failed request) — not just a single render smoke test.

### Postman / Newman

The Part 2 collection lives at `postman/HustleHub-Part2.postman_collection.json` and is generated by `scripts/build-collection.cjs` (regenerate with `npm.cmd run postman:build` after changing it — the JSON file is generated output, not hand-edited). Run it end-to-end with:

```powershell
npm.cmd run test:postman
```

This single command seeds a demo gig directly into MongoDB (`scripts/seed-dev-gigs.cjs`, so the collection never needs a manually copy-pasted gig id), starts two isolated local HTTPS servers, runs the full collection through Newman, and writes a run summary to `evidence/postman-run.json` (git-ignored; re-generate it, don't commit a stale copy).

The collection has six folders: **01 Authentication** (Part 1's coverage, regenerated here), **02 Gigs** (Daniel's — a thin smoke section against the locked contract; expected to return 404 until `gigRoutes.cjs` is merged), **03 Bookings**, **04 Transactions & Income**, **05 RBAC & Security**, and **06 Rate limiting demonstration** (runs against a second, isolated server with a deliberately tiny limit so it passes deterministically regardless of how much booking traffic happened earlier in the run). Folders 01 and 03–06 should all pass today; folder 02 will pass once Daniel's gig endpoints are merged.

To explore the collection manually in the Postman app instead: run `npm.cmd run seed:dev`, import `postman/HustleHub-Part2.postman_collection.json`, set the `gigId` collection variable to one of the ids the seed script prints, trust `certs/localhost.pem`, and run requests from the top.

## Current API endpoints

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| `GET` | `/api/health` | Health check | No |
| `POST` | `/api/auth/register` | Register client or freelancer | No |
| `POST` | `/api/auth/login` | Log in and obtain JWT | No |
| `GET` | `/api/auth/me` | Return current MongoDB user | Bearer JWT |
| `POST` | `/api/bookings` | Client books a gig; creates a linked transaction | Bearer JWT (client) |
| `GET` | `/api/bookings/me` | Client's own booking history | Bearer JWT (client) |
| `GET` | `/api/bookings/freelancer` | Bookings for the freelancer's own gigs | Bearer JWT (freelancer) |
| `GET` | `/api/transactions/me` | Freelancer's own transaction history | Bearer JWT (freelancer) |
| `GET` | `/api/income/me` | Freelancer's income summary (total, count) | Bearer JWT (freelancer) |
| `GET` | `/api/gigs`, `/api/gigs/:id`, `POST/PATCH/DELETE /api/gigs/:id` | Gig marketplace (Daniel) | *Not yet implemented* |
| `GET` | `/api/admin/overview` | Admin overview (Christopher) | *Not yet implemented* |

## React client

`client/` is a minimal Vite + React app. The booking and freelancer-income pages (`client/src/pages/Bookings/*`, `client/src/pages/Freelancer/*`) are fully implemented and talk to the real API above. `client/src/auth/*` (login/register/auth state) is a **temporary, intentionally minimal scaffold** so these pages have something to authenticate against before Christopher's full auth UI lands — it works, but is his to replace. There is no Gigs browse page yet (that's Daniel's `client/src/pages/Gigs/*`); instead, `/book` and `/book/:gigId` accept a gig id directly — paste one printed by `npm.cmd run seed:dev`, or a real one once Daniel's create-gig flow exists.

```powershell
cd client
npm.cmd install
npm.cmd run dev
```

Open the printed `http://localhost:5173` URL. The dev server proxies `/api/*` to the HTTPS backend on `:4000` (see `vite.config.js`), so the backend must be running (`npm.cmd start` in the repo root) and MongoDB reachable. The proxy also means the browser never needs to trust the backend's self-signed certificate or deal with CORS — both are local-dev problems the proxy avoids, not production configuration.

## Known limitations

- **No MongoDB multi-document transaction for booking + transaction creation.** `mongodb-memory-server` (used in tests) and a standalone MongoDB instance do not support multi-document ACID transactions without a replica set. `bookingService.cjs` instead uses an explicit compensating action: if creating the linked `Transaction` fails, the just-created `Booking` is deleted rather than left orphaned. This is documented in code and covered by a test that forces the failure path.
- **The "02 Gigs" Postman folder and `/book` page depend on Daniel's gig endpoints**, which are not merged into this repository yet. Bookings themselves do not depend on his API — `bookingService.cjs` reads the `Gig` model directly — only the Postman smoke requests and the React gig-lookup flow do.
- **`client/src/auth/*` is a temporary scaffold**, not the final auth UI (see "React client" above).
- Tax estimation is a Part 3 (POE) requirement and is intentionally not implemented in `GET /api/income/me`.

## Team boundaries

This repository does not yet claim completion of:

- Gig CRUD, Gig ownership logic, or the Gig React marketplace pages (`client/src/pages/Gigs/*`) — Daniel.
- The final auth UI, role-aware navigation polish, and the Admin overview page (`client/src/pages/Admin/*`) — Christopher; `client/src/auth/*` here is a temporary scaffold (see "Known limitations").
- Final integrated Newman evidence covering all three areas together, final README security review, Docker, CI/CD, logging, and tax estimation — Part 3 (POE) work, out of scope for Part 2 by design.

Implemented in this repository: MongoDB/models/JWT/RBAC/Helmet/CSP/auth rate limiting (Christopher), and the full booking → transaction → freelancer income flow, its React pages, its Postman/Newman coverage, and this README's Part 2 sections (Person 3).
