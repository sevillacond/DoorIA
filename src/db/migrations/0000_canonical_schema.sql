-- ============================================================================
-- ENLACE-DOORIA: DRIZZLE MIGRATION 0000_CANONICAL_SCHEMA (FONTE OFICIAL)
-- PostgreSQL 16 LTS Schema DDL Canônico Oficial
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CONDOMINIUMS
CREATE TABLE IF NOT EXISTS "condominiums" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"trading_name" varchar(255),
	"cnpj" varchar(32) NOT NULL,
	"address" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"units_count" integer DEFAULT 12 NOT NULL,
	"blocks" text[] DEFAULT ARRAY['Bloco A'] NOT NULL,
	"floors_count" integer DEFAULT 3 NOT NULL,
	"parking_spots_count" integer DEFAULT 18 NOT NULL,
	"management_phone" varchar(32),
	"emergency_phone" varchar(32),
	"email" varchar(128),
	"sindico" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"administrator" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"operational_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"financial_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"technical_settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);

-- 2. UNITS
CREATE TABLE IF NOT EXISTS "units" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"number" varchar(32) NOT NULL,
	"block" varchar(64) DEFAULT 'Bloco A' NOT NULL,
	"floor" integer DEFAULT 1 NOT NULL,
	"sip_extension" varchar(32) NOT NULL,
	"intercom_code" varchar(32) NOT NULL,
	"owner_name" varchar(255) NOT NULL,
	"owner_phone" varchar(32),
	"financial_status" varchar(32) DEFAULT 'em_dia' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "units_number_unique" UNIQUE("number")
);
CREATE INDEX IF NOT EXISTS "idx_units_number" ON "units" USING btree ("number");
CREATE INDEX IF NOT EXISTS "idx_units_sip_ext" ON "units" USING btree ("sip_extension");

-- 3. RESIDENTS
CREATE TABLE IF NOT EXISTS "residents" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"unit_id" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"document" varchar(32),
	"phone" varchar(32) NOT NULL,
	"email" varchar(128),
	"is_main_contact" boolean DEFAULT false,
	"sip_extension" varchar(32),
	"sip_registered" boolean DEFAULT false,
	"webrtc_supported" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "residents" ADD CONSTRAINT "residents_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "idx_residents_unit_id" ON "residents" USING btree ("unit_id");
CREATE INDEX IF NOT EXISTS "idx_residents_phone" ON "residents" USING btree ("phone");

-- 4. VEHICLES
CREATE TABLE IF NOT EXISTS "vehicles" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"unit_id" varchar(64) NOT NULL,
	"plate" varchar(16) NOT NULL,
	"model" varchar(64) NOT NULL,
	"brand" varchar(64),
	"color" varchar(32),
	"parking_spot" varchar(64),
	"tag_rfid" varchar(64),
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "vehicles_plate_unique" UNIQUE("plate")
);
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "idx_vehicles_plate" ON "vehicles" USING btree ("plate");

-- 5. GATES
CREATE TABLE IF NOT EXISTS "gates" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"type" varchar(32) NOT NULL,
	"relay_pin" integer DEFAULT 1 NOT NULL,
	"relay_ip" varchar(64) DEFAULT '192.168.1.160',
	"dtmf_code" varchar(16) NOT NULL,
	"is_open" boolean DEFAULT false,
	"status" varchar(32) DEFAULT 'fechado' NOT NULL,
	"sensor_state" varchar(64) DEFAULT 'ok',
	"last_opened_at" timestamp with time zone,
	"last_opened_by" varchar(128)
);

-- 6. CAMERA DEVICES
CREATE TABLE IF NOT EXISTS "camera_devices" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"location" varchar(128) NOT NULL,
	"profile" varchar(32) DEFAULT 'ONVIF_Profile_T' NOT NULL,
	"stream_url" text NOT NULL,
	"webrtc_stream_id" varchar(64) NOT NULL,
	"ip_address" varchar(64),
	"manufacturer" varchar(64) DEFAULT 'Intelbras',
	"model" varchar(128),
	"status" varchar(32) DEFAULT 'online' NOT NULL,
	"resolution" varchar(32) DEFAULT '1080p Full HD',
	"fps" integer DEFAULT 25,
	"bitrate" varchar(32) DEFAULT '2.0 Mbps',
	"is_xpe_integrated" boolean DEFAULT false
);

