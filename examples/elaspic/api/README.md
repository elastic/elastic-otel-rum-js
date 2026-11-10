# Elaspic API

Node.js 22 Express service that backs the Elaspic photo gallery. It handles user registration and login, opaque bearer sessions stored in MySQL, picture uploads with server-generated thumbnails, and comments on pictures.

## Architecture

```
src/
  index.js          # Express app bootstrap, error handling
  config.js         # Environment-driven settings
  db.js             # MySQL pool with startup retry
  middleware/
    auth.js         # Bearer token lookup (session_tokens)
  routes/
    auth.js         # /health, /register, /login, /logout, /me, /users
    pics.js         # /pics, /users/:userId/pics
    comments.js     # Comment CRUD (own vs other-user paths)
  utils/
    validation.js   # Request validation helpers
    password.js     # bcrypt(password + salt), session tokens
    images.js       # sharp thumbnails, data URLs
```

**Data flow:** nginx strips the `/api` prefix and forwards to this service. Routes are mounted at the repository root (`/login`, `/pics`, …). Authentication middleware joins `session_tokens` to `users` and attaches `req.auth`.

**Storage:** MySQL 8 tables `users`, `session_tokens`, `pictures`, `comments` (see `../database/init/01-schema.sql`).

## Configuration

Uses the canonical variables from `PROJECT.md` (`MYSQL_*`, `SESSION_TTL_SECONDS`, `BCRYPT_ROUNDS`, `MAX_UPLOAD_BYTES`, `THUMBNAIL_*`, `API_PORT`).

## Local development

```bash
cd api
npm install
export MYSQL_HOST=127.0.0.1 MYSQL_USER=... MYSQL_PASSWORD=... MYSQL_DATABASE=elaspic
npm run dev
```

Prefer running the full stack via Docker Compose (see root `README.md`).
