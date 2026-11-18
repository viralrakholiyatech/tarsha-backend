# backend
 zaid backend

## Local configuration

Copy `.env.example` to `.env` and set your credentials. Copy `config/db.example.json` to `config/db.json` and `config/config.example.json` to `config/config.json`, then configure their values. Supply your Firebase credentials as `serviceAccountKey.json` in the project root. These local configuration files are excluded from Git.

## Render deployment

- Build command: `npm ci`
- Start command: `npm start` (runs Node directly; use `npm run dev` locally for nodemon)
- Health check path: `/healthz`
- The server binds to `0.0.0.0` using Render's `PORT`.

Set environment variables in Render: `DB_HOST`, `DB_PORT` (normally 3306), `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`, and `SESSION_SECRET`. The MySQL server must be reachable from Render; localhost refers to the Render instance, not your local machine. The application uses the `tarsha` tenant database and `MASTER_DB_NAME` (default `master_admin`). Provision the existing schema/data on your MySQL server separately.

Set `AUTH_KEY` and `ENCRYPTION_KEY` to the values used by your existing application if those features are in use. Keep secrets stable across deploys. Without a session secret the server uses an ephemeral random secret, which invalidates sessions on restart.

For Firebase notifications, add a Render secret file named `serviceAccountKey.json`, or set `FIREBASE_SERVICE_ACCOUNT_JSON` to the service-account JSON. The app also supports `GOOGLE_APPLICATION_CREDENTIALS`. Missing Firebase credentials no longer prevent HTTP startup, but notifications require valid credentials. Configure the AWS and SMTP variables from `.env.example` for file uploads and email. Private local JSON config files are optional on Render.

`/healthz` checks that HTTP is running. `/readyz` returns 200 when MySQL is reachable and 503 when it is unavailable; a successful HTTP deployment alone does not mean database-backed features are ready.
