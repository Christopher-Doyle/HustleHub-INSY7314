# HustleHub+ — INSY7314 Part 2

HustleHub+ is a freelance marketplace for clients and freelancers. This branch contains the shared Part 2 database, authentication, role-based access control, and backend security foundation. Gig CRUD, booking workflows, transaction workflows, income calculations, and the React interface are separate team responsibilities and are not implemented here.

## Implemented foundation

- MongoDB connection through Mongoose.
- Shared `User`, `Gig`, `Booking`, and `Transaction` schemas.
- MongoDB-backed registration, login, and protected profile lookup.
- bcrypt password hashing with cost factor 12.
- Signed 15-minute HS256 JWTs with issuer and audience checks.
- Reusable role-based access-control middleware.
- HTTPS, Helmet headers, an explicit Content Security Policy, request limits, and authentication rate limiting.
- Controlled JSON errors that do not expose secrets, hashes, stack traces, or file paths.

## Project structure

```text
HustleHub/
  src/
    controllers/          HTTP response handling
    middleware/           authentication, RBAC, validation, errors
    models/               shared Mongoose models
    routes/               Express route definitions
    services/             authentication business logic
    utils/                shared HTTP helpers
    app.cjs               Express and security configuration
    config.cjs            environment validation
    database.cjs          MongoDB connection lifecycle
    server.cjs            HTTPS server startup
  scripts/
  test/
  postman/
  certs/                  local generated certificates are ignored
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

Tests use `mongodb-memory-server`, a recognised development-only package, to create an isolated temporary MongoDB. They never connect to Atlas or team data. Coverage includes MongoDB registration and login, hash storage, duplicate users, public roles, rejected admin registration, JWT behavior, protected profile lookup, invalid tokens and inputs, RBAC outcomes, security headers/CSP, safe errors, rate limiting, and shared schema validation.

The existing Part 1 Postman collection remains under `postman/`. Final Part 2 Newman/evidence work belongs to the relevant team member and is not claimed here.

## Current API endpoints

| Method | Endpoint | Purpose | Authentication |
|---|---|---|---|
| `GET` | `/api/health` | Health check | No |
| `POST` | `/api/auth/register` | Register client or freelancer | No |
| `POST` | `/api/auth/login` | Log in and obtain JWT | No |
| `GET` | `/api/auth/me` | Return current MongoDB user | Bearer JWT |

## Team boundaries

This branch provides models and security primitives for the team. It does not claim completion of:

- Booking or transaction workflows.
- Freelancer income calculations.
- Booking/transaction React components.
- Final Newman evidence.

## Gig marketplace (API and React client)

Freelancers create and manage their own gigs; anyone can browse them. The gig feature spans `src/` (API) and `client/` (React).

### Gig API

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| `GET` | `/api/gigs` | Public | Browse gigs. Query: `search`, `category`, `page`, `limit` (max 50) |
| `GET` | `/api/gigs/:id` | Public | View one gig |
| `GET` | `/api/gigs/mine` | Freelancer | List only the authenticated freelancer's gigs |
| `POST` | `/api/gigs` | Freelancer | Create a gig |
| `PATCH` | `/api/gigs/:id` | Gig owner | Update own gig (any subset of the four fields) |
| `DELETE` | `/api/gigs/:id` | Gig owner | Delete own gig (`204`) |

Request body for create and update: `title` (3-120), `description` (10-2000), `category` (2-80), `price` (number, 0-1,000,000, at most 2 decimals).

Code layout: `routes/gigRoutes.cjs` (middleware chain) -> `controllers/gigController.cjs` (HTTP) -> `services/gigService.cjs` (business rules, ownership, queries) with `middleware/validateGigInput.cjs` for input handling.

### Gig security and ownership

- **Authentication and role:** write routes run `protect` (JWT) and then `requireRole('freelancer')`.
- **Ownership:** `freelancerId` is always taken from the authenticated user, never from the request. Update and delete load the gig and return `403 FORBIDDEN` for another freelancer. The write query repeats the owner filter so a concurrent change cannot bypass the check.
- **Validation:** only `title`, `description`, `category` and `price` are accepted. Unknown fields (`freelancerId`, `_id`, `role`, timestamps), non-string text, operator objects such as `{"$gt": ""}`, markup characters (`<`, `>`), control characters and invalid prices return `400 VALIDATION_ERROR`.
- **Safe queries:** search text is regex-escaped; query parameters must be single strings or whole numbers; malformed ids return `400 INVALID_ID` and missing gigs return `404 GIG_NOT_FOUND`.
- **Safe output:** responses contain only public gig fields, with the freelancer reduced to `id` and `fullName`. Errors follow the shared JSON error contract and never include stack traces or database details.

### React client

The client lives in `client/` (React, React Router, Vite, Vitest + Testing Library).

```powershell
cd client
npm.cmd install
npm.cmd run dev
```

The dev server runs at `http://localhost:5173` and proxies `/api` to the HTTPS API at `https://localhost:4000` (override with the `VITE_API_TARGET` environment variable). Start the API first with `npm.cmd start` in the project root.

| Route | Who | Purpose |
|---|---|---|
| `/gigs` | Everyone | Browse with search, category filter and pagination |
| `/gigs/:id` | Everyone | Gig detail |
| `/my-gigs` | Freelancer | Own gigs with edit and delete |
| `/my-gigs/new` | Freelancer | Create a gig |
| `/my-gigs/:id/edit` | Freelancer (owner) | Edit a gig |

- `src/services/gigApi.js` is the single module for gig requests. It attaches the Bearer token only to protected calls and converts failures into friendly messages.
- Forms validate on the client with the same rules as the API and show errors next to the relevant field; server validation errors are mapped back to fields. The submit button is disabled while saving.
- Pages show loading, empty and error states. Deleting requires confirmation and the list is refreshed from the API afterwards.
- All user content is rendered as escaped text. Role checks in the UI only hide actions; the API remains the security boundary.
- The login flow must call `setToken(token)` from `client/src/services/tokenStore.js` and `setSessionUser(user)` from `client/src/services/session.js` after a successful login, and `clearToken()` / `clearSessionUser()` on logout.

### Gig tests

```powershell
npm.cmd test                 # backend, includes test/gigs.test.cjs (20 gig API tests)
cd client
npm.cmd test                 # frontend component and interaction tests (65 tests)
```

Backend gig tests cover browse, search, pagination, detail, My Gigs isolation, freelancer-only creation, owner update and delete, `403` for other freelancers and clients, `401` without a token, price and text validation, mass assignment, operator and script-style input, and safe error responses. Frontend tests cover the gig card, validation rules, browse and detail pages, the create and edit form, delete confirmation, role-aware access and the API client.
