# Elaspic Application

Elaspic is a web application which displays a gallery of the photos the user has previously uploaded
to it. The UI consists of these screens:

- **login** — username and password; session is represented by an API bearer token for the SPA
- **register** — username, email, and password (link from login)
- **gallery** — grid of the user’s pictures (thumbnails) with an **Add** control to upload new images
- **detail** — full-size image; add comments (linked to the author’s username). **Tags are out of scope for v1** (removed from earlier draft).
- **users** — browse other registered users and their galleries (authenticated)

## Structure of the application

The application is split into 2 services.

### API Service

The API is a nodejs application that is built on top of the express framework. It provides some endpoints for user
registration and authentication and some RESTful URLs for clients to consume.

- /register: this endpoint only accepts POST requests and registers new users into the system.
For register to work it requires a username, a valid email and a password. These fields should be validated:
- username: required and unique in the system. only alphanumerical chars and "_" are accepted.
- email: required and unique in the system. must be a valid email
- password: required. any letter, number or special chars and min length should be 10

Validation errors in format like password too short should be returned explicitly explaining what is failing. Example:

```json
{
  "message": "Validation error",
  "errors": [
    { "field": "username", "message": "the username field contains invalid chars" },
    { "field": "email", "message": "the email field is not an email" },
    { "field": "password", "message": "the password field is too short" }
  ]
}
```

Do not disclose if a user or email is already in the system. Instead return a generic error.

```json
{
  "message": "username or email already registered"
}
```

If the registration is successful a new user is created with the following information:

- username: the username provided in the registration
- email: the email provided in the registration
- salt: a cryptographically random string, **minimum 30 characters**, stored in `users.salt`
- password_hash: **bcrypt** output for the cleartext string `password + salt` (see **Password hashing** below)

**Password hashing (v1 default):**

- **Register:** generate `salt` (≥ 30 chars). Set `password_hash = bcrypt( password + salt , BCRYPT_ROUNDS )` where `+` is string concatenation with no delimiter.
- **Login:** load `salt` and `password_hash` for the username; accept iff `bcrypt.compare( password + salt , password_hash )` is true.
- Use a standard Node bcrypt library; persist the full bcrypt string in `password_hash` (bcrypt’s internal salt is embedded in that string; the app-level `salt` column is still required for verify).

- /login: this endpoint does the login function. accepts only POST request and validates username & password returning
a token if correct. This token is used on subsequent requests in the `Authorization: Bearer <token>` header.
Similar to register, show explicit errors in field validations but if the format is correct and validation with the DB failed return:

```json
{
  "message": "invalid username or password"
}
```

The process of validating the login is:

- query for `password_hash` and `salt` for the given username. if not found fail with the invalid username message above
- verify with `bcrypt.compare( requestPassword + salt , password_hash )` if
  - true login is complete and returns an **opaque bearer token** in the JSON body (no httpOnly cookie in v1)
  - false fail with the invalid user/password message

**Session tokens (v1):** On successful login the API generates a cryptographically random token, persists it in MySQL (linked to `userId`, with `expiresAt`), and returns it to the client. Each authenticated request looks up the token; missing, unknown, or expired tokens yield `401`. Token TTL is configurable via environment (default **24 hours**). `POST /logout` (authenticated) deletes the current token row.

- `GET /health` — **anonymous**. Liveness for compose/orchestration. Returns `200` with body `{ "status": "ok" }` (no database check required in v1).

- `GET /me` — **authenticated**. Returns the current user for the shell header and client context (email omitted):

```json
{
  "id": "__UUID__",
  "username": "username"
}
```

NOTE: only `register`, `login`, and `GET /health` are anonymous. All other endpoints require a valid bearer token in the `Authorization` header.

**Privacy:** Email is stored for registration and authentication only. It must **never** appear in login responses, `/me`, user list payloads, picture/comment JSON, or error messages that could reveal another account’s email.

**Path prefix:** Express registers routes at the **root** (`/register`, `/me`, `/pics`, …). The browser calls **`/api/*`**; nginx **strips** the `/api` prefix before proxying (e.g. `GET /api/me` → upstream `GET /me`).

