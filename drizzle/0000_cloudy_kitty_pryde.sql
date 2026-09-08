CREATE TABLE `agent_capability` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`capability_id` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`agent_id`) REFERENCES `agent`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`capability_id`) REFERENCES `capability_definition`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_agent_capability` ON `agent_capability` (`agent_id`,`capability_id`);--> statement-breakpoint
CREATE INDEX `idx_agent_capability_agent` ON `agent_capability` (`agent_id`);--> statement-breakpoint
CREATE INDEX `idx_agent_capability_capability` ON `agent_capability` (`capability_id`);--> statement-breakpoint
CREATE TABLE `agent_run` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`status` text NOT NULL,
	`summary` text DEFAULT '' NOT NULL,
	`duration_ms` integer,
	`tokens_used` integer DEFAULT 0 NOT NULL,
	`messages` integer DEFAULT 0 NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	FOREIGN KEY (`agent_id`) REFERENCES `agent`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_agent_run_agent_started` ON `agent_run` (`agent_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `idx_agent_run_started` ON `agent_run` (`started_at`);--> statement-breakpoint
CREATE TABLE `agent` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`model` text NOT NULL,
	`status` text DEFAULT 'idle' NOT NULL,
	`system_prompt` text DEFAULT '' NOT NULL,
	`created_at` text NOT NULL,
	`last_run_at` text
);
--> statement-breakpoint
CREATE INDEX `idx_agent_status` ON `agent` (`status`);--> statement-breakpoint
CREATE TABLE `capability_definition` (
	`id` text PRIMARY KEY NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`lifecycle` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_capability_type` ON `capability_definition` (`type`);--> statement-breakpoint
CREATE TABLE `project_agent` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`added_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`agent_id`) REFERENCES `agent`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_project_agent` ON `project_agent` (`project_id`,`agent_id`);--> statement-breakpoint
CREATE INDEX `idx_project_agent_project` ON `project_agent` (`project_id`);--> statement-breakpoint
CREATE INDEX `idx_project_agent_agent` ON `project_agent` (`agent_id`);--> statement-breakpoint
CREATE TABLE `project` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_project_status` ON `project` (`status`);