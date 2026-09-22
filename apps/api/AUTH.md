# Admin authentication (backend)

Better Auth runs in the NestJS API and stores users, accounts, and sessions in PostgreSQL through Prisma. Public email signup is disabled. Only users with the `admin` role can access `/admin/auth/me` and future admin controllers decorated with `@Roles(['admin'])`.

## Setup

1. Set `BETTER_AUTH_SECRET` to a random value of at least 32 characters. Set `BETTER_AUTH_URL` to the public API origin and `WEB_URL` to the exact web origin. For Docker Compose, set the secret in the root `.env`; `BETTER_AUTH_URL` follows `API_URL`.
2. Apply the Prisma schema using the existing development startup (`prisma db push`). For a managed deployment, create and apply a reviewed Prisma migration before starting the API.
3. Create the first admin interactively:

   ```bash
   # Docker development environment (from repository root)
   npm run api:auth:create-admin

   # Native development environment (from apps/api)
   npm run auth:create-admin
   ```

   The command asks for the email, name, and password, then assigns the `admin` role. It requires database access.

## Endpoints

- `POST /api/auth/sign-in/email`: email and password login.
- `GET /api/auth/get-session`: current Better Auth session.
- `POST /api/auth/sign-out`: end the current session.
- `GET /admin/auth/me`: admin-only profile; returns 401 without a session and 403 for a non-admin user.

Session cookies are HTTP-only. Browser requests to the API must include credentials. If the frontend and API use unrelated domains, expose `/api/auth/*` through a same-origin reverse proxy or deploy both under a shared parent domain; configure `BETTER_AUTH_URL` and cookie routing for that public origin.

The API revokes an admin's older sessions when a new session is created. Its existing `GET /` and `GET /health` routes remain public.