- /pics: this is the resource to manage pictures for the current user and it follows the classic REST rules. The user
is in the context of the request thanks to the token returned in /login.
- GET `/pics` returns a list of the current user’s pictures where `deleted` is false. List items include **thumbnail** content (not the full image) to keep payloads small.
- GET `/pics/:id` returns the picture with the given id (full `base64` image) only if it belongs to the authenticated user and `deleted` is false; otherwise **404** (including when the id belongs to another user — no disclosure).
- POST `/pics` accepts **`multipart/form-data`** with a single file field named `image`. Max upload size **5 MB**. Allowed types: `image/jpeg`, `image/png`, `image/webp`. The API stores the full image and **generates a thumbnail server-side** (resize); both are persisted. Oversize or invalid type → validation error response.
- DELETE `/pics/:id` **soft-deletes** the picture (`deleted: true`); row remains in the database. Lists and detail views treat deleted pictures as not found (404).

- /pics/:id/comments: REST endpoint for comments on **the current user’s own** pictures only (use this route from the `/pics/{picId}` UI — do not use the `/users/{userId}/pics/...` comments route for own gallery).
- GET — non-deleted comments for the picture (404 if picture not found, not owned, or soft-deleted).
- POST — add comment.
- PUT — edit a comment the current user authored.
- DELETE — logical delete of a comment the current user authored.

- /users: for this resource it will only allow to list users (GET request) that have been already registered. The user model exposed here contains only the username and id. the id is a uuid generated at the moment of creation.

- /users/{userId}/pics: pictures uploaded by the user with the given `{userId}`. GET returns that user’s non-deleted pictures (list uses thumbnails). Unknown `userId` → **404** (UI redirects to `/users`). POST, PUT, DELETE are not implemented (cannot mutate another user’s pictures).

- GET `/users/{userId}/pics/{picId}` returns the full picture when it exists, belongs to `{userId}`, and is not soft-deleted; otherwise **404**.

- /users/{userId}/pics/{picId}/comments: REST endpoint for comments on **another user’s** picture (used from `/users/{userId}/pics/{picId}` UI only).
- GET returns all non-deleted comments (see comment model).
- POST — current user may add a comment
- PUT — edit a comment the current user authored only
- DELETE — logical delete of a comment the current user authored only

### API responses (defaults)

Unless noted, responses are JSON with `Content-Type: application/json`. Lists are **raw JSON arrays** (no `{ "items": [] }` wrapper). Timestamps are ISO 8601 strings. Fields marked internal (`deleted`, `salt`, `password_hash`, email) are **never** returned on the wire.

| Situation | Status | Body |
| --- | --- | --- |
| Validation failure | `400` | `{ "message": "Validation error", "errors": [{ "field", "message" }] }` (already defined for register; same shape for other validators) |
| Duplicate register | `409` | `{ "message": "username or email already registered" }` |
| Bad credentials | `401` | `{ "message": "invalid username or password" }` (login only) |
| Missing/invalid token | `401` | `{ "message": "Unauthorized" }` |
| Not found / not allowed (404 rules) | `404` | `{ "message": "Not found" }` |
| Success, no body | `204` | empty (`DELETE` picture, `DELETE` comment, `POST /logout`) |

**Auth & users**

- `POST /register` success → **`201`**

```json
{ "id": "__UUID__", "username": "username" }
```

- `POST /login` success → **`200`**

```json
{ "token": "_opaque_token_" }
```

(`GET /me` supplies username after login.)

- `GET /users` success → **`200`** — array of `{ "id", "username" }`, sorted by `username` ascending (includes the current user).

**Pictures**

Picture **summary** (list + upload response):

```json
{
  "id": "__UUID__",
  "author": "username",
  "thumbnailBase64": "data:image/jpeg;base64,...",
  "createdAt": "2026-11-11T00:00:01"
}
```

Picture **detail** (own or cross-user GET by id):

```json
{
  "id": "__UUID__",
  "author": "username",
  "base64": "data:image/png;base64,...",
  "createdAt": "2026-11-11T00:00:01"
}
```

- `GET /pics`, `GET /users/{userId}/pics` → **`200`** — array of **summary** objects.
- `GET /pics/:id`, `GET /users/{userId}/pics/{picId}` → **`200`** — **detail** object.
- `POST /pics` success → **`201`** — **summary** object (thumbnail ready; client may navigate to detail for full `base64`).
- Upload validation failure → **`400`** — same validation error shape (e.g. field `image`).

**Comments**

Request body for create/update:

```json
{ "comment": "text" }
```

- `comment` required, trimmed, length **1–2000** on POST/PUT.

Comment **response** object (GET array elements, POST, PUT):

```json
{
  "id": "__UUID__",
  "author": "username",
  "picture": "__PIC_UUID__",
  "comment": "hello",
  "createdAt": "2026-11-11T00:00:01"
}
```

