import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  integer,
  numeric,
  jsonb,
  date,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ============================================================================
// ENLACE-DOORIA: SCHEMA OFICIAL POSTGRESQL 16 LTS (FONTE ÚNICA DA VERDADE)
// Modelagem Relacional Completa do Sistema de Portaria Autônoma & Interfonia
// ============================================================================

// 1. CONDOMÍNIO (DADOS MESTRES E CONFIGURAÇÕES CENTRAIS)
export const condominiums = pgTable('condominiums', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  tradingName: varchar('trading_name', { length: 255 }),
  cnpj: varchar('cnpj', { length: 32 }).notNull(),
  address: jsonb('address').notNull().default({}),
  unitsCount: integer('units_count').notNull().default(12),
  blocks: text('blocks').array().notNull().default(['Bloco A']),
  floorsCount: integer('floors_count').notNull().default(3),
  parkingSpotsCount: integer('parking_spots_count').notNull().default(18),
  managementPhone: varchar('management_phone', { length: 32 }),
  emergencyPhone: varchar('emergency_phone', { length: 32 }),
  email: varchar('email', { length: 128 }),
  sindico: jsonb('sindico').notNull().default({}),
  administrator: jsonb('administrator').notNull().default({}),
  operationalSettings: jsonb('operational_settings').notNull().default({}),
  financialSettings: jsonb('financial_settings').notNull().default({}),
  technicalSettings: jsonb('technical_settings').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// 2. UNIDADES HABITACIONAIS (APARTAMENTOS / CASAS)
export const units = pgTable(
  'units',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    number: varchar('number', { length: 32 }).notNull().unique(),
    block: varchar('block', { length: 64 }).notNull().default('Bloco A'),
    floor: integer('floor').notNull().default(1),
    sipExtension: varchar('sip_extension', { length: 32 }).notNull(),
    intercomCode: varchar('intercom_code', { length: 32 }).notNull(),
    ownerName: varchar('owner_name', { length: 255 }).notNull(),
    ownerPhone: varchar('owner_phone', { length: 32 }),
    financialStatus: varchar('financial_status', { length: 32 }).notNull().default('em_dia'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_units_number').on(table.number),
    index('idx_units_sip_ext').on(table.sipExtension),
  ]
);

// 3. MORADORES (VINCULADOS ÀS UNIDADES)
export const residents = pgTable(
  'residents',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    unitId: varchar('unit_id', { length: 64 })
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    document: varchar('document', { length: 32 }),
    phone: varchar('phone', { length: 32 }).notNull(),
    email: varchar('email', { length: 128 }),
    isMainContact: boolean('is_main_contact').default(false),
    sipExtension: varchar('sip_extension', { length: 32 }),
    sipRegistered: boolean('sip_registered').default(false),
    webrtcSupported: boolean('webrtc_supported').default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_residents_unit_id').on(table.unitId),
    index('idx_residents_phone').on(table.phone),
  ]
);

// 4. VEÍCULOS DOS MORADORES
export const vehicles = pgTable(
  'vehicles',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    unitId: varchar('unit_id', { length: 64 })
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    plate: varchar('plate', { length: 16 }).notNull().unique(),
    model: varchar('model', { length: 64 }).notNull(),
    brand: varchar('brand', { length: 64 }),
    color: varchar('color', { length: 32 }),
    parkingSpot: varchar('parking_spot', { length: 64 }),
    tagRfid: varchar('tag_rfid', { length: 64 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_vehicles_plate').on(table.plate),
  ]
);

// 5. PORTÕES E RELÉS (CONTROLE DE ACESSO ANTI-ARROMBAMENTO)
export const gates = pgTable('gates', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  type: varchar('type', { length: 32 }).notNull(), // pedestre, garagem, servico
  relayPin: integer('relay_pin').notNull().default(1),
  relayIp: varchar('relay_ip', { length: 64 }).default('192.168.1.160'),
  dtmfCode: varchar('dtmf_code', { length: 16 }).notNull(), // *07, *08
  isOpen: boolean('is_open').default(false),
  status: varchar('status', { length: 32 }).notNull().default('fechado'), // fechado, abrindo, aberto, fechando
  sensorState: varchar('sensor_state', { length: 64 }).default('ok'), // ok, alerta_aberto_tempo_excessivo, sensor_obstruido
  lastOpenedAt: timestamp('last_opened_at', { withTimezone: true }),
  lastOpenedBy: varchar('last_opened_by', { length: 128 }),
});

