-- ============================================================================
-- ENLACE-DOORIA: POSTGRESQL BOOTSTRAP DE EXTENSÕES
-- ATENÇÃO: A FONTE OFICIAL ÚNICA E EXCLUSIVA DO SCHEMA SÃO AS MIGRAÇÕES DRIZZLE
-- LOCALIZADAS EM 'src/db/migrations/'.
-- NÃO UTILIZE ESTE ARQUIVO PARA DEFINIÇÃO PARALELA DE SCHEMA.
-- O SCHEMA DEVE SER APLICADO E ATUALIZADO EXCLUSIVAMENTE VIA:
--   npm run db:migrate (ou drizzle-kit)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
