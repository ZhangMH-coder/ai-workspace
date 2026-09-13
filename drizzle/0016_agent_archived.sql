ALTER TABLE `agent` ADD `archived_at` text;
--> statement-breakpoint
CREATE INDEX `idx_agent_archived` ON `agent` (`archived_at`);