// 6. CÂMERAS CFTV (go2rtc / WebRTC / ONVIF)
export const cameraDevices = pgTable('camera_devices', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  location: varchar('location', { length: 128 }).notNull(),
  profile: varchar('profile', { length: 32 }).notNull().default('ONVIF_Profile_T'),
  streamUrl: text('stream_url').notNull(),
  webrtcStreamId: varchar('webrtc_stream_id', { length: 64 }).notNull(),
  ipAddress: varchar('ip_address', { length: 64 }),
  manufacturer: varchar('manufacturer', { length: 64 }).default('Intelbras'),
  model: varchar('model', { length: 128 }),
  status: varchar('status', { length: 32 }).notNull().default('online'),
  resolution: varchar('resolution', { length: 32 }).default('1080p Full HD'),
  fps: integer('fps').default(25),
  bitrate: varchar('bitrate', { length: 32 }).default('2.0 Mbps'),
  isXpeIntegrated: boolean('is_xpe_integrated').default(false),
});

// 7. CONVITES DE VISITANTES (QR CODE CRIPTOGRÁFICO / PIN)
export const visitorInvites = pgTable(
  'visitor_invites',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    unitId: varchar('unit_id', { length: 64 })
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    visitorName: varchar('visitor_name', { length: 255 }).notNull(),
    document: varchar('document', { length: 32 }),
    type: varchar('type', { length: 32 }).notNull().default('visitante'), // visitante, entrega, prestador
    qrToken: varchar('qr_token', { length: 255 }).notNull().unique(),
    pinCode: varchar('pin_code', { length: 16 }).notNull(),
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validUntil: timestamp('valid_until', { withTimezone: true }).notNull(),
    status: varchar('status', { length: 32 }).notNull().default('ativo'), // ativo, usado, expirado, revogado
    allowedGates: text('allowed_gates').array().default(['gate-pedestre']),
    entryCount: integer('entry_count').default(0),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_visitor_qr_token').on(table.qrToken),
    index('idx_visitor_pin').on(table.pinCode),
  ]
);

// 8. ENCOMENDAS E PACOTES
export const packageDeliveries = pgTable(
  'package_deliveries',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    unitId: varchar('unit_id', { length: 64 })
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    courier: varchar('courier', { length: 128 }).notNull(),
    trackingCode: varchar('tracking_code', { length: 128 }),
    description: text('description'),
    pickupCode: varchar('pickup_code', { length: 16 }).notNull(),
    receivedAt: timestamp('received_at', { withTimezone: true }).defaultNow(),
    status: varchar('status', { length: 32 }).notNull().default('aguardando_retirada'), // aguardando_retirada, entregue
    pickedUpAt: timestamp('picked_up_at', { withTimezone: true }),
    notificationSent: boolean('notification_sent').default(true),
  },
  (table) => [
    index('idx_packages_unit_id').on(table.unitId),
  ]
);

// 9. RESERVAS DE ÁREAS COMUNS
export const commonAreaReservations = pgTable(
  'common_area_reservations',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    unitId: varchar('unit_id', { length: 64 })
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    residentName: varchar('resident_name', { length: 255 }).notNull(),
    areaId: varchar('area_id', { length: 64 }).notNull(),
    areaName: varchar('area_name', { length: 128 }).notNull(),
    reservationDate: date('reservation_date').notNull(),
    period: varchar('period', { length: 32 }).notNull(), // diurno, noturno, integral
    status: varchar('status', { length: 32 }).notNull().default('confirmada'),
    notes: text('notes'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_reservations_date').on(table.reservationDate),
  ]
);