- `GET` comment collections → **`200`** — array sorted by **`createdAt` descending**; omit soft-deleted comments (`deleted` not exposed).
- `POST` comment → **`201`** — single comment object.
- `PUT` comment → **`200`** — updated comment object.

### Data Model

The API handles different data models for: users, pictures, comments. Some generic rules:

- ID fields are UUIDv4 strings. We will make use of `crypto.randomUUID` to generate them
- **Usernames are immutable** after registration (no rename endpoint in v1). Picture and comment `author` fields store the username at write time.

The data model for users is:

```json
{
  "id": "__UUID__",
  "username": "username",
  "email": "user@elastic.co",
  "salt": "_random_string_",
  "password_hash": "bcrypt(password+salt)",
  "createdAt": "2026-11-11T00:00:01"
}
```

(Persistence only — not returned by any API response.)

The data model for pictures is:

```json
{
  "id": "__UUID__",
  "author": "_username_",
  "base64": "data:image/png;base64,AAA",
  "thumbnailBase64": "data:image/png;base64,BBB",
  "deleted": false,
  "createdAt": "2026-11-11T00:00:01"
}
```

- `base64` — full image as uploaded (normalized MIME prefix `data:image/<type>;base64,...`)
- `thumbnailBase64` — server-generated smaller version used in gallery/list responses
- `deleted` — soft delete flag; when true the picture is hidden from all gallery/detail APIs

Session tokens (persistence model, not returned to clients except as the bearer string at login):

```json
{
  "token": "_opaque_random_string_",
  "userId": "__UUID__",
  "expiresAt": "2026-11-12T00:00:01",
  "createdAt": "2026-11-11T00:00:01"
}
```

The data model for comments is:

```json
{
  "id": "__UUID__",
  "author": "_username_",
  "picture": "picId",
  "comment": "hello",
  "deleted": false,
  "createdAt": "2026-11-11T00:00:01"
}
```

### The UI Service

This is a Reactjs application that works in single page application mode. For styling and
layout it is using Elastic's design system. Documentation can be found at https://eui.elastic.co/

#### UI Architecture

The UI is a **single monorepo** (one build/deployable UI service). Team boundaries are expressed as route-owned **micro frontend modules** (separate packages or folders: login, register, pics, users), not separate remote bundles.
The shell owns layout and routing; each route **lazy-loads** its micro frontend via React `lazy()` + `Suspense` (or equivalent code-split imports).
The shell application is a Reactjs component that has:

- a header and a sidebar that will be hidden on login and registration and shown when the user is logged in
- a router that has default route the login. changing a route means loading a micro frontend

The SPA keeps the login token in memory (and/or sessionStorage per team convention) and sends `Authorization: Bearer <token>` on API calls to `{PUBLIC_API_PREFIX}` (default `/api`). After login (and on authenticated app load), the shell calls **`GET /api/me`** to obtain `username` for the header.

Below is the description of each route/micro frontend:

- "/login": handled by the "login" micro frontend — username and password. Client-side validation should match backend rules before POST. If the user is not authenticated, other routes redirect here. Link to "/register".

- "/register": handled by the "Register" micro frontend — username, password, and email with client-side validation before POST.

Authenticated routes require a valid bearer token from `/login`. Unauthenticated navigation to these routes redirects to `/login`. Once authenticated the shell displays:

- the header component with
  - Elastic logo on the **left**; click navigates to "/pics"
  - username and logout on the **right** (logout calls `POST /logout`, clears token, redirects to login)
- a sidebar with icons linking to "/pics" and "/users"

- "/pics": handled by the "Pictures" micro frontend
  - "/pics" — grid of the current user’s pictures using **thumbnail** fields from the list API. An **Add** button (or equivalent primary action) opens a file picker (`image/jpeg`, `image/png`, `image/webp`, ≤ 5 MB), uploads via `POST /api/pics` (`multipart`, field `image`), shows validation errors inline, and refreshes the grid on success.
  - click → "/pics/{picId}" — detail with full image and comments via `/pics/:id` and `/pics/:id/comments` (newest first, show author username)
  - user can add, **edit**, and delete their own comments; navigate back to the grid

- "/users": handled by the "Users" micro frontend. **URLs use user UUID, not username** (username is display-only).
  - "/users" — list registered users (id + username); click a row → "/users/{userId}"
  - "/users/{userId}" — grid of that user’s pictures (thumbnails). Unknown userId → redirect "/users"
  - click → "/users/{userId}/pics/{picId}" — detail (GET `/users/{userId}/pics/{picId}`), comments via `/users/{userId}/pics/{picId}/comments`; user can add, **edit**, and delete their own comments
  - navigate back to list or gallery as appropriate

