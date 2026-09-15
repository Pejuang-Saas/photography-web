#!/bin/sh
set -e

echo "🔄 Generating Prisma Client..."
npx prisma generate

echo "📦 Pushing database schema to PostgreSQL..."
# Wait for PostgreSQL to be ready
until npx prisma db push --skip-generate; do
  echo "⏳ Waiting for PostgreSQL to be ready - retrying in 2s..."
  sleep 2
done

echo "✅ Database schema synchronized successfully."

echo "🚀 Starting application..."
exec "$@"
