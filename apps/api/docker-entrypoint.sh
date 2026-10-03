#!/bin/sh
set -e

echo "🔄 Generating Prisma Client..."
npx prisma generate

if [ "${RUN_DB_MIGRATIONS:-true}" = "true" ]; then
  if [ "${NODE_ENV:-development}" = "production" ]; then
    echo "📦 Applying Prisma migrations to PostgreSQL..."
    until npx prisma migrate deploy; do
      echo "⏳ Waiting for PostgreSQL to be ready - retrying in 2s..."
      sleep 2
    done
  else
    echo "📦 Synchronizing development schema to PostgreSQL..."
    until npx prisma db push --skip-generate; do
      echo "⏳ Waiting for PostgreSQL to be ready - retrying in 2s..."
      sleep 2
    done
  fi
  echo "✅ Database schema ready."
else
  echo "⏭️ Skipping database migrations for this process."
fi

echo "🚀 Starting application..."
exec "$@"
