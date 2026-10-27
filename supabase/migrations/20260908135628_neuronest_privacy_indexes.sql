--
-- Add field policy_snapshot to appointment
--
ALTER TABLE "api_appointment" ADD COLUMN "policy_snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "api_appointment" ALTER COLUMN "policy_snapshot" DROP DEFAULT;
--
-- Add field adult_subject to child
--
ALTER TABLE "api_child" ADD COLUMN "adult_subject_id" uuid NULL CONSTRAINT "api_child_adult_subject_id_bae91c64_fk_api_account_id" REFERENCES "api_account"("id") DEFERRABLE INITIALLY DEFERRED; SET CONSTRAINTS "api_child_adult_subject_id_bae91c64_fk_api_account_id" IMMEDIATE;
--
-- Add field accepted_at to privacyrequest
--
ALTER TABLE "api_privacyrequest" ADD COLUMN "accepted_at" timestamp with time zone NULL;
--
-- Add field child to privacyrequest
--
ALTER TABLE "api_privacyrequest" ADD COLUMN "child_id" uuid NULL CONSTRAINT "api_privacyrequest_child_id_9decbf3a_fk_api_child_id" REFERENCES "api_child"("id") DEFERRABLE INITIALLY DEFERRED; SET CONSTRAINTS "api_privacyrequest_child_id_9decbf3a_fk_api_child_id" IMMEDIATE;
--
-- Add field evidence_reference to privacyrequest
--
ALTER TABLE "api_privacyrequest" ADD COLUMN "evidence_reference" varchar(240) DEFAULT '' NOT NULL;
ALTER TABLE "api_privacyrequest" ALTER COLUMN "evidence_reference" DROP DEFAULT;
--
-- Add field execution_receipt to privacyrequest
--
ALTER TABLE "api_privacyrequest" ADD COLUMN "execution_receipt" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "api_privacyrequest" ALTER COLUMN "execution_receipt" DROP DEFAULT;
--
-- Add field retention_review to privacyrequest
--
ALTER TABLE "api_privacyrequest" ADD COLUMN "retention_review" jsonb DEFAULT '{}'::jsonb NOT NULL;
ALTER TABLE "api_privacyrequest" ALTER COLUMN "retention_review" DROP DEFAULT;
--
-- Add field reviewed_at to privacyrequest
--
ALTER TABLE "api_privacyrequest" ADD COLUMN "reviewed_at" timestamp with time zone NULL;
--
-- Add field reviewed_by to privacyrequest
--
ALTER TABLE "api_privacyrequest" ADD COLUMN "reviewed_by_id" uuid NULL CONSTRAINT "api_privacyrequest_reviewed_by_id_4c9826a9_fk_api_account_id" REFERENCES "api_account"("id") DEFERRABLE INITIALLY DEFERRED; SET CONSTRAINTS "api_privacyrequest_reviewed_by_id_4c9826a9_fk_api_account_id" IMMEDIATE;
--
-- Add field subject to privacyrequest
--
ALTER TABLE "api_privacyrequest" ADD COLUMN "subject_id" uuid NULL CONSTRAINT "api_privacyrequest_subject_id_8bf287b7_fk_api_account_id" REFERENCES "api_account"("id") DEFERRABLE INITIALLY DEFERRED; SET CONSTRAINTS "api_privacyrequest_subject_id_8bf287b7_fk_api_account_id" IMMEDIATE;
CREATE INDEX "api_child_adult_subject_id_bae91c64" ON "api_child" ("adult_subject_id");
CREATE INDEX "api_privacyrequest_child_id_9decbf3a" ON "api_privacyrequest" ("child_id");
CREATE INDEX "api_privacyrequest_reviewed_by_id_4c9826a9" ON "api_privacyrequest" ("reviewed_by_id");
CREATE INDEX "api_privacyrequest_subject_id_8bf287b7" ON "api_privacyrequest" ("subject_id");

