# Elaspic

Photo gallery web app (React + Express + MySQL) described in [PROJECT.md](./PROJECT.md).

## Repository layout

| Path | Role |
| --- | --- |
| `api/` | Express API ([README](./api/README.md)) |
| `ui/` | React SPA ([README](./ui/README.md)) |
| `nginx/` | Public reverse proxy ([README](./nginx/README.md)) |
| `database/` | MySQL init DDL ([README](./database/README.md)) |
| `docker-compose.yml` | Full stack orchestration |

## Prerequisites

- Docker with Compose v2
- (Optional) Node.js 22 for local API/UI development

## Setup and run with Docker Compose

1. **Copy environment file**

   ```bash
   cd examples/elaspic
   cp .env.example .env
   ```

2. **Edit `.env`** — set at minimum:

   - `MYSQL_ROOT_PASSWORD`, `MYSQL_USER`, `MYSQL_PASSWORD`
   - For telemetry export via `/collect/`, set `OTEL_EXPORTER_OTLP_ENDPOINT` and `ELASTIC_OTEL_API_KEY` (placeholders in `.env.example` are enough to start the stack locally)

3. **Build and start**

   ```bash
   docker compose up --build
   ```

4. **Open the app**

   - UI: [http://localhost:8080](http://localhost:8080) (or the host port from `NGINX_HTTP_PORT`)
   - API health via proxy: [http://localhost:8080/api/health](http://localhost:8080/api/health)

5. **Register** a user at `/register`, then sign in, upload pictures with **Add** on `/pics`, and browse **Users**.

## Stop

```bash
docker compose down
```

To remove the MySQL volume as well:

```bash
docker compose down -v
```

## Service architecture

```text
Browser :8080
    │
    ▼
 nginx (strip /api, /collect proxy, UI)
    ├──► ui:80        (static SPA)
    ├──► api:3000     (Express)
    └──► OTLP host    (/collect/)
              │
              ▼
         database:3306 (MySQL 8)
```

Stack versions: **Node 22**, **MySQL 8**, **nginx 1.27** (see `PROJECT.md`).
