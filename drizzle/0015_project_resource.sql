CREATE TABLE `project_resource` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`resource_id` text NOT NULL,
	`added_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `project`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`resource_id`) REFERENCES `discovered_resource`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_project_resource` ON `project_resource` (`project_id`,`resource_id`);
--> statement-breakpoint
CREATE INDEX `idx_project_resource_project` ON `project_resource` (`project_id`);
--> statement-breakpoint
CREATE INDEX `idx_project_resource_resource` ON `project_resource` (`resource_id`);
