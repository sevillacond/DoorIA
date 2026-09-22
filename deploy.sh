#!/bin/bash

# =========================================================================
# ENLACE-DOORIA: SCRIPT DE IMPLANTAÇÃO AUTOMATIZADA (DEPLOY PRODUÇÃO)
# Arquitetura: Node.js (Vite + Express), PostgreSQL 16, Asterisk 20, go2rtc
# =========================================================================

set -e # Interrompe a execução caso algum comando crítico falhe

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "================================================================="
echo "   🚀 IMPLANTAÇÃO AUTOMATIZADA: ENLACE-DOORIA (Mini PC Guarita) "
echo "================================================================="
echo -e "${NC}"

# Comando Docker Compose compatível (v2 ou v1)
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
elif command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
else
    echo -e "${RED}Erro: Docker Compose não encontrado no sistema.${NC}"
    exit 1
fi

# -------------------------------------------------------------------------
# ETAPA 1: VALIDAR PRÉ-REQUISITOS (Docker, Docker Compose, .env)
# -------------------------------------------------------------------------
echo -e "${YELLOW}[1/8] Verificando pré-requisitos do sistema...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Erro: Docker não está instalado. Instale o Docker primeiro.${NC}"
    exit 1
fi

if [ ! -f .env ]; then
    echo -e "${RED}Erro: Arquivo .env não encontrado na raiz do projeto!${NC}"
    echo -e "Copie o arquivo modelo executando: ${YELLOW}cp .env.example .env${NC} e preencha as variáveis de produção."
    exit 1
fi
echo -e "${GREEN}✔ Docker, Docker Compose e arquivo .env presentes.${NC}"
echo ""

# -------------------------------------------------------------------------
# ETAPA 2: VERIFICAR VARIÁVEIS OBRIGATÓRIAS NO .ENV (ProductionValidator)
# -------------------------------------------------------------------------
echo -e "${YELLOW}[2/8] Validando variáveis obrigatórias de produção no .env...${NC}"

# Carrega variáveis do .env ignorando comentários
set -a
# shellcheck source=/dev/null
source .env
set +a

REQUIRED_VARS=(
    "SESSION_SECRET"
    "POSTGRES_PASSWORD"
    "CONDO_CNPJ"
    "CONDO_NAME"
    "CONDO_CITY"
    "CONDO_STATE"
    "CONDO_UNITS_COUNT"
    "LOCAL_SERVER_IP"
    "INITIAL_ADMIN_USER"
    "INITIAL_ADMIN_PASSWORD"
    "INITIAL_ADMIN_EMAIL"
    "XPE_IP"
    "XPE_SIP_SECRET"
    "XPE_RTSP_USERNAME"
    "XPE_RTSP_PASSWORD"
    "RELAY_CONTROLLER_IP"
    "ASTERISK_HOST"
    "ASTERISK_AMI_PORT"
    "ASTERISK_AMI_USERNAME"
    "ASTERISK_AMI_SECRET"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -ne 0 ]; then
    echo -e "${RED}❌ ERRO FATAL: As seguintes variáveis obrigatórias não estão definidas no .env:${NC}"
    for missing in "${MISSING_VARS[@]}"; do
        echo -e "   -> ${RED}$missing${NC}"
    done
    echo -e "${YELLOW}Consulte o .env.example para instruções detalhadas de cada variável.${NC}"
    exit 1
fi

# Validação estrita de Câmeras Habilitadas
CAMERA_ERRORS=()
if [ "${CAMERA_PORTARIA_ENABLED:-true}" != "false" ]; then
    if [ -z "$GO2RTC_CAMERA_PORTARIA_URL" ] || [ "$GO2RTC_CAMERA_PORTARIA_URL" = "rtsp://" ]; then
        CAMERA_ERRORS+=("CAMERA_PORTARIA_ENABLED=true exige GO2RTC_CAMERA_PORTARIA_URL válida (formato: rtsp://user:pass@ip:554/path)")
    fi
