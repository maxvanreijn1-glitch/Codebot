# Codebot - AI Code Generator & Circuit Builder

An intelligent platform powered by Claude (Anthropic) that generates code from natural language, builds circuits visually (TinkerCAD-style), and provides GitHub Copilot-like code assistance.

## What It Does

- **AI Code Generation** – Describe what you want; Claude writes the code (streaming output)
- **AI Circuit Generation** – Describe a circuit; Claude generates a visual layout with components and wires
- **Circuit Builder** – TinkerCAD-like canvas: drag components, draw wires, zoom/pan, undo/redo
- **Arduino Assistant** – Chat with an Arduino expert, generate sketches, troubleshoot issues
- **Code Analysis** – GitHub-style diff viewer with actionable suggestions
- **Subscription Payments** – Stripe Checkout (Pro £20/month, Premium £100/month)

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- [Anthropic API Key](https://console.anthropic.com/)
- [Stripe Account](https://stripe.com/) (for payments)

## Installation

### 1. Clone and install dependencies

```bash
git clone <YOUR_REPO_URL>
cd Codebot

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### 2. Set up environment variables

```bash
# Copy the example and fill in your values
cp .env.example server/.env
# Edit server/.env
```

Key variables to fill in (`server/.env`):

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `ANTHROPIC_API_KEY` | Claude API key from Anthropic Console |
| `STRIPE_SECRET_KEY` | Stripe secret key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_ID_PRO` | Stripe price ID for £20/month Pro plan |
| `STRIPE_PRICE_ID_PREMIUM` | Stripe price ID for £100/month Premium plan |
| `CLIENT_URL` | Frontend URL for Stripe redirects (e.g. `http://localhost:5173`) |

For the client, create `client/.env.local`:

```env
VITE_STRIPE_PRICE_ID_PRO=price_...
VITE_STRIPE_PRICE_ID_PREMIUM=price_...
```

### 3. Set up the database

```bash
# Create the database
createdb codebot

# Run the schema
cd server
psql -d codebot -f src/db/schema.sql

# Apply migrations
psql -d codebot -f src/db/migrations/001_create_local_repos.sql
psql -d codebot -f src/db/migrations/002_create_pull_requests.sql
psql -d codebot -f src/db/migrations/003_create_suggestions.sql
psql -d codebot -f src/db/migrations/004_create_command_logs.sql
psql -d codebot -f src/db/migrations/005_add_security_indexes.sql
psql -d codebot -f src/db/migrations/006_add_password_reset.sql
psql -d codebot -f src/db/migrations/007_add_generation_usage.sql
```

> Or use Docker: `docker-compose up -d` starts PostgreSQL automatically.

### 4. Run in development

```bash
# Terminal 1: Start backend (port 5000)
cd server && npm run dev

# Terminal 2: Start frontend (port 5173)
cd client && npm run dev
```

Open **http://localhost:5173**

## Stripe Webhook Setup

For subscriptions to update correctly, forward Stripe webhooks to your local server:

```bash
stripe listen --forward-to http://localhost:5000/api/stripe/webhook
```

Events handled:
- `checkout.session.completed` → upgrade user plan
- `customer.subscription.deleted` → downgrade to free
- `invoice.paid` → renew access
- `invoice.payment_failed` → flag account

## Usage Limits

| Feature | Free | Pro (£20/mo) | Premium (£100/mo) |
|---------|------|--------------|-------------------|
| Code generations/month | 10 | 100 | Unlimited |
| Circuit generations/month | 5 | 50 | Unlimited |
| General AI analyses/month | 5 | 50 | 1000 |

## Architecture

```
Codebot/
├── .env.example            # Environment variable template
├── .gitignore
├── docker-compose.yml      # PostgreSQL via Docker
├── client/                 # React + TypeScript + Vite frontend
│   └── src/
│       ├── api/            # Axios client + generation helpers
│       ├── components/     # CircuitVisualizer, UsageBar, etc.
│       ├── contexts/       # AuthContext
│       ├── lib/            # componentLibrary, breadboard, canvas utils
│       ├── pages/          # Dashboard, ArduinoAssistant, Pricing, etc.
│       └── types/          # TypeScript interfaces (circuit.ts, index.ts)
└── server/                 # Node.js + Express + TypeScript backend
    └── src/
        ├── db/             # PostgreSQL schema + migrations
        ├── middleware/     # auth, rateLimiter, errorHandler
        ├── routes/         # arduino, generate, stripe, payments, etc.
        ├── services/       # claude/ (client, prompts, streaming)
        └── utils/          # usage, json, logger, alerting
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/generate/code` | Stream AI code generation |
| POST | `/api/generate/circuit` | Stream AI circuit generation |
| POST | `/api/stripe/create-checkout-session` | Create Stripe Checkout session |
| POST | `/api/stripe/webhook` | Stripe webhook handler |
| GET | `/api/stripe/portal` | Redirect to Stripe Customer Portal |
| POST | `/api/arduino/chat` | Stream Arduino assistant chat |
| POST | `/api/arduino/generate-circuit` | Generate circuit from Arduino code |

## Troubleshooting

**"ANTHROPIC_API_KEY not set"** – Make sure `server/.env` has `ANTHROPIC_API_KEY=sk-ant-...`

**Stripe webhook errors** – Ensure `STRIPE_WEBHOOK_SECRET` matches the secret shown in the Stripe Dashboard or CLI output.

**Database connection refused** – Start PostgreSQL with `docker-compose up -d` or ensure your local Postgres is running.

