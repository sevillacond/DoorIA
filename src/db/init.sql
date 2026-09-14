-- ============================================================================
-- ENLACE-DOORIA: BANCO DE DADOS PURO LOCAL POSTGRESQL 16 LTS
-- Sistema de Portaria Autônoma Inteligente & Interfonia Local-First
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CONDOMÍNIO (DADOS MESTRES E CONFIGURAÇÃO DA GUARITA)
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
    number VARCHAR(32) NOT NULL,
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
    unit_id VARCHAR(64) REFERENCES units(id) ON DELETE CASCADE,
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
    unit_id VARCHAR(64) REFERENCES units(id) ON DELETE CASCADE,
    plate VARCHAR(16) NOT NULL UNIQUE,
    model VARCHAR(64) NOT NULL,
    brand VARCHAR(64),
    color VARCHAR(32),
    tag_rfid VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicles_plate ON vehicles(plate);

-- 5. PORTÕES E RELÉS CONTROLADOS (ANTI-ARROMBAMENTO)
CREATE TABLE IF NOT EXISTS gates (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    type VARCHAR(32) NOT NULL, -- pedestre, veiculos, servico, etc
    relay_index INTEGER NOT NULL DEFAULT 1,
    relay_ip VARCHAR(64) NOT NULL,
    dtmf_code VARCHAR(16) NOT NULL, -- ex: *07 pedestre, *08 veiculos
    is_open BOOLEAN DEFAULT FALSE,
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(32) NOT NULL DEFAULT 'online'
);

-- 6. CÂMERAS CFTV (go2rtc WebRTC)
CREATE TABLE IF NOT EXISTS camera_devices (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    location VARCHAR(128) NOT NULL,
    stream_url TEXT NOT NULL,
    webrtc_stream_id VARCHAR(64) NOT NULL,
    ip_address VARCHAR(64) NOT NULL,
    manufacturer VARCHAR(64) NOT NULL DEFAULT 'Intelbras',
    status VARCHAR(32) NOT NULL DEFAULT 'online',
    resolution VARCHAR(32) DEFAULT '1080p',
    fps INTEGER DEFAULT 25,
    bitrate VARCHAR(32) DEFAULT '2.0 Mbps'
);

-- 7. CONVITES DE VISITANTES COM QR CODE / PIN
CREATE TABLE IF NOT EXISTS visitor_invites (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) REFERENCES units(id) ON DELETE CASCADE,
    visitor_name VARCHAR(255) NOT NULL,
    visitor_document VARCHAR(32),
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    qr_code_token VARCHAR(255) NOT NULL UNIQUE,
    pin_code VARCHAR(16) NOT NULL,
    access_type VARCHAR(32) NOT NULL DEFAULT 'visita',
    allowed_gates TEXT[] DEFAULT ARRAY['gate-pedestre'],
    used BOOLEAN DEFAULT FALSE,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_visitor_token ON visitor_invites(qr_code_token);
CREATE INDEX IF NOT EXISTS idx_visitor_pin ON visitor_invites(pin_code);

-- 8. ENCOMENDAS E PACOTES
CREATE TABLE IF NOT EXISTS package_deliveries (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) REFERENCES units(id) ON DELETE CASCADE,
    courier_company VARCHAR(128) NOT NULL,
    tracking_code VARCHAR(128),
    description TEXT,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    collected_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(32) NOT NULL DEFAULT 'aguardando_retirada',
    notification_sent BOOLEAN DEFAULT TRUE
);

-- 9. RESERVAS DE ÁREAS COMUNS
CREATE TABLE IF NOT EXISTS common_area_reservations (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) REFERENCES units(id) ON DELETE CASCADE,
    resident_name VARCHAR(255) NOT NULL,
    area_id VARCHAR(64) NOT NULL,
    area_name VARCHAR(128) NOT NULL,
    reservation_date DATE NOT NULL,
    period VARCHAR(32) NOT NULL, -- diurno, noturno, integral
    status VARCHAR(32) NOT NULL DEFAULT 'confirmada',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. MÓDULO FINANCEIRO (BOLETOS & TAXAS)
