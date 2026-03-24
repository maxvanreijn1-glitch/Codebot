# Rollback Procedures

This document describes how to roll back a bad deployment of the Codebot server.

---

## Quick Application Rollback

### 1. Identify the problem commit

```bash
git log --oneline | head -10
```

### 2. Revert to the previous release

```bash
# Revert a single bad commit
git revert HEAD
git push

# Or hard-reset to a specific known-good commit (use with caution)
git reset --hard <commit-sha>
git push --force-with-lease
```

### 3. Rebuild and restart

```bash
npm run build
npm run start
# or with pm2:
pm2 restart codebot-server
```

### 4. Verify health

```bash
curl https://<your-domain>/api/health
# Expected: {"status":"healthy","database":"connected",...}
```

---

## Database Rollback

> **Always back up before running a rollback.**

### Step 1 – Back up the current database state

```bash
pg_dump "$DATABASE_URL" > "backup_$(date +%Y%m%d_%H%M%S).sql"
```

### Step 2 – Apply the rollback script

For migrations 005 and 006 (security indexes + password reset columns):

```bash
psql "$DATABASE_URL" < server/src/db/migrations/rollback_005_006.sql
```

For earlier migrations, apply their rollback scripts in reverse order:

| Forward migration | Rollback script |
|---|---|
| `006_add_password_reset.sql` | `rollback_005_006.sql` (section 006) |
| `005_add_security_indexes.sql` | `rollback_005_006.sql` (section 005) |

### Step 3 – Restart the server

After applying a database rollback, restart the server so it reconnects cleanly:

```bash
pm2 restart codebot-server
# or
npm run start
```

---

## CI/CD One-Command Rollback

If your pipeline supports deployment tags, roll back with:

```bash
# Example for Render / Railway / Fly.io — adapt to your provider
render deploys rollback --service codebot-server
```

Or trigger a re-deploy of the previous Docker image:

```bash
docker pull ghcr.io/<org>/codebot-server:<previous-tag>
docker stop codebot-server && docker run -d --name codebot-server ghcr.io/<org>/codebot-server:<previous-tag>
```

---

## Environment Variables Checklist

Ensure these are set before restarting after a rollback:

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | Secret for signing JWTs |
| `PORT` | optional | Server port (default: 5000) |
| `NODE_ENV` | optional | `production` enables strict CORS |
| `CORS_ORIGIN` | optional | Comma-separated allowed origins |
| `STRIPE_SECRET_KEY` | optional | Stripe payments |
| `LOG_LEVEL` | optional | `debug` for verbose logging |

---

## Monitoring After Rollback

Watch structured logs for errors:

```bash
# Docker
docker logs -f codebot-server | grep '"level":"error"'

# pm2
pm2 logs codebot-server | grep '"level":"error"'
```

Health check endpoint for automated monitoring:

```
GET /api/health
```

Returns `200 {"status":"healthy"}` when the server and database are both up.
