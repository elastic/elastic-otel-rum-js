# Elaspic database

MySQL **8** database `elaspic` with schema applied on first container start.

## Architecture

- Init script `init/01-schema.sql` is mounted into `/docker-entrypoint-initdb.d/` on the `database` compose service.
- Tables: `users`, `session_tokens`, `pictures`, `comments` (see `PROJECT.md` for field semantics).

The API service connects using `MYSQL_*` environment variables on the Docker network hostname `database`.