CREATE TABLE IF NOT EXISTS financial_bills (
    id VARCHAR(64) PRIMARY KEY,
    unit_id VARCHAR(64) REFERENCES units(id) ON DELETE CASCADE,
    month_reference VARCHAR(16) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    due_date DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'a_vencer',
    barcode VARCHAR(128),
    pix_code TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. REGISTROS DE CHAMADAS DO INTERFONE (ASTERISK PBX)
CREATE TABLE IF NOT EXISTS call_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    caller_source VARCHAR(64) NOT NULL,
    caller_name VARCHAR(128) NOT NULL,
    destination_unit VARCHAR(32),
    duration_seconds INTEGER DEFAULT 0,
    status VARCHAR(32) NOT NULL,
    gate_opened BOOLEAN DEFAULT FALSE,
    gate_name VARCHAR(128),
    recording_url TEXT,
    audio_audit_data JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_call_logs_timestamp ON call_logs(timestamp DESC);

-- 12. LEITURA DE PLACAS LPR
CREATE TABLE IF NOT EXISTS lpr_logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    plate VARCHAR(16) NOT NULL,
    confidence NUMERIC(5,2) NOT NULL,
    gate_id VARCHAR(64),
    gate_name VARCHAR(128),
    authorized BOOLEAN DEFAULT FALSE,
    vehicle_model VARCHAR(64),
    unit_number VARCHAR(32)
);

CREATE INDEX IF NOT EXISTS idx_lpr_logs_timestamp ON lpr_logs(timestamp DESC);

-- 13. AUDITORIA IMUTÁVEL DO SISTEMA
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
    dtmf_command VARCHAR(16),
    details JSONB,
    sha256_hash VARCHAR(128)
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);

-- 14. USUÁRIOS E CREDENCIAIS LOCAIS (RBAC LOCAL-FIRST)
CREATE TABLE IF NOT EXISTS system_users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(64) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    display_name VARCHAR(128) NOT NULL,
    email VARCHAR(128),
    role VARCHAR(32) NOT NULL, -- super_admin, sindico, morador, portaria
    unit_id VARCHAR(64) REFERENCES units(id) ON DELETE SET NULL,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- SEED DATA BASELINE: CONDOMÍNIO SOLAR DAS PALMEIRAS (SÃO LUÍS - MA)
-- ============================================================================

INSERT INTO condominiums (
    id, name, trading_name, cnpj, address, units_count, blocks, floors_count, parking_spots_count,
    management_phone, emergency_phone, email, sindico, administrator, operational_settings, financial_settings, technical_settings
) VALUES (
    'condo-slz-01',
    'Condomínio Residencial Solar das Palmeiras',
    'Solar das Palmeiras Residencial',
    '34.891.022/0001-85',
    '{"street": "Av. dos Holandeses, Quadra 14", "number": "250", "complement": "Torre Única", "neighborhood": "Calhau", "city": "São Luís", "state": "MA", "zipCode": "65071-380"}'::jsonb,
    12,
    ARRAY['Bloco A'],
    3,
    18,
    '(98) 3235-9000',
    '(98) 98112-9900',
    'administracao@solardaspalmeiras.com.br',
    '{"name": "Henrique Vasconcelos de Alencar", "document": "482.319.403-12", "phone": "(98) 98455-2020", "email": "sindico@solardaspalmeiras.com.br", "apartment": "304"}'::jsonb,
    '{"name": "Enlace Administradora de Condomínios", "cnpj": "18.420.981/0001-30", "phone": "(98) 3227-4000", "email": "contato@enlacegestao.com.br"}'::jsonb,
    '{"dtmfPedestrian": "*07", "dtmfVehicle": "*08", "pedestrianGatePulseSeconds": 5, "vehicleGatePulseSeconds": 15, "openGateAlertSeconds": 60}'::jsonb,
    '{"dueDay": 10, "standardFee": 480.00, "pixKey": "34.891.022/0001-85", "bankName": "Banco do Brasil (001)"}'::jsonb,
    '{"localServerIp": "192.168.1.100", "asteriskVersion": "Asterisk 20.8 LTS Pure", "xpeModel": "Intelbras XPE-3115-IP", "xpeIp": "192.168.1.150"}'::jsonb
) ON CONFLICT (id) DO NOTHING;