fi
if [ "${CAMERA_GARAGEM_ENABLED:-false}" = "true" ]; then
    if [ -z "$GO2RTC_CAMERA_GARAGEM_URL" ] || [ "$GO2RTC_CAMERA_GARAGEM_URL" = "rtsp://" ]; then
        CAMERA_ERRORS+=("CAMERA_GARAGEM_ENABLED=true exige GO2RTC_CAMERA_GARAGEM_URL válida")
    fi
fi
if [ "${CAMERA_HALL_ENABLED:-false}" = "true" ]; then
    if [ -z "$GO2RTC_CAMERA_HALL_URL" ] || [ "$GO2RTC_CAMERA_HALL_URL" = "rtsp://" ]; then
        CAMERA_ERRORS+=("CAMERA_HALL_ENABLED=true exige GO2RTC_CAMERA_HALL_URL válida")
    fi
fi
if [ "${CAMERA_GOURMET_ENABLED:-false}" = "true" ]; then
    if [ -z "$GO2RTC_CAMERA_GOURMET_URL" ] || [ "$GO2RTC_CAMERA_GOURMET_URL" = "rtsp://" ]; then
        CAMERA_ERRORS+=("CAMERA_GOURMET_ENABLED=true exige GO2RTC_CAMERA_GOURMET_URL válida")
    fi
fi

