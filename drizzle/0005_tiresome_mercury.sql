CREATE TABLE `plan_dependency` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`from_step_id` text NOT NULL,
	`to_step_id` text NOT NULL,
	`type` text NOT NULL,
	`reason` text NOT NULL,
	`is_inferred` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `task_plan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`from_step_id`) REFERENCES `plan_step`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`to_step_id`) REFERENCES `plan_step`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_plan_dep_plan` ON `plan_dependency` (`plan_id`);--> statement-breakpoint
CREATE INDEX `idx_plan_dep_from` ON `plan_dependency` (`from_step_id`);--> statement-breakpoint
CREATE INDEX `idx_plan_dep_to` ON `plan_dependency` (`to_step_id`);--> statement-breakpoint
CREATE TABLE `plan_step` (
	`id` text PRIMARY KEY NOT NULL,
	`plan_id` text NOT NULL,
	`step_index` integer NOT NULL,
	`task_requirement_id` text NOT NULL,
	`requirement_text` text NOT NULL,
	`category` text NOT NULL,
	`primary_capability_id` text,
	`primary_resource_id` text,
	`score` real,
	`alternatives` text DEFAULT '[]' NOT NULL,
	`output_description` text NOT NULL,
	`expected_input` text,
	`satisfaction` text NOT NULL,
	`is_inferred` integer DEFAULT true NOT NULL,
	`sort_order` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `task_plan`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`task_requirement_id`) REFERENCES `task_requirement`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`primary_capability_id`) REFERENCES `resource_capability`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`primary_resource_id`) REFERENCES `discovered_resource`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_plan_step_plan_index` ON `plan_step` (`plan_id`,`step_index`);--> statement-breakpoint
CREATE INDEX `idx_plan_step_plan` ON `plan_step` (`plan_id`);--> statement-breakpoint
CREATE INDEX `idx_plan_step_requirement` ON `plan_step` (`task_requirement_id`);--> statement-breakpoint
CREATE TABLE `task_plan` (
	`id` text PRIMARY KEY NOT NULL,
	`task_analysis_id` text NOT NULL,
	`status` text NOT NULL,
	`planner_strategy` text NOT NULL,
	`planner_version` text NOT NULL,
	`created_at` text NOT NULL,
	`validation` text NOT NULL,
	`error_code` text,
	`error_message` text,
	FOREIGN KEY (`task_analysis_id`) REFERENCES `task_analysis`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_plan_analysis` ON `task_plan` (`task_analysis_id`);--> statement-breakpoint
CREATE INDEX `idx_plan_status` ON `task_plan` (`status`);