--
-- Add field lease_until to outbox
--
ALTER TABLE "api_outbox" ADD COLUMN "lease_until" timestamp with time zone NULL;
--
-- Concurrently create index appointment_hold_sweep on field(s) status, hold_expires_at of model appointment
--
CREATE INDEX "appointment_hold_sweep" ON "api_appointment" ("status", "hold_expires_at");
--
-- Concurrently create index appointment_slot_status on field(s) slot, status of model appointment
--
CREATE INDEX "appointment_slot_status" ON "api_appointment" ("slot_id", "status");
--
-- Concurrently create index attachment_child_recent on field(s) child, -created_at of model attachment
--
CREATE INDEX "attachment_child_recent" ON "api_attachment" ("child_id", "created_at" DESC);
--
-- Concurrently create index audit_child_recent on field(s) child, -created_at of model audit
--
CREATE INDEX "audit_child_recent" ON "api_audit" ("child_id", "created_at" DESC);
--
-- Concurrently create index goal_child_recent on field(s) child, -created_at of model goal
--
CREATE INDEX "goal_child_recent" ON "api_goal" ("child_id", "created_at" DESC);
--
-- Concurrently create index grant_recipient_live on field(s) recipient, revoked_at, expires_at of model grant
--
CREATE INDEX "grant_recipient_live" ON "api_grant" ("recipient_id", "revoked_at", "expires_at");
--
-- Concurrently create index grant_child_live on field(s) child, revoked_at of model grant
--
CREATE INDEX "grant_child_live" ON "api_grant" ("child_id", "revoked_at");
--
-- Concurrently create index growth_child_recent on field(s) child, -created_at of model growth
--
CREATE INDEX "growth_child_recent" ON "api_growth" ("child_id", "created_at" DESC);
--
-- Concurrently create index guardianship_user_status on field(s) user, status of model guardianship
--
CREATE INDEX "guardianship_user_status" ON "api_guardianship" ("user_id", "status");
--
-- Concurrently create index message_child_recent on field(s) child, -created_at of model message
--
CREATE INDEX "message_child_recent" ON "api_message" ("child_id", "created_at" DESC);
--
-- Concurrently create index notification_user_recent on field(s) user, -created_at of model notification
--
CREATE INDEX "notification_user_recent" ON "api_notification" ("user_id", "created_at" DESC);
--
-- Concurrently create index observation_child_recent on field(s) child, -created_at of model observation
--
CREATE INDEX "observation_child_recent" ON "api_observation" ("child_id", "created_at" DESC);
--
-- Concurrently create index outbox_dispatch_queue on field(s) status, available_at of model outbox
--
CREATE INDEX "outbox_dispatch_queue" ON "api_outbox" ("status", "available_at");
--
-- Concurrently create index record_child_recent on field(s) child, -created_at of model record
--
CREATE INDEX "record_child_recent" ON "api_record" ("child_id", "created_at" DESC);
--
-- Concurrently create index referral_child_recent on field(s) child, -created_at of model referral
--
CREATE INDEX "referral_child_recent" ON "api_referral" ("child_id", "created_at" DESC);
--
-- Concurrently create index screening_child_recent on field(s) child, -created_at of model screening
--
CREATE INDEX "screening_child_recent" ON "api_screening" ("child_id", "created_at" DESC);
--
-- Concurrently create index slot_practitioner_window on field(s) practitioner, starts_at, ends_at of model slot
--
CREATE INDEX "slot_practitioner_window" ON "api_slot" ("practitioner_id", "starts_at", "ends_at");
--
-- Concurrently create index therapysession_child_recent on field(s) child, -created_at of model therapysession
--
CREATE INDEX "therapysession_child_recent" ON "api_therapysession" ("child_id", "created_at" DESC);
--
-- Concurrently create index vaccination_child_recent on field(s) child, -created_at of model vaccination
--
CREATE INDEX "vaccination_child_recent" ON "api_vaccination" ("child_id", "created_at" DESC);