-- 7. VISITOR INVITES
CREATE TABLE IF NOT EXISTS "visitor_invites" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"unit_id" varchar(64) NOT NULL,
	"visitor_name" varchar(255) NOT NULL,
	"document" varchar(32),
	"type" varchar(32) DEFAULT 'visitante' NOT NULL,
	"qr_token" varchar(255) NOT NULL,
	"pin_code" varchar(16) NOT NULL,
	"valid_from" timestamp with time zone NOT NULL,
	"valid_until" timestamp with time zone NOT NULL,
	"status" varchar(32) DEFAULT 'ativo' NOT NULL,
	"allowed_gates" text[] DEFAULT ARRAY['gate-pedestre'],
	"entry_count" integer DEFAULT 0,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "visitor_invites_qr_token_unique" UNIQUE("qr_token")
);
ALTER TABLE "visitor_invites" ADD CONSTRAINT "visitor_invites_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "idx_visitor_qr_token" ON "visitor_invites" USING btree ("qr_token");
CREATE INDEX IF NOT EXISTS "idx_visitor_pin" ON "visitor_invites" USING btree ("pin_code");

-- 8. PACKAGE DELIVERIES
CREATE TABLE IF NOT EXISTS "package_deliveries" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"unit_id" varchar(64) NOT NULL,
	"courier" varchar(128) NOT NULL,
	"tracking_code" varchar(128),
	"description" text,
	"pickup_code" varchar(16) NOT NULL,
	"received_at" timestamp with time zone DEFAULT now(),
	"status" varchar(32) DEFAULT 'aguardando_retirada' NOT NULL,
	"picked_up_at" timestamp with time zone,
	"notification_sent" boolean DEFAULT true
);
ALTER TABLE "package_deliveries" ADD CONSTRAINT "package_deliveries_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "idx_packages_unit_id" ON "package_deliveries" USING btree ("unit_id");

-- 9. COMMON AREA RESERVATIONS
CREATE TABLE IF NOT EXISTS "common_area_reservations" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"unit_id" varchar(64) NOT NULL,
	"resident_name" varchar(255) NOT NULL,
	"area_id" varchar(64) NOT NULL,
	"area_name" varchar(128) NOT NULL,
	"reservation_date" date NOT NULL,
	"period" varchar(32) NOT NULL,
	"status" varchar(32) DEFAULT 'confirmada' NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "common_area_reservations" ADD CONSTRAINT "common_area_reservations_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "idx_reservations_date" ON "common_area_reservations" USING btree ("reservation_date");

-- 10. FINANCIAL BILLS
CREATE TABLE IF NOT EXISTS "financial_bills" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"unit_id" varchar(64) NOT NULL,
	"unit_number" varchar(32) NOT NULL,
	"competencia" varchar(16) NOT NULL,
	"vencimento" timestamp with time zone NOT NULL,
	"taxa_ordinaria" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"taxa_extraordinaria" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"fundo_reserva" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"consumo_gas_agua" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"valor_original" numeric(10, 2) NOT NULL,
	"multa" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"juros" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"correcao" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"desconto" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"valor_total" numeric(10, 2) NOT NULL,
	"dias_atraso" integer DEFAULT 0,
	"status" varchar(32) DEFAULT 'pendente' NOT NULL,
	"pago_em" timestamp with time zone,
	"metodo_pagamento" varchar(32),
	"codigo_barras" varchar(128),
	"linha_digitavel" varchar(128),
	"pix_copia_cola" text,
	"external_id" varchar(128),
	"receipt_url" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
ALTER TABLE "financial_bills" ADD CONSTRAINT "financial_bills_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX IF NOT EXISTS "idx_bills_unit_id" ON "financial_bills" USING btree ("unit_id");
CREATE INDEX IF NOT EXISTS "idx_bills_competencia" ON "financial_bills" USING btree ("competencia");
CREATE INDEX IF NOT EXISTS "idx_bills_status" ON "financial_bills" USING btree ("status");

-- 11. FINANCIAL AGREEMENTS
CREATE TABLE IF NOT EXISTS "financial_agreements" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"unit_id" varchar(64) NOT NULL,
	"unit_number" varchar(32) NOT NULL,
	"total_original" numeric(10, 2) NOT NULL,
	"total_negociado" numeric(10, 2) NOT NULL,
	"entrada" numeric(10, 2) DEFAULT '0.00' NOT NULL,
	"parcelas_total" integer NOT NULL,
	"parcelas_pagas" integer DEFAULT 0 NOT NULL,
	"valor_parcela" numeric(10, 2) NOT NULL,
	"dia_vencimento" integer DEFAULT 10 NOT NULL,
	"data_criacao" timestamp with time zone DEFAULT now(),
	"status" varchar(32) DEFAULT 'ativo' NOT NULL
);
ALTER TABLE "financial_agreements" ADD CONSTRAINT "financial_agreements_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE cascade ON UPDATE no action;

