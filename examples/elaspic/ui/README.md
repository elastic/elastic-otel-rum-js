# Elaspic UI

React single-page application using [Elastic UI (EUI)](https://eui.elastic.co/). A shell layout (header, sidebar) hosts route-level **micro frontend** modules loaded with `React.lazy` and `Suspense`.

## Architecture

```
src/
  main.jsx                 # EuiProvider, router, AuthProvider
  App.jsx                  # Top-level routes and auth gate
  api/client.js            # /api fetch wrapper + sessionStorage token
  auth/AuthContext.jsx     # Login state, GET /me for header username
  shell/                   # Layout chrome (hidden on /login, /register)
  microfrontends/
    login/                 # /login
    register/              # /register
    pics/                  # /pics, /pics/:picId
    users/                 # /users, /users/:userId, …/pics/:picId
  components/CommentPanel.jsx
```

The UI is built with Vite, served as static files (nginx in the UI container), and reached through the edge **nginx** proxy on port `8080` in Docker Compose.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_PUBLIC_API_PREFIX` | `/api` | Browser-relative API base (set at build time in Docker) |

## Local development

```bash
cd ui
npm install
npm run dev
```

Run the API on port 3000 (or adjust `vite.config.js` proxy). For the full stack use root `README.md`.
