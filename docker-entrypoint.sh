#!/bin/sh
set -e

# ==============================================================================
# ENLACE-DOORIA: SCRIPT DE INICIALIZAÇÃO DE PRODUÇÃO (ENTRYPOINT DOCKER)
# Fluxo Obrigatório de Startup:
# PostgreSQL HEALTHY -> Connectivity Check -> Migrations -> Bootstrap -> Server
# ==============================================================================

echo "========================================================================="
echo " [DoorIA Entrypoint] Inicializando container DoorIA Core em produção"
echo "========================================================================="

# Parâmetros de conexão com o PostgreSQL 16 LTS
PG_HOST="${PGHOST:-${POSTGRES_HOST:-postgres}}"
PG_PORT="${PGPORT:-${POSTGRES_PORT:-5432}}"
PG_USER="${PGUSER:-${POSTGRES_USER:-dooria}}"
PG_DB="${PGDATABASE:-${POSTGRES_DB:-dooria_db}}"

echo "[DoorIA Entrypoint] [1/2] Verificando conectividade com PostgreSQL em ${PG_HOST}:${PG_PORT}..."

MAX_ATTEMPTS=30
ATTEMPT=0
CONNECTED=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if pg_isready -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" > /dev/null 2>&1; then
    CONNECTED=1
    break
  fi
  ATTEMPT=$((ATTEMPT + 1))
  echo "[DoorIA Entrypoint] Aguardando banco de dados PostgreSQL ficar pronto... (tentativa ${ATTEMPT}/${MAX_ATTEMPTS})"
  sleep 1
done

if [ $CONNECTED -eq 0 ]; then
  echo "========================================================================="
  echo " ❌ ERRO FATAL: PostgreSQL indisponível após ${MAX_ATTEMPTS} segundos."
  echo " O DoorIA recusa inicialização sem banco de dados PostgreSQL 16 LTS ativo."
  echo "========================================================================="
  exit 1
fi

echo "✅ [DoorIA Entrypoint] [1/2] Conexão com PostgreSQL estabelecida com sucesso."
echo "[DoorIA Entrypoint] [2/2] Delegando execução ao processo do servidor DoorIA..."

# O processo server.cjs executa a validação de schema, migrações Drizzle oficiais
# e o bootstrap idempotente de produção antes de escutar requisições HTTP na porta 3000.
exec "$@"