// 10. MÓDULO FINANCEIRO (COBRANÇAS CONDOMINIAIS ESTRUTURADAS)
export const financialBills = pgTable(
  'financial_bills',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    unitId: varchar('unit_id', { length: 64 })
      .notNull()
      .references(() => units.id, { onDelete: 'cascade' }),
    unitNumber: varchar('unit_number', { length: 32 }).notNull(),
    competencia: varchar('competencia', { length: 16 }).notNull(), // ex: "08/2026"
    vencimento: timestamp('vencimento', { withTimezone: true }).notNull(),
    
    // Composição analítica da taxa condominial
    taxaOrdinaria: numeric('taxa_ordinaria', { precision: 10, scale: 2 }).notNull().default('0.00'),
    taxaExtraordinaria: numeric('taxa_extraordinaria', { precision: 10, scale: 2 }).notNull().default('0.00'),
    fundoReserva: numeric('fundo_reserva', { precision: 10, scale: 2 }).notNull().default('0.00'),
    consumoGasAgua: numeric('consumo_gas_agua', { precision: 10, scale: 2 }).notNull().default('0.00'),
    
    // Encargos e correções por atraso
    valorOriginal: numeric('valor_original', { precision: 10, scale: 2 }).notNull(),
    multa: numeric('multa', { precision: 10, scale: 2 }).notNull().default('0.00'),
    juros: numeric('juros', { precision: 10, scale: 2 }).notNull().default('0.00'),
    correcao: numeric('correcao', { precision: 10, scale: 2 }).notNull().default('0.00'),
    desconto: numeric('desconto', { precision: 10, scale: 2 }).notNull().default('0.00'),
    valorTotal: numeric('valor_total', { precision: 10, scale: 2 }).notNull(),
    
    diasAtraso: integer('dias_atraso').default(0),
    status: varchar('status', { length: 32 }).notNull().default('pendente'), // pago, pendente, atrasado, em_acordo
    pagoEm: timestamp('pago_em', { withTimezone: true }),
    metodoPagamento: varchar('metodo_pagamento', { length: 32 }), // pix, boleto, enlace_pay
    
    // Dados de cobrança bancária / Enlace-Pay
    codigoBarras: varchar('codigo_barras', { length: 128 }),
    linhaDigitavel: varchar('linha_digitavel', { length: 128 }),
    pixCopiaCola: text('pix_copia_cola'),
    externalId: varchar('external_id', { length: 128 }), // ID da cobrança no banco ou Enlace-Pay
    receiptUrl: text('receipt_url'),
    
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    index('idx_bills_unit_id').on(table.unitId),
    index('idx_bills_competencia').on(table.competencia),
    index('idx_bills_status').on(table.status),
  ]
);

// 11. ACORDOS DE PARCELAMENTO FINANCEIRO
export const financialAgreements = pgTable('financial_agreements', {
  id: varchar('id', { length: 64 }).primaryKey(),
  unitId: varchar('unit_id', { length: 64 })
    .notNull()
    .references(() => units.id, { onDelete: 'cascade' }),
  unitNumber: varchar('unit_number', { length: 32 }).notNull(),
  totalOriginal: numeric('total_original', { precision: 10, scale: 2 }).notNull(),
  totalNegociado: numeric('total_negociado', { precision: 10, scale: 2 }).notNull(),
  entrada: numeric('entrada', { precision: 10, scale: 2 }).notNull().default('0.00'),
  parcelasTotal: integer('parcelas_total').notNull(),
  parcelasPagas: integer('parcelas_pagas').notNull().default(0),
  valorParcela: numeric('valor_parcela', { precision: 10, scale: 2 }).notNull(),
  diaVencimento: integer('dia_vencimento').notNull().default(10),
  dataCriacao: timestamp('data_criacao', { withTimezone: true }).defaultNow(),
  status: varchar('status', { length: 32 }).notNull().default('ativo'), // ativo, concluido, rompido
});

// 12. REGISTROS DE CHAMADAS DO INTERFONE (ASTERISK PBX PURE)
export const callLogs = pgTable(
  'call_logs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    origin: varchar('origin', { length: 32 }).notNull(), // xpe_3115_ip, qr_virtual_intercom, app_webrtc
    unitNumber: varchar('unit_number', { length: 32 }).notNull(),
    purpose: varchar('purpose', { length: 32 }).notNull().default('outro'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    durationSeconds: integer('duration_seconds').notNull().default(0),
    status: varchar('status', { length: 32 }).notNull(), // atendida, nao_atendida, recusada
    answeredBy: varchar('answered_by', { length: 128 }),
    gateOpened: varchar('gate_opened', { length: 128 }),
    hasRecording: boolean('has_recording').default(false),
    recordingId: varchar('recording_id', { length: 128 }),
    audioAuditData: jsonb('audio_audit_data').default({}),
  },
  (table) => [
    index('idx_call_logs_started_at').on(table.startedAt),
  ]
);