-- Portões
INSERT INTO gates (id, name, type, relay_index, relay_ip, dtmf_code, is_open, status) VALUES
('gate-pedestre', 'Portão Social Pedestres (Eclusa)', 'pedestre', 1, '192.168.1.160', '*07', false, 'online'),
('gate-garagem', 'Portão Garagem Principal (Veículos)', 'veiculos', 2, '192.168.1.160', '*08', false, 'online'),
('gate-lixeira', 'Portão Acesso de Serviço & Lixeira', 'servico', 3, '192.168.1.160', '*09', false, 'online')
ON CONFLICT (id) DO NOTHING;

-- Câmeras
INSERT INTO camera_devices (id, name, location, stream_url, webrtc_stream_id, ip_address, manufacturer, status, resolution, fps, bitrate) VALUES
('cam-01', 'Câmera 01 - Totem XPE Portaria Calçada', 'rtsp://admin:admin@192.168.1.150:554/cam/realmonitor?channel=1&subtype=0', 'cam-01', '192.168.1.150', 'Intelbras', 'online', '720p HD', 25, '1.5 Mbps'),
('cam-02', 'Câmera 02 - Eclusa de Pedestres', 'rtsp://admin:Intelbras2026@192.168.1.151:554/cam/realmonitor?channel=1&subtype=0', 'cam-02', '192.168.1.151', 'Intelbras', 'online', '1080p Full HD', 30, '2.5 Mbps'),
('cam-03', 'Câmera 03 - Portão Garagem Veículos (LPR)', 'rtsp://admin:Hikvision2026@192.168.1.152:554/Streaming/Channels/101', 'cam-03', '192.168.1.152', 'Hikvision', 'online', '1080p Full HD', 30, '3.0 Mbps'),
('cam-04', 'Câmera 04 - Hall dos Elevadores Térreo', 'rtsp://admin:Intelbras2026@192.168.1.153:554/cam/realmonitor?channel=1&subtype=0', 'cam-04', '192.168.1.153', 'Intelbras', 'online', '1080p Full HD', 25, '2.0 Mbps')
ON CONFLICT (id) DO NOTHING;

-- 12 Unidades Habitacionais (101 a 104, 201 a 204, 301 a 304)
INSERT INTO units (id, number, block, floor, sip_extension, intercom_code, owner_name, owner_phone, financial_status) VALUES
('u-101', '101', 'Bloco A', 1, '101', '101', 'Carlos Eduardo Mendes', '(98) 98112-4011', 'em_dia'),
('u-102', '102', 'Bloco A', 1, '102', '102', 'Mariana Silveira Castro', '(98) 98822-1922', 'em_dia'),
('u-103', '103', 'Bloco A', 1, '103', '103', 'Roberto Alencar', '(98) 98401-3310', 'em_dia'),
('u-104', '104', 'Bloco A', 1, '104', '104', 'Juliana Barbosa', '(98) 99105-8844', 'em_dia'),
('u-201', '201', 'Bloco A', 2, '201', '201', 'Fernando Henrique Rocha', '(98) 98220-4499', 'em_dia'),
('u-202', '202', 'Bloco A', 2, '202', '202', 'Camila Vasconcelos', '(98) 98777-1010', 'em_dia'),
('u-203', '203', 'Bloco A', 2, '203', '203', 'Marcio Azevedo Lima', '(98) 98150-7766', 'inadimplente'),
('u-204', '204', 'Bloco A', 2, '204', '204', 'Tatiana Gusmão', '(98) 98330-9900', 'em_dia'),
('u-301', '301', 'Bloco A', 3, '301', '301', 'Rodrigo Fonseca', '(98) 98199-5522', 'em_dia'),
('u-302', '302', 'Bloco A', 3, '302', '302', 'Beatriz Nogueira', '(98) 98888-2144', 'em_acordo'),
('u-303', '303', 'Bloco A', 3, '303', '303', 'Gustavo Pinheiro', '(98) 98444-1234', 'em_dia'),
('u-304', '304', 'Bloco A', 3, '304', '304', 'Luciana Meireles', '(98) 98111-9988', 'em_dia')
ON CONFLICT (id) DO NOTHING;