if [ ${#CAMERA_ERRORS[@]} -ne 0 ]; then
    echo -e "${RED}❌ ERRO FATAL: Falha na validação de câmeras para produção:${NC}"
    for cam_err in "${CAMERA_ERRORS[@]}"; do
        echo -e "   -> ${RED}$cam_err${NC}"
    done
    exit 1
fi

echo -e "${GREEN}✔ Todas as ${#REQUIRED_VARS[@]} variáveis críticas e validação de câmeras foram aprovadas.${NC}"
echo ""

# -------------------------------------------------------------------------
# ETAPA 3: SUBIR POSTGRESQL E AGUARDAR HEALTHCHECK
# -------------------------------------------------------------------------
echo -e "${YELLOW}[3/8] Inicializando PostgreSQL 16 LTS e aguardando saúde do serviço...${NC}"
$DOCKER_COMPOSE up -d postgres

MAX_TRIES=30
TRIES=0
until [ "`docker inspect -f {{.State.Health.Status}} dooria-postgres 2>/dev/null`" == "healthy" ]; do
    TRIES=$((TRIES+1))
    if [ $TRIES -ge $MAX_TRIES ]; then
        echo -e "${RED}❌ Timeout aguardando o PostgreSQL ficar saudável (pg_isready).${NC}"
        docker logs --tail 30 dooria-postgres
        exit 1
    fi
    sleep 1
done
echo -e "${GREEN}✔ PostgreSQL 16 LTS online e saudável (porta interna 5432).${NC}"
echo ""

# -------------------------------------------------------------------------
# ETAPA 4: COMPILAR IMAGEM DO ENLACE-DOORIA E EXECUTAR MIGRAÇÕES
# -------------------------------------------------------------------------
echo -e "${YELLOW}[4/8] Compilando imagem do DoorIA Core...${NC}"
$DOCKER_COMPOSE build dooria-app

echo -e "${YELLOW}[5/8] Aplicando migrações do schema relacional (Drizzle ORM)...${NC}"
# Executa migrações do banco com o container efêmero com fail-fast estrito
if ! $DOCKER_COMPOSE run --rm -e NODE_ENV=production dooria-app npm run db:migrate; then
    echo -e "${RED}❌ ERRO FATAL: Falha ao aplicar migrações do banco de dados (Drizzle ORM).${NC}"
    echo -e "${RED}O deploy foi sumariamente abortado para proteger a integridade da portaria.${NC}"
    exit 1
fi
echo -e "${GREEN}✔ Migrações estruturais do banco de dados concluídas com sucesso.${NC}"
echo ""

# -------------------------------------------------------------------------
# ETAPA 5 & 6: BOOTSTRAP DE DADOS INICIAIS E SUBIR DEMAIS SERVIÇOS
# -------------------------------------------------------------------------
echo -e "${YELLOW}[6/8] Inicializando todos os serviços (Core, Asterisk, Go2RTC)...${NC}"

# Provisiona manager.conf dinamicamente com as credenciais reais do .env (sem segredos em git)
AMI_BINDADDR="${ASTERISK_AMI_BINDADDR:-0.0.0.0}"
REAL_DOCKER_SUBNET="${DOCKER_SUBNET:-172.28.0.0/255.255.255.0}"
cat <<EOF > ./config/asterisk/manager.conf
; ==============================================================================
; ENLACE-DOORIA: ASTERISK MANAGEMENT INTERFACE (AMI) - CONFIGURAÇÃO SEGURA
; Gerado dinamicamente pelo deploy.sh a partir de variáveis de ambiente
; ==============================================================================

[general]
enabled = yes
port = 5038
bindaddr = ${AMI_BINDADDR}
displayconnects = no

[${ASTERISK_AMI_USERNAME}]
secret = ${ASTERISK_AMI_SECRET}
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.255
permit = ${REAL_DOCKER_SUBNET}
EOF

if [ -n "$LOCAL_SERVER_IP" ] && [ "$LOCAL_SERVER_IP" != "127.0.0.1" ]; then
    echo "permit = ${LOCAL_SERVER_IP}/255.255.255.255" >> ./config/asterisk/manager.conf
fi

if [ -n "$ASTERISK_HOST" ] && [ "$ASTERISK_HOST" != "127.0.0.1" ] && [ "$ASTERISK_HOST" != "$LOCAL_SERVER_IP" ]; then
    echo "permit = ${ASTERISK_HOST}/255.255.255.255" >> ./config/asterisk/manager.conf
fi

if [ -n "$ASTERISK_AMI_PERMIT" ] && [ "$ASTERISK_AMI_PERMIT" != "0.0.0.0/0.0.0.0" ] && [ "$ASTERISK_AMI_PERMIT" != "0.0.0.0/0" ]; then
    echo "permit = ${ASTERISK_AMI_PERMIT}" >> ./config/asterisk/manager.conf
fi

cat <<EOF >> ./config/asterisk/manager.conf
read = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
write = system,call,command,agent,user,originate
EOF

# Provisiona go2rtc.yaml dinamicamente com apenas as câmeras ativadas
GO2RTC_LOCAL_IP="${LOCAL_SERVER_IP:-127.0.0.1}"
cat <<EOF > ./config/go2rtc.yaml
# ==============================================================================
# ENLACE-DOORIA: GO2RTC GATEWAY DE VÍDEO CFTV
# Configuração Endurecida para Rede Local Segura (LAN / Guarita Física)
# Gerado dinamicamente pelo deploy.sh com apenas câmeras habilitadas
# Versão: go2rtc v1.9.4
# ==============================================================================

api:
  listen: ":1984"
  origin: ""

webrtc:
  listen: ":8555/tcp"
  candidates:
    - "${GO2RTC_LOCAL_IP}:8555"

rtsp:
  listen: "127.0.0.1:8554"

streams:
EOF

if [ "${CAMERA_PORTARIA_ENABLED:-true}" != "false" ] && [ -n "$GO2RTC_CAMERA_PORTARIA_URL" ]; then
cat <<EOF >> ./config/go2rtc.yaml
  # Totem Portaria Social (Intelbras XPE 3115 IP)
  camera_portaria:
    - "${GO2RTC_CAMERA_PORTARIA_URL}"
    - "ffmpeg:camera_portaria#video=copy#audio=opus"

EOF
fi

if [ "${CAMERA_GARAGEM_ENABLED:-false}" = "true" ] && [ -n "$GO2RTC_CAMERA_GARAGEM_URL" ]; then
cat <<EOF >> ./config/go2rtc.yaml
  # Portão Garagem LPR (Intelbras VIP 3230 B)
  camera_garagem:
    - "${GO2RTC_CAMERA_GARAGEM_URL}"

EOF
fi

if [ "${CAMERA_HALL_ENABLED:-false}" = "true" ] && [ -n "$GO2RTC_CAMERA_HALL_URL" ]; then
cat <<EOF >> ./config/go2rtc.yaml
  # Hall de Entrada Social (Hikvision DS-2CD1123G0-I)
  camera_hall:
    - "${GO2RTC_CAMERA_HALL_URL}"

EOF
fi

if [ "${CAMERA_GOURMET_ENABLED:-false}" = "true" ] && [ -n "$GO2RTC_CAMERA_GOURMET_URL" ]; then
cat <<EOF >> ./config/go2rtc.yaml
  # Espaço Gourmet (Dahua IPC-HDBW1230E)
  camera_gourmet:
    - "${GO2RTC_CAMERA_GOURMET_URL}"

EOF
fi

$DOCKER_COMPOSE up -d

echo -e "${GREEN}✔ Serviços orquestrados e em execução.${NC}"
echo ""

# -------------------------------------------------------------------------
# ETAPA 7: VALIDAR QUE /api/v1/health RESPONDE 200 (FAIL-FAST)
# -------------------------------------------------------------------------
echo -e "${YELLOW}[7/8] Verificando integridade da API (/api/v1/health)...${NC}"
API_HEALTHY=false
API_TRIES=0
while [ $API_TRIES -lt 30 ]; do
    API_TRIES=$((API_TRIES+1))
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/v1/health 2>/dev/null || true)
    if [ "$HTTP_CODE" == "200" ]; then
        API_HEALTHY=true
        break
    fi
    sleep 2
done

if [ "$API_HEALTHY" = true ]; then
    echo -e "${GREEN}✔ API DoorIA Core respondendo com sucesso (HTTP 200 OK)!${NC}"
else
    echo -e "${RED}❌ ERRO FATAL: A API DoorIA Core não respondeu HTTP 200 dentro do tempo limite (/api/v1/health).${NC}"
    echo -e "${RED}O deploy foi abortado. Verifique os logs dos containers com: $DOCKER_COMPOSE logs dooria-app${NC}"
    exit 1
fi
echo ""

# -------------------------------------------------------------------------
# ETAPA 8: EXIBIR RESUMO COM URLs DE ACESSO
# -------------------------------------------------------------------------
echo -e "${BLUE}"
echo "================================================================="
echo " 🎉 IMPLANTAÇÃO DO ENLACE-DOORIA CONCLUÍDA COM SUCESSO!"
echo "================================================================="
echo -e "${NC}"
echo -e "Painel de Controle e Portaria Web:"
echo -e "👉 ${GREEN}http://${LOCAL_SERVER_IP:-localhost}:3000${NC}"
echo ""
echo -e "Endpoint Oficial de Diagnóstico / Healthcheck:"
echo -e "👉 ${CYAN}http://${LOCAL_SERVER_IP:-localhost}:3000/api/v1/health${NC}"
echo ""
echo -e "Re-streaming de Câmeras WebRTC / CFTV (go2rtc):"
echo -e "👉 ${GREEN}http://${LOCAL_SERVER_IP:-localhost}:1984${NC}"
echo ""
echo -e "Comandos úteis:"
echo -e "  Ver logs em tempo real:   ${YELLOW}$DOCKER_COMPOSE logs -f dooria-core${NC}"
echo -e "  Reiniciar a portaria:     ${YELLOW}$DOCKER_COMPOSE restart${NC}"
echo -e "  Parar o sistema:          ${YELLOW}$DOCKER_COMPOSE down${NC}"
echo "================================================================="
