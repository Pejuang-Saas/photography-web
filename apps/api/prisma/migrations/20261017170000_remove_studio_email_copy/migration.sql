-- Emails are only sent to customers; the studio is notified in the admin panel instead.
ALTER TABLE "email_settings"
  DROP COLUMN "admin_notification_email",
  DROP COLUMN "notify_admin_new_booking";
