-- ============================================================================
-- ENLACE-DOORIA: DDL CANÔNICO POSTGRESQL 16 LTS
-- Este arquivo é sincronizado 1:1 com o schema oficial Drizzle (src/db/schema.ts)
-- NÃO CONTÉM DADOS DE SEED. Para dados iniciais, execute: npm run db:seed
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CONDOMÍNIO (DADOS MESTRES E CONFIGURAÇÕES)
CREATE TABLE IF NOT EXISTS condominiums (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    trading_name VARCHAR(255),
    cnpj VARCHAR(32) NOT NULL,
    address JSONB NOT NULL DEFAULT '{}'::jsonb,
    units_count INTEGER NOT NULL DEFAULT 12,
    blocks TEXT[] NOT NULL DEFAULT ARRAY['Bloco A'],
    floors_count INTEGER NOT NULL DEFAULT 3,
    parking_spots_count INTEGER NOT NULL DEFAULT 18,
    management_phone VARCHAR(32),
    emergency_phone VARCHAR(32),
    email VARCHAR(128),
    sindico JSONB NOT NULL DEFAULT '{}'::jsonb,
    administrator JSONB NOT NULL DEFAULT '{}'::jsonb,
    operational_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    financial_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    technical_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. UNIDADES HABITACIONAIS (APARTAMENTOS / CASAS)
CREATE TABLE IF NOT EXISTS units (
    id VARCHAR(64) PRIMARY KEY,
    number VARCHAR(32) NOT NULL UNIQUE,
    block VARCHAR(64) NOT NULL DEFAULT 'Bloco A',
    floor INTEGER NOT NULL DEFAULT 1,
    sip_extension VARCHAR(32) NOT NULL,
    intercom_code VARCHAR(32) NOT NULL,
    owner_name VARCHAR(255) NOT NULL,
    owner_phone VARCHAR(32),
    financial_status VARCHAR(32) NOT NULL DEFAULT 'em_dia',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_units_number ON units(number);
CREATE INDEX IF NOT EXISTS idx_units_sip_ext ON units(sip_extension);

-- 3. MORADORES
CREATE TABLE IF NOT EXISTS residents (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    document VARCHAR(32),
    phone VARCHAR(32) NOT NULL,
    email VARCHAR(128),
    is_main_contact BOOLEAN DEFAULT FALSE,
    sip_extension VARCHAR(32),
    sip_registered BOOLEAN DEFAULT FALSE,
    webrtc_supported BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_residents_unit_id ON residents(unit_id);
CREATE INDEX IF NOT EXISTS idx_residents_phone ON residents(phone);

-- 4. VEÍCULOS DOS MORADORES
CREATE TABLE IF NOT EXISTS vehicles (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    plate VARCHAR(16) NOT NULL UNIQUE,
    model VARCHAR(64) NOT NULL,
    brand VARCHAR(64),
    color VARCHAR(32),
    parking_spot VARCHAR(64),
    tag_rfid VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate);

-- 5. PORTÕES E RELÉS CONTROLADOS (ANTI-ARROMBAMENTO)
CREATE TABLE IF NOT EXISTS gates (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL,
    relay_pin INTEGER NOT NULL DEFAULT 1,
    relay_ip VARCHAR(64) DEFAULT '192.168.1.160',
    dtmf_code VARCHAR(16) NOT NULL,
    is_open BOOLEAN DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'fechado',
    sensor_state VARCHAR(64) DEFAULT 'ok',
    last_opened_at TIMESTAMP WITH TIME ZONE,
    last_opened_by VARCHAR(128)
);

-- 6. CÂMERAS CFTV (go2rtc / WebRTC / ONVIF)
CREATE TABLE IF NOT EXISTS camera_devices (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    location VARCHAR(128) NOT NULL,
    profile VARCHAR(32) NOT NULL DEFAULT 'ONVIF_Profile_T',
    stream_url TEXT NOT NULL,
    webrtc_stream_id VARCHAR(64) NOT NULL,
    ip_address VARCHAR(64),
    manufacturer VARCHAR(64) DEFAULT 'Intelbras',
    model VARCHAR(128),
    status VARCHAR(32) NOT NULL DEFAULT 'online',
    resolution VARCHAR(32) DEFAULT '1080p Full HD',
    fps INTEGER DEFAULT 25,
    bitrate VARCHAR(32) DEFAULT '2.0 Mbps',
    is_xpe_integrated BOOLEAN DEFAULT FALSE
);

-- 7. CONVITES DE VISITANTES (QR CODE / PIN)
CREATE TABLE IF NOT EXISTS visitor_invites (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    visitor_name VARCHAR(255) NOT NULL,
    document VARCHAR(32),
    type VARCHAR(32) NOT NULL DEFAULT 'visitante',
    qr_token VARCHAR(255) NOT NULL UNIQUE,
    pin_code VARCHAR(16) NOT NULL,
    valid_from TIMESTAMP WITH TIME ZONE NOT NULL,
    valid_until TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'ativo',
    allowed_gates TEXT[] DEFAULT ARRAY['gate-pedestre'],
    entry_count INTEGER DEFAULT 0,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visitor_qr_token ON visitor_invites(qr_token);
CREATE INDEX IF NOT EXISTS idx_visitor_pin ON visitor_invites(pin_code);

-- 8. ENCOMENDAS E PACOTES
CREATE TABLE IF NOT EXISTS package_deliveries (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    courier VARCHAR(128) NOT NULL,
    tracking_code VARCHAR(128),
    description TEXT,
    pickup_code VARCHAR(16) NOT NULL,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) NOT NULL DEFAULT 'aguardando_retirada',
    picked_up_at TIMESTAMP WITH TIME ZONE,
    notification_sent BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_packages_unit_id ON package_deliveries(unit_id);

-- 9. RESERVAS DE ÁREAS COMUNS
CREATE TABLE IF NOT EXISTS common_area_reservations (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    resident_name VARCHAR(255) NOT NULL,
    area_id VARCHAR(64) NOT NULL,
    area_name VARCHAR(128) NOT NULL,
    reservation_date DATE NOT NULL,
    period VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'confirmada',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reservations_date ON common_area_reservations(reservation_date);

-- 10. MÓDULO FINANCEIRO (COBRANÇAS CONDOMINIAIS ESTRUTURADAS)
CREATE TABLE IF NOT EXISTS financial_bills (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    unit_number VARCHAR(32) NOT NULL,
    competencia VARCHAR(16) NOT NULL,
    vencimento TIMESTAMP WITH TIME ZONE NOT NULL,
    taxa_ordinaria NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    taxa_extraordinaria NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    fundo_reserva NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    consumo_gas_agua NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    valor_original NUMERIC(10,2) NOT NULL,
    multa NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    juros NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    correcao NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    desconto NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    valor_total NUMERIC(10,2) NOT NULL,
    dias_atraso INTEGER DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'pendente',
    pago_em TIMESTAMP WITH TIME ZONE,
    metodo_pagamento VARCHAR(32),
    codigo_barras VARCHAR(128),
    linha_digitavel VARCHAR(128),
    pix_copia_cola TEXT,
    external_id VARCHAR(128),
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_bills_unit_id ON financial_bills(unit_id);
CREATE INDEX IF NOT EXISTS idx_bills_competencia ON financial_bills(competencia);
CREATE INDEX IF NOT EXISTS idx_bills_status ON financial_bills(status);

-- 11. ACORDOS DE PARCELAMENTO FINANCEIRO
CREATE TABLE IF NOT EXISTS financial_agreements (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) NOT NULL REFERENCES units(id) ON DELETE CASCADE,
    unit_number VARCHAR(32) NOT NULL,
    total_original NUMERIC(10,2) NOT NULL,
    total_negociado NUMERIC(10,2) NOT NULL,
    entrada NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    parcelas_total INTEGER NOT NULL,
    parcelas_pagas INTEGER NOT NULL DEFAULT 0,
    valor_parcela NUMERIC(10,2) NOT NULL,
    dia_vencimento INTEGER NOT NULL DEFAULT 10,
    data_criacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(32) NOT NULL DEFAULT 'ativo'
);

-- 12. REGISTROS DE CHAMADAS DO INTERFONE (ASTERISK PBX)
CREATE TABLE IF NOT EXISTS call_logs (
    id VARCHAR(64) PRIMARY KEY,
    origin VARCHAR(32) NOT NULL,
    unit_number VARCHAR(32) NOT NULL,
    purpose VARCHAR(32) NOT NULL DEFAULT 'outro',
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    duration_seconds INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL,
    answered_by VARCHAR(128),
    gate_opened VARCHAR(128),
    has_recording BOOLEAN DEFAULT FALSE,
    recording_id VARCHAR(128),
    audio_audit_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_call_logs_started_at ON call_logs(started_at DESC);

-- 13. LEITURA DE PLACAS LPR
CREATE TABLE IF NOT EXISTS lpr_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    plate VARCHAR(16) NOT NULL,
    confidence NUMERIC(5,2) NOT NULL,
    camera_name VARCHAR(128) NOT NULL,
    matched_vehicle_id VARCHAR(64),
    matched_unit_number VARCHAR(32),
    action VARCHAR(64) NOT NULL,
    reason TEXT NOT NULL,
    snapshot_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_lpr_logs_timestamp ON lpr_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_lpr_logs_plate ON lpr_logs(plate);

-- 14. AUDITORIA IMUTÁVEL DO SISTEMA
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actor VARCHAR(128) NOT NULL,
    role VARCHAR(64) NOT NULL,
    action VARCHAR(128) NOT NULL,
    target VARCHAR(128) NOT NULL,
    status VARCHAR(64) NOT NULL,
    reason TEXT,
    ip_address VARCHAR(64),
    user_agent TEXT,
    correlation_id VARCHAR(64),
    dtmf_command VARCHAR(16),
    details JSONB DEFAULT '{}'::jsonb,
    sha256_hash VARCHAR(128)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- 15. USUÁRIOS E CREDENCIAIS LOCAIS (RBAC LOCAL-FIRST SEGURO)
CREATE TABLE IF NOT EXISTS system_users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    salt VARCHAR(64) NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    email VARCHAR(128),
    role VARCHAR(32) NOT NULL,
    unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
    unit_number VARCHAR(32),
    active BOOLEAN DEFAULT TRUE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_system_users_username ON system_users(username);

-- 16. DISPOSITIVOS IOT & RELÉS
CREATE TABLE IF NOT EXISTS iot_devices (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL,
    protocol VARCHAR(32) NOT NULL DEFAULT 'zigbee_3_0',
    gateway VARCHAR(64) NOT NULL DEFAULT 'NovaDigital_HNZ_CB3',
    state VARCHAR(32) NOT NULL DEFAULT 'desligado',
    battery_level INTEGER,
    online BOOLEAN NOT NULL DEFAULT TRUE,
    location VARCHAR(128) NOT NULL
);

-- 17. REGRAS DE AUTOMAÇÃO DE EVENTOS
CREATE TABLE IF NOT EXISTS automation_rules (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    description TEXT NOT NULL,
    trigger_event VARCHAR(64) NOT NULL,
    condition TEXT NOT NULL,
    action TEXT NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_executed_at TIMESTAMP WITH TIME ZONE
);
