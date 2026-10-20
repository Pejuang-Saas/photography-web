# Archived migrations

These 22 migrations are the history from before the project had a baseline. **Prisma does not read
this folder**; it only reads `prisma/migrations/`.

They could not be applied to an empty database: the first one (`add_booking_payments_and_delivery`)
assumes tables such as `users` that no migration ever created, because development has always used
`prisma db push`. `prisma migrate deploy` on a new production database failed at that step.

`prisma/migrations/20261020150000_baseline/migration.sql` replaces them: it was generated from
`schema.prisma` and checked by applying it to an empty database (41 tables, and
`prisma migrate diff` against the schema reports no difference).

Kept only so the earlier changes stay readable. Safe to delete.
