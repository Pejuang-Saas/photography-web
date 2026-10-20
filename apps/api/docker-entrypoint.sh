#!/bin/sh
set -e

# Called by path: `npx` needs a writable home for its cache, which the unprivileged production user
# does not have, and the CLI is already installed in node_modules.
PRISMA=./node_modules/.bin/prisma
MAX_ATTEMPTS="${DB_WAIT_ATTEMPTS:-30}"

# Runs a command until it succeeds, giving PostgreSQL time to come up, but not forever: a migration
# that is really broken must stop the container so the deploy shows as failed.
retry() {
  attempt=1
  until "$@"; do
    if [ "$attempt" -ge "$MAX_ATTEMPTS" ]; then
      echo "❌ Giving up after $attempt attempts: $*"
      return 1
    fi
    echo "⏳ Waiting for PostgreSQL ($attempt/$MAX_ATTEMPTS), retrying in 2s..."
    attempt=$((attempt + 1))
    sleep 2
  done
}

if [ "${NODE_ENV:-development}" != "production" ]; then
  # Development mounts the source over the image, which hides the client generated at build time.
  echo "🔄 Generating Prisma Client..."
  "$PRISMA" generate
fi

if [ "${RUN_DB_MIGRATIONS:-true}" = "true" ]; then
  if [ "${NODE_ENV:-development}" = "production" ]; then
    echo "📦 Applying Prisma migrations to PostgreSQL..."
    retry "$PRISMA" migrate deploy
  else
    echo "📦 Synchronizing development schema to PostgreSQL..."
    retry "$PRISMA" db push --skip-generate
  fi
  echo "✅ Database schema ready."
else
  echo "⏭️ Skipping database migrations for this process."
fi

echo "🚀 Starting application..."
exec "$@"
