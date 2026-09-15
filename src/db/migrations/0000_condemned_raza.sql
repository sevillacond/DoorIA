CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"actor_name" text NOT NULL,
	"actor_role" varchar(50),
	"action" varchar(100) NOT NULL,
	"target" text,
	"result" varchar(50),
	"details" json,
	"reason" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "gates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" varchar(50) NOT NULL,
	"relay_pin" varchar(20),
	"status" varchar(20) DEFAULT 'fechado',
	"last_opened_at" timestamp,
	"last_opened_by" text
);
--> statement-breakpoint
CREATE TABLE "units" (
	"id" serial PRIMARY KEY NOT NULL,
	"number" varchar(10) NOT NULL,
	"block" varchar(50),
	"owner_name" text NOT NULL,
	"sip_extension" varchar(20),
	"financial_status" varchar(20) DEFAULT 'em_dia',
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "units_number_unique" UNIQUE("number")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" varchar(50) NOT NULL,
	"email" varchar(255),
	"unit_id" integer,
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE no action ON UPDATE no action;