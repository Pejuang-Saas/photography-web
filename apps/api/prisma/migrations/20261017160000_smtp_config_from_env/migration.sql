-- SMTP credentials now come from environment variables (SMTP_HOST, SMTP_PORT, ...), not the database.
ALTER TABLE "email_settings"
  DROP COLUMN "host",
  DROP COLUMN "port",
  DROP COLUMN "secure",
  DROP COLUMN "username",
  DROP COLUMN "password_encrypted",
  DROP COLUMN "from_email",
  DROP COLUMN "from_name";
