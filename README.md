# Codebot - AI Code Analysis Platform

An intelligent code analysis platform powered by GPT-4 that provides GitHub-style diff views and actionable suggestions.

## Prerequisites

- Node.js 18+
- PostgreSQL 15+
- OpenAI API Key
- Stripe Account (for payments)

## Installation

### 1. Clone and install dependencies

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Set up environment variables

```bash
# In server/ directory
cp .env.example .env
# Edit .env with your values
```

### 3. Set up the database

```bash
# Create the database
createdb codebot

# Run schema migrations
psql -d codebot -f src/db/schema.sql
```

### 4. Run in development

```bash
# Terminal 1: Start backend
cd server
npm run dev

# Terminal 2: Start frontend
cd client
npm run dev
```

The app will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:5000

## Environment Variables

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret for JWT signing |
| `OPENAI_API_KEY` | OpenAI API key for GPT-4 |
| `STRIPE_SECRET_KEY` | Stripe secret key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `PORT` | Server port (default: 5000) |

## Architecture

```
codebot/
├── client/          # React + TypeScript + Vite frontend
│   └── src/
│       ├── api/     # Axios client
│       ├── components/  # Reusable UI components
│       ├── contexts/    # React contexts (Auth)
│       ├── pages/       # Page components
│       └── types/       # TypeScript types
├── server/          # Node.js + Express + TypeScript backend
│   └── src/
│       ├── db/      # Database connection & schema
│       ├── middleware/  # Express middleware
│       ├── routes/      # API routes
│       └── utils/       # Utility functions
└── docker-compose.yml  # PostgreSQL via Docker
```

## Features

- **AI-Powered Analysis**: GPT-4 analyzes your code and provides intelligent suggestions
- **GitHub-style Diffs**: View proposed changes with a beautiful diff viewer
- **Multi-language Support**: TypeScript, Python, Go, Java, Ruby, PHP, and more
- **Secure File Uploads**: Upload entire codebases for analysis
- **Usage Tiers**: Free, Pro, and Premium plans with Stripe payments
- **JWT Authentication**: Secure token-based authentication
