CREATE TABLE `resource_recommendation` (
	`id` text PRIMARY KEY NOT NULL,
	`task_analysis_id` text NOT NULL,
	`task_requirement_id` text NOT NULL,
	`resource_capability_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`score` real DEFAULT 0 NOT NULL,
	`reason` text,
	`evidence_ref` text NOT NULL,
	`source_path` text NOT NULL,
	`rank` integer DEFAULT 0 NOT NULL,
	`source` text DEFAULT 'heuristic' NOT NULL,
	FOREIGN KEY (`task_analysis_id`) REFERENCES `task_analysis`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_requirement_id`) REFERENCES `task_requirement`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resource_capability_id`) REFERENCES `resource_capability`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resource_id`) REFERENCES `discovered_resource`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_reco_analysis_cap` ON `resource_recommendation` (`task_analysis_id`,`resource_capability_id`);--> statement-breakpoint
CREATE INDEX `idx_reco_analysis` ON `resource_recommendation` (`task_analysis_id`);--> statement-breakpoint
CREATE INDEX `idx_reco_capability` ON `resource_recommendation` (`resource_capability_id`);--> statement-breakpoint
CREATE TABLE `task_analysis` (
	`id` text PRIMARY KEY NOT NULL,
	`task` text NOT NULL,
	`status` text NOT NULL,
	`strategy` text NOT NULL,
	`analyzer_version` text NOT NULL,
	`task_type` text,
	`created_at` text NOT NULL,
	`analyzed_at` text,
	`input_fingerprint` text NOT NULL,
	`is_current` integer DEFAULT false NOT NULL,
	`error_code` text,
	`error_message` text,
	`summary` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_task_analysis_fp_version` ON `task_analysis` (`task`,`input_fingerprint`,`analyzer_version`);--> statement-breakpoint
CREATE INDEX `idx_task_analysis_status` ON `task_analysis` (`status`);--> statement-breakpoint
CREATE INDEX `idx_task_analysis_created` ON `task_analysis` (`created_at`);--> statement-breakpoint
CREATE TABLE `task_requirement` (
	`id` text PRIMARY KEY NOT NULL,
	`task_analysis_id` text NOT NULL,
	`requirement_text` text NOT NULL,
	`category` text NOT NULL,
	`keywords` text DEFAULT '[]' NOT NULL,
	`weight` real DEFAULT 1 NOT NULL,
	`derived_from` text,
	`is_inferred` integer DEFAULT true NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`task_analysis_id`) REFERENCES `task_analysis`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_task_req_analysis_text` ON `task_requirement` (`task_analysis_id`,`requirement_text`);--> statement-breakpoint
CREATE INDEX `idx_task_req_analysis` ON `task_requirement` (`task_analysis_id`);