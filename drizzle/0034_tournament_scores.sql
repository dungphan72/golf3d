CREATE TABLE `tournament_rounds` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`post_id` text NOT NULL,
	`round_no` integer NOT NULL,
	`name` text NOT NULL,
	`holes` integer NOT NULL,
	`pars` text NOT NULL,
	`play_date` text DEFAULT '' NOT NULL,
	`created` integer NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_round_no` ON `tournament_rounds` (`tenant`,`post_id`,`round_no`);--> statement-breakpoint
CREATE TABLE `tournament_players` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`post_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text NOT NULL,
	`hcp10` integer DEFAULT 0 NOT NULL,
	`grp` text DEFAULT 'A' NOT NULL,
	`created` integer NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_player_phone` ON `tournament_players` (`tenant`,`post_id`,`phone`);--> statement-breakpoint
CREATE TABLE `tournament_scores` (
	`id` text PRIMARY KEY NOT NULL,
	`tenant` text NOT NULL,
	`round_id` text NOT NULL,
	`player_id` text NOT NULL,
	`holes` text NOT NULL,
	`status` text NOT NULL,
	`entered_by` text NOT NULL,
	`entered_by_name` text NOT NULL,
	`updated` integer NOT NULL,
	`reviewed_by_name` text DEFAULT '' NOT NULL,
	`reviewed_at` integer,
	`review_note` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`round_id`) REFERENCES `tournament_rounds`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`) REFERENCES `tournament_players`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
CREATE UNIQUE INDEX `tournament_score_once` ON `tournament_scores` (`round_id`,`player_id`);--> statement-breakpoint
CREATE INDEX `tournament_score_status` ON `tournament_scores` (`tenant`,`status`,`updated`);
