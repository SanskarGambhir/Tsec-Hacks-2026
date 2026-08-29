# Cooper

Group finance for people who share money: pooled group wallets, expense
splitting, AI bill scanning, real-time group chat, and friend invites over
email and WhatsApp.

## Architecture

Three services:

| Service | Stack | Responsibility |
|---|---|---|
| `client/` | React 19, Vite 7, Tailwind 4, shadcn/ui | The web app (also a PWA) |
| `server/` | Express 4, Mongoose 9, Socket.IO 4 | API, auth, payments, all business logic |
| `genai/` | FastAPI, LangGraph, DeepSeek via HuggingFace | Standalone conversational AI |

The client talks to the server over REST and a Socket.IO connection. The server
owns MongoDB and integrates Razorpay (payments), Twilio (OTP and WhatsApp),
Gemini (bill parsing and spending insights) and SMTP (transactional email).

> The `genai/` service works but nothing currently calls it — AI insights are
> served by Gemini from inside `server/`. Wire it up or delete it.

## How the money model works

Two balances, and one invariant that ties them together.

**Personal wallet** (`UserWallet`) — a user's own money. It only ever increases
through a Razorpay payment whose signature the server has verified. There is no
endpoint that credits a balance on request.

**Group wallet** (`GroupWallet`) — a group's pooled money, held as:

- `balance` — the group total
- `memberBalances[]` — each member's share of that total

The invariant is `balance === sum(memberBalances)`. Every movement preserves it:

| Action | Effect |
|---|---|
| Add funds to group | personal wallet down, group total + own share up |
| Log an expense | group total + each charged member's share down |
| Withdraw credits | group total + own share down, personal wallet up |
| Reallocate to member | one share down, another up, total unchanged |
| Leave a group | remaining share refunded to the personal wallet |

All of this goes through [`server/src/utils/ledger.js`](server/src/utils/ledger.js).
Every helper puts its solvency guard inside the query filter, so MongoDB applies
the check and the update atomically and concurrent requests cannot overdraw a
balance. **Never mutate a balance field directly.**

Expense division — `even`, `custom`, `exclude` — is computed in one place,
[`computeMemberCharges`](server/src/utils/splitEngine.js), used by both the
quick "log expense" path and the detailed payment path.

## Setup

Requires Node 20+, Python 3.11+ (for `genai`), and a MongoDB instance.

```bash
git clone <repo> && cd "Tsec Hacks 2026"
```

### Server

```bash
cd server && npm install && cp .env.example .env
```

Fill in `.env` — the server refuses to start without the core variables, and
logs which optional features are disabled. Then:

```bash
npm run dev
```

### Client

```bash
cd client && npm install && cp .env.example .env
```

`VITE_RAZORPAY_KEY_ID` must match `RAZORPAY_KEY_ID` on the server or checkout
opens against the wrong merchant account.

```bash
npm run dev
```

### GenAI (optional)

```bash
cd genai && pip install -r requirements.txt
HF_TOKEN=<your-token> uvicorn app.main:app --reload --port 8001
```

`GET /health` reports whether a model is actually configured.

## Auth

Sessions are httpOnly cookies — an access token and a rotating refresh token.
Nothing about the session is written to `localStorage`, so injected script has
no token to steal. The client refreshes automatically on a 401 and redirects to
login only when the refresh itself fails.

Signing up requires phone verification via Twilio OTP before the first login.
Email verification is separate and does not gate access.

## Security notes

- Every mutating route is authenticated, validated and rate limited.
- Socket.IO connections are authenticated in the handshake, and joining a group
  room requires actual membership of that group.
- PAN numbers are stored as a keyed HMAC plus the last four characters, never
  in the clear. Set a dedicated `PAN_HASH_SECRET`.
- Login, password reset and OTP endpoints return the same response whether or
  not the account exists, so they cannot be used to enumerate users.
- Razorpay amounts are always read from the server's own pending transaction
  row, never from the request body.

## Known gaps

- `expenses` and `messages` are embedded in the `Group` document. Messages are
  capped at 500 per group to stay under MongoDB's 16MB limit, but both should
  become their own collections before the app carries real volume.
- No automated tests.
- No CI, Dockerfile, or deployment config.
