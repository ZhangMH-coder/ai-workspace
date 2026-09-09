CREATE TABLE `resource_analysis` (
	`id` text PRIMARY KEY NOT NULL,
	`resource_id` text NOT NULL,
	`status` text NOT NULL,
	`strategy` text NOT NULL,
	`analyzer_version` text NOT NULL,
	`created_at` text NOT NULL,
	`analyzed_at` text,
	`input_fingerprint` text NOT NULL,
	`resource_mtime` text,
	`is_current` integer DEFAULT false NOT NULL,
	`error_code` text,
	`error_message` text,
	`summary` text,
	FOREIGN KEY (`resource_id`) REFERENCES `discovered_resource`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_analysis_resource_fp_version` ON `resource_analysis` (`resource_id`,`input_fingerprint`,`analyzer_version`);--> statement-breakpoint
CREATE INDEX `idx_analysis_resource` ON `resource_analysis` (`resource_id`);--> statement-breakpoint
CREATE INDEX `idx_analysis_status` ON `resource_analysis` (`status`);--> statement-breakpoint
CREATE TABLE `resource_capability` (
	`id` text PRIMARY KEY NOT NULL,
	`analysis_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`capability` text NOT NULL,
	`category` text NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`confidence` real DEFAULT 0 NOT NULL,
	`evidence_ref` text NOT NULL,
	`evidence_snippet` text NOT NULL,
	`input_context` text DEFAULT '{}' NOT NULL,
	`execution_hint` text,
	FOREIGN KEY (`analysis_id`) REFERENCES `resource_analysis`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resource_id`) REFERENCES `discovered_resource`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_capability_analysis_cap` ON `resource_capability` (`analysis_id`,`capability`);--> statement-breakpoint
CREATE INDEX `idx_capability_resource` ON `resource_capability` (`resource_id`);--> statement-breakpoint
CREATE INDEX `idx_capability_category` ON `resource_capability` (`category`);