// 13. LEITURA DE PLACAS LPR VEICULAR
export const lprLogs = pgTable(
  'lpr_logs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
    plate: varchar('plate', { length: 16 }).notNull(),
    confidence: numeric('confidence', { precision: 5, scale: 2 }).notNull(),
    cameraName: varchar('camera_name', { length: 128 }).notNull(),
    matchedVehicleId: varchar('matched_vehicle_id', { length: 64 }),
    matchedUnitNumber: varchar('matched_unit_number', { length: 32 }),
    action: varchar('action', { length: 64 }).notNull(), // ABERTURA_AUTOMATICA, NEGADO_DESCONHECIDO, ALERTA_SUSPEITO
    reason: text('reason').notNull(),
    snapshotUrl: text('snapshot_url'),
  },
  (table) => [
    index('idx_lpr_logs_timestamp').on(table.timestamp),
    index('idx_lpr_logs_plate').on(table.plate),
  ]
);

// 14. AUDITORIA IMUTÁVEL (SECURITY AUDIT TRAIL COM SHA-256)
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
    actor: varchar('actor', { length: 128 }).notNull(),
    role: varchar('role', { length: 64 }).notNull(),
    action: varchar('action', { length: 128 }).notNull(),
    target: varchar('target', { length: 128 }).notNull(),
    status: varchar('status', { length: 64 }).notNull(), // PERMITIDO, NEGADO, ALERTA
    reason: text('reason'),
    ipAddress: varchar('ip_address', { length: 64 }),
    userAgent: text('user_agent'),
    correlationId: varchar('correlation_id', { length: 64 }),
    dtmfCommand: varchar('dtmf_command', { length: 16 }),
    details: jsonb('details').default({}),
    sha256Hash: varchar('sha256_hash', { length: 128 }),
  },
  (table) => [
    index('idx_audit_logs_timestamp').on(table.timestamp),
    index('idx_audit_logs_actor').on(table.actor),
    index('idx_audit_logs_action').on(table.action),
  ]
);

// 15. USUÁRIOS E CREDENCIAIS DO SISTEMA (RBAC LOCAL-FIRST SEGURO)
export const systemUsers = pgTable(
  'system_users',
  {
    id: varchar('id', { length: 64 }).primaryKey(),
    username: varchar('username', { length: 64 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }).notNull(),
    salt: varchar('salt', { length: 64 }).notNull(),
    displayName: varchar('display_name', { length: 128 }).notNull(),
    email: varchar('email', { length: 128 }),
    role: varchar('role', { length: 32 }).notNull(), // super_admin, sindico, operador, morador
    unitId: varchar('unit_id', { length: 64 }).references(() => units.id, { onDelete: 'set null' }),
    unitNumber: varchar('unit_number', { length: 32 }),
    active: boolean('active').default(true),
    mfaEnabled: boolean('mfa_enabled').default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
  },
  (table) => [
    uniqueIndex('idx_system_users_username').on(table.username),
  ]
);

// 16. DISPOSITIVOS IOT & RELÉS
export const iotDevices = pgTable('iot_devices', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  type: varchar('type', { length: 32 }).notNull(), // rele, sensor_presenca, iluminacao, sirene
  protocol: varchar('protocol', { length: 32 }).notNull().default('zigbee_3_0'),
  gateway: varchar('gateway', { length: 64 }).notNull().default('NovaDigital_HNZ_CB3'),
  state: varchar('state', { length: 32 }).notNull().default('desligado'),
  batteryLevel: integer('battery_level'),
  online: boolean('online').notNull().default(true),
  location: varchar('location', { length: 128 }).notNull(),
});

// 17. REGRAS DE AUTOMAÇÃO DE EVENTOS
export const automationRules = pgTable('automation_rules', {
  id: varchar('id', { length: 64 }).primaryKey(),
  name: varchar('name', { length: 128 }).notNull(),
  description: text('description').notNull(),
  triggerEvent: varchar('trigger_event', { length: 64 }).notNull(),
  condition: text('condition').notNull(),
  action: text('action').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  lastExecutedAt: timestamp('last_executed_at', { withTimezone: true }),
});