-- Moradores e Ramais SIP
INSERT INTO residents (id, unit_id, name, document, phone, email, is_main_contact, sip_extension, sip_registered, webrtc_supported) VALUES
('r-101-1', 'u-101', 'Carlos Eduardo Mendes', '512.441.893-20', '(98) 98112-4011', 'carlos.mendes@gmail.com', true, '101', true, true),
('r-102-1', 'u-102', 'Mariana Silveira Castro', '614.992.123-45', '(98) 98822-1922', 'mariana.silveira@outlook.com', true, '102', true, true),
('r-103-1', 'u-103', 'Roberto Alencar', '321.456.789-00', '(98) 98401-3310', 'roberto.alencar@empresa.com.br', true, '103', true, true),
('r-104-1', 'u-104', 'Juliana Barbosa', '789.123.456-11', '(98) 99105-8844', 'juliana.barbosa@gmail.com', true, '104', true, true),
('r-201-1', 'u-201', 'Fernando Henrique Rocha (Síndico)', '445.109.876-54', '(98) 98220-4499', 'sindico.solar@gmail.com', true, '201', true, true),
('r-202-1', 'u-202', 'Camila Vasconcelos', '908.234.567-88', '(98) 98777-1010', 'camila.vasconcelos@adv.br', true, '202', true, true),
('r-203-1', 'u-203', 'Marcio Azevedo Lima', '334.887.654-32', '(98) 98150-7766', 'marcio.azevedo@gmail.com', true, '203', true, true),
('r-204-1', 'u-204', 'Tatiana Gusmão', '123.654.789-99', '(98) 98330-9900', 'tatiana.gusmao@gmail.com', true, '204', true, true),
('r-301-1', 'u-301', 'Rodrigo Fonseca', '876.543.210-44', '(98) 98199-5522', 'rodrigo.fonseca@eng.br', true, '301', true, true),
('r-302-1', 'u-302', 'Beatriz Nogueira', '654.987.321-00', '(98) 98888-2144', 'beatriz.nogueira@gmail.com', true, '302', true, true),
('r-303-1', 'u-303', 'Gustavo Pinheiro', '432.109.876-77', '(98) 98444-1234', 'gustavo.pinheiro@gmail.com', true, '303', true, true),
('r-304-1', 'u-304', 'Luciana Meireles', '210.987.654-88', '(98) 98111-9988', 'luciana.meireles@uol.com.br', true, '304', true, true)
ON CONFLICT (id) DO NOTHING;

-- Veículos
INSERT INTO vehicles (id, unit_id, plate, model, brand, color, tag_rfid) VALUES
('v-1', 'u-101', 'PTA-4A12', 'Corolla', 'Toyota', 'Prata', 'RFID-101-A'),
('v-2', 'u-102', 'ROX-8B90', 'HR-V', 'Honda', 'Preto', 'RFID-102-A'),
('v-3', 'u-201', 'SLZ-2C34', 'Compass', 'Jeep', 'Branco', 'RFID-201-A'),
('v-4', 'u-203', 'NMS-5511', 'HB20', 'Hyundai', 'Cinza', 'RFID-203-A'),
('v-5', 'u-301', 'MAO-9J88', 'Nivus', 'Volkswagen', 'Azul', 'RFID-301-A')
ON CONFLICT (plate) DO NOTHING;

-- Usuários e Credenciais do Sistema (RBAC Local)
INSERT INTO system_users (id, username, password_hash, display_name, email, role, unit_id, active) VALUES
('usr-admin', 'superadmin', '$2b$10$e8w.dummyhashforpilot2026dooriasuperadmin', 'Administrador Master', 'admin@enlacegestao.com.br', 'super_admin', NULL, true),
('usr-sindico', 'sindico', '$2b$10$e8w.dummyhashforpilot2026dooriasindico', 'Fernando Henrique Rocha (Síndico)', 'sindico.solar@gmail.com', 'sindico', 'u-201', true),
('usr-portaria', 'portaria', '$2b$10$e8w.dummyhashforpilot2026dooriaportaria', 'Operador da Guarita Local', 'guarita@solardaspalmeiras.com.br', 'portaria', NULL, true),
('usr-morador-101', 'morador101', '$2b$10$e8w.dummyhashforpilot2026dooriamorador101', 'Carlos Eduardo Mendes', 'carlos.mendes@gmail.com', 'morador', 'u-101', true)
ON CONFLICT (username) DO NOTHING;
