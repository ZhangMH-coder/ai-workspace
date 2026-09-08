CREATE TABLE `discovered_resource` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_id` text NOT NULL,
	`harness_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`source` text NOT NULL,
	`source_path` text NOT NULL,
	`framework` text NOT NULL,
	`version` text,
	`status` text DEFAULT 'unknown' NOT NULL,
	`parseable` integer DEFAULT false NOT NULL,
	`parse_note` text,
	`last_modified` text,
	`metadata` text DEFAULT '{}' NOT NULL,
	FOREIGN KEY (`scan_id`) REFERENCES `scan_run`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_discovered_source_path` ON `discovered_resource` (`source_path`);--> statement-breakpoint
CREATE INDEX `idx_discovered_harness` ON `discovered_resource` (`harness_id`);--> statement-breakpoint
CREATE INDEX `idx_discovered_type` ON `discovered_resource` (`type`);--> statement-breakpoint
CREATE INDEX `idx_discovered_scan` ON `discovered_resource` (`scan_id`);--> statement-breakpoint
CREATE TABLE `harness_scan` (
	`id` text PRIMARY KEY NOT NULL,
	`scan_id` text NOT NULL,
	`harness_id` text NOT NULL,
	`harness_name` text NOT NULL,
	`root_path` text NOT NULL,
	`found` integer DEFAULT false NOT NULL,
	`resource_count` integer DEFAULT 0 NOT NULL,
	`scanned_at` text NOT NULL,
	FOREIGN KEY (`scan_id`) REFERENCES `scan_run`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_harness_scan_scan` ON `harness_scan` (`scan_id`);--> statement-breakpoint
CREATE TABLE `scan_run` (
	`id` text PRIMARY KEY NOT NULL,
	`status` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text NOT NULL,
	`scan_roots` text DEFAULT '[]' NOT NULL,
	`by_harness` text DEFAULT '{}' NOT NULL,
	`by_type` text DEFAULT '{}' NOT NULL,
	`total_resources` integer DEFAULT 0 NOT NULL,
	`parseable_count` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_scan_run_started` ON `scan_run` (`started_at`);