## Global Architecture

Apart from the services described above the system has other components that are necessary to work.
For now we want to spin up the whole system with a docker compose file.

The services in the compose are:

- database service: **MySQL 8**, accessible on the docker internal network
- api service: **Node.js 22** express API defined above; depends on the database
- ui service: also defined before. depends on the api service to work
- nginx proxy (**1.27**): the only component available to the outside world. its responsibility is to redirect request to the right place
  - requests with pathname starting with `/api/` are proxied to the API service after **stripping the `/api` prefix** (remainder is the Express path, e.g. `/api/pics` → `/pics`)
  - request with url pathname starting with "/collect/" will forward to an external server (**in scope for v1** — nginx config must be wired in the shipped `docker-compose` stack, not deferred)
    - the target host will be set on the docker compose with env var named `OTEL_EXPORTER_OTLP_ENDPOINT`
    - an ApiKey will be set on the docker compose file with env var named `ELASTIC_OTEL_API_KEY`
    - the forwarded request will add an authorization header with the value of `ELASTIC_OTEL_API_KEY`
    - host, x-forwarded-for and x-real-ip headers are also set
  - other requests go to the UI service (SPA deep links use `try_files` / fallback to `index.html`)

### Runtime versions

| Component | Version |
| --- | --- |
| Node.js (API build & runtime) | **22** |
| MySQL | **8** |
| nginx | **1.27** |

### MySQL schema (DDL)

Database name: `elaspic`. Charset: `utf8mb4`. IDs are UUID v4 strings (`CHAR(36)`). Timestamps stored as `DATETIME(3)` (API serializes ISO 8601 strings). Migrations or init scripts apply this DDL on fresh installs.

`pictures.owner_user_id` supports `/users/{userId}/pics` and ownership checks; `pictures.author` is the owner’s username at upload time (matches the API `author` field). `comments.comment_text` maps to the API `comment` property.

```sql
CREATE DATABASE IF NOT EXISTS elaspic
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE elaspic;

CREATE TABLE users (
  id            CHAR(36)     NOT NULL,
  username      VARCHAR(64)  NOT NULL,
  email         VARCHAR(255) NOT NULL,
  salt          VARCHAR(64)  NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at    DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE KEY uq_users_username (username),
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB;

CREATE TABLE session_tokens (
  token       VARCHAR(128) NOT NULL,
  user_id     CHAR(36)     NOT NULL,
  expires_at  DATETIME(3)  NOT NULL,
  created_at  DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (token),
  KEY idx_session_tokens_user_id (user_id),
  KEY idx_session_tokens_expires_at (expires_at),
  CONSTRAINT fk_session_tokens_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE pictures (
  id                CHAR(36)     NOT NULL,
  owner_user_id     CHAR(36)     NOT NULL,
  author            VARCHAR(64)  NOT NULL,
  base64            LONGTEXT     NOT NULL,
  thumbnail_base64  LONGTEXT     NOT NULL,
  deleted           TINYINT(1)   NOT NULL DEFAULT 0,
  created_at        DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_pictures_owner_list (owner_user_id, deleted, created_at),
  CONSTRAINT fk_pictures_owner
    FOREIGN KEY (owner_user_id) REFERENCES users (id),
  CONSTRAINT fk_pictures_author
    FOREIGN KEY (author) REFERENCES users (username)
) ENGINE=InnoDB;

CREATE TABLE comments (
  id           CHAR(36)     NOT NULL,
  picture_id   CHAR(36)     NOT NULL,
  author       VARCHAR(64)  NOT NULL,
  comment_text TEXT         NULL,
  deleted      TINYINT(1)   NOT NULL DEFAULT 0,
  created_at   DATETIME(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  KEY idx_comments_picture_list (picture_id, deleted, created_at),
  CONSTRAINT fk_comments_picture
    FOREIGN KEY (picture_id) REFERENCES pictures (id),
  CONSTRAINT fk_comments_author
    FOREIGN KEY (author) REFERENCES users (username)
) ENGINE=InnoDB;
```

### Environment variables

All services receive configuration via `docker-compose` (`.env` file referenced by compose is supported). Variable names below are **canonical** for this project.