-- 12. CALL LOGS
CREATE TABLE IF NOT EXISTS "call_logs" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"origin" varchar(32) NOT NULL,
	"unit_number" varchar(32) NOT NULL,
	"purpose" varchar(32) DEFAULT 'outro' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"duration_seconds" integer DEFAULT 0 NOT NULL,
	"status" varchar(32) NOT NULL,
	"answered_by" varchar(128),
	"gate_opened" varchar(128),
	"has_recording" boolean DEFAULT false,
	"recording_id" varchar(128),
	"audio_audit_data" jsonb DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS "idx_call_logs_started_at" ON "call_logs" USING btree ("started_at");

-- 13. LPR LOGS
CREATE TABLE IF NOT EXISTS "lpr_logs" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now(),
	"plate" varchar(16) NOT NULL,
	"confidence" numeric(5, 2) NOT NULL,
	"camera_name" varchar(128) NOT NULL,
	"matched_vehicle_id" varchar(64),
	"matched_unit_number" varchar(32),
	"action" varchar(64) NOT NULL,
	"reason" text NOT NULL,
	"snapshot_url" text
);
CREATE INDEX IF NOT EXISTS "idx_lpr_logs_timestamp" ON "lpr_logs" USING btree ("timestamp");
CREATE INDEX IF NOT EXISTS "idx_lpr_logs_plate" ON "lpr_logs" USING btree ("plate");

-- 14. AUDIT LOGS (SECURITY AUDIT TRAIL COM SHA-256)
CREATE TABLE IF NOT EXISTS "audit_logs" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now(),
	"actor" varchar(128) NOT NULL,
	"role" varchar(64) NOT NULL,
	"action" varchar(128) NOT NULL,
	"target" varchar(128) NOT NULL,
	"status" varchar(64) NOT NULL,
	"reason" text,
	"ip_address" varchar(64),
	"user_agent" text,
	"correlation_id" varchar(64),
	"dtmf_command" varchar(16),
	"details" jsonb DEFAULT '{}'::jsonb,
	"sha256_hash" varchar(128)
);
CREATE INDEX IF NOT EXISTS "idx_audit_logs_timestamp" ON "audit_logs" USING btree ("timestamp");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_actor" ON "audit_logs" USING btree ("actor");
CREATE INDEX IF NOT EXISTS "idx_audit_logs_action" ON "audit_logs" USING btree ("action");

-- 15. SYSTEM USERS
CREATE TABLE IF NOT EXISTS "system_users" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"username" varchar(64) NOT NULL,
	"password_hash" varchar(255) NOT NULL,
	"salt" varchar(64) NOT NULL,
	"display_name" varchar(128) NOT NULL,
	"email" varchar(128),
	"role" varchar(32) NOT NULL,
	"unit_id" varchar(64),
	"unit_number" varchar(32),
	"active" boolean DEFAULT true,
	"mfa_enabled" boolean DEFAULT false,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now(),
	CONSTRAINT "system_users_username_unique" UNIQUE("username")
);
ALTER TABLE "system_users" ADD CONSTRAINT "system_users_unit_id_units_id_fk" FOREIGN KEY ("unit_id") REFERENCES "public"."units"("id") ON DELETE set null ON UPDATE no action;
CREATE UNIQUE INDEX IF NOT EXISTS "idx_system_users_username" ON "system_users" USING btree ("username");

-- 16. IOT DEVICES
CREATE TABLE IF NOT EXISTS "iot_devices" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"type" varchar(32) NOT NULL,
	"protocol" varchar(32) DEFAULT 'zigbee_3_0' NOT NULL,
	"gateway" varchar(64) DEFAULT 'NovaDigital_HNZ_CB3' NOT NULL,
	"state" varchar(32) DEFAULT 'desligado' NOT NULL,
	"battery_level" integer,
	"online" boolean DEFAULT true NOT NULL,
	"location" varchar(128) NOT NULL
);

-- 17. AUTOMATION RULES
CREATE TABLE IF NOT EXISTS "automation_rules" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"name" varchar(128) NOT NULL,
	"description" text NOT NULL,
	"trigger_event" varchar(64) NOT NULL,
	"condition" text NOT NULL,
	"action" text NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"last_executed_at" timestamp with time zone
);