| Variable | Service(s) | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `MYSQL_ROOT_PASSWORD` | database | yes | — | MySQL root password (dev compose only if root used) |
| `MYSQL_DATABASE` | database | yes | `elaspic` | Database created on first start |
| `MYSQL_USER` | database, api | yes | — | Application DB user |
| `MYSQL_PASSWORD` | database, api | yes | — | Password for `MYSQL_USER` |
| `MYSQL_HOST` | api | yes | `database` | Docker network hostname of MySQL |
| `MYSQL_PORT` | api | no | `3306` | MySQL port |
| `API_PORT` | api | no | `3000` | Express listen port (internal) |
| `SESSION_TTL_SECONDS` | api | no | `86400` | Opaque session lifetime (24h) |
| `BCRYPT_ROUNDS` | api | no | `12` | Password hashing cost |
| `MAX_UPLOAD_BYTES` | api | no | `5242880` | Multipart upload cap (5 MB) |
| `THUMBNAIL_MAX_EDGE_PX` | api | no | `320` | Longest edge for generated thumbnails |
| `THUMBNAIL_JPEG_QUALITY` | api | no | `80` | JPEG/WebP thumbnail quality (1–100) |
| `NGINX_HTTP_PORT` | nginx | no | `8080` | Host port exposed to browsers |
| `UI_UPSTREAM` | nginx | no | `ui:80` | Internal UI service address |
| `API_UPSTREAM` | nginx | no | `api:3000` | Internal API upstream |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | nginx | yes* | — | OTLP/collector URL for `/collect/` proxy |
| `ELASTIC_OTEL_API_KEY` | nginx | yes* | — | Value sent as `Authorization` on proxied OTLP requests |
| `PUBLIC_API_PREFIX` | ui (build) | no | `/api` | Browser-relative API base (via nginx) |

\*Required when telemetry export is enabled in the shipped stack; compose may ship placeholder values for local dev with a documented no-op collector URL.

**API connection string:** The API builds its MySQL connection from `MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_USER`, `MYSQL_PASSWORD`, and `MYSQL_DATABASE` (no separate `DATABASE_URL` in v1 unless implementers prefer a single DSN env — if so, document it in the API README and keep compose aligned).

**UI:** The SPA calls the API at `{PUBLIC_API_PREFIX}` on the same origin (nginx strips the prefix when proxying to Express). No secrets in UI build env.

**Health checks:** Compose may use `GET /api/health` (public) against nginx or `GET /health` on the API container directly; both should return `200` when the API process is up.

## Spec decisions (record)

| Topic | Decision |
| --- | --- |
| Tags on detail view | **Out of v1** — remove from scope; comments only |
| Gallery images | **Separate `thumbnailBase64`** — generated on upload server-side; lists use thumbnail |
| User gallery URLs | **UUID in UI routes** — `/users/{userId}` and `/users/{userId}/pics/{picId}`; list shows username |
| Authentication | **Bearer token only** — `Authorization` header; no httpOnly session cookie in v1 |
| Session token | **Opaque token in MySQL** — random string + `expiresAt`; default TTL 24h; `POST /logout` revokes |
| Upload | **multipart** field `image`, max **5 MB**, jpeg/png/webp |
| Delete picture | **Soft delete** — `deleted: true`; 404 on detail/list |
| Own vs other comments API | **Confirmed** — own pics: `/pics/:id/comments`; other users: `/users/{userId}/pics/{picId}/comments` |
| Username | **Immutable** after registration |
| `/pics/:id` access | **404** if id not found, soft-deleted, or not owned by caller |
| UI packaging | **Monorepo** + **lazy routes** (not Module Federation remotes) |
| OTEL `/collect/` proxy | **In scope for v1** in docker-compose + nginx |
| Comment UI | **Add, edit, delete** (own comments) |
| Email privacy | **Never leak** in API responses/errors |
| Header layout | **Logo left**, **username + logout right** |
| Database | **Full DDL in spec** — `users`, `session_tokens`, `pictures`, `comments` (see above) |
| Configuration | **Documented compose env vars** — table under Global Architecture |
| Gallery upload UI | **Add** button on `/pics` — file picker → `POST /api/pics` |
| Current user | **`GET /me`** (`/api/me` public) — `{ id, username }` for shell header |
| API public paths | nginx **strips `/api`**; Express serves unprefixed routes |
| Health | **`GET /health`** anonymous — `{ "status": "ok" }` |
| Runtime pins | **Node 22**, **MySQL 8**, **nginx 1.27** |
| Success responses | **Defaults table** — status codes, DTOs, raw arrays; see **API responses (defaults)** |
| Password hashing | **bcrypt(`password + salt`)** — app salt ≥ 30 chars; cost `BCRYPT_ROUNDS` |
