#!/bin/bash

# =========================================================================
# ENLACE-DOORIA: SCRIPT DE IMPLANTAÇÃO AUTOMATIZADA (DEPLOY)
# Arquitetura: Node.js (Vite + Express), PostgreSQL 16, Asterisk 20, go2rtc
# =========================================================================

set -e # Interrompe a execução caso algum comando falhe

# Cores para output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}"
echo "================================================================="
echo "   🚀 INICIANDO DEPLOY DO SISTEMA ENLACE-DOORIA (Mini PC)      "
echo "================================================================="
echo -e "${NC}"

# 1. VERIFICAR PRÉ-REQUISITOS (Docker e Docker-Compose)
echo -e "${YELLOW}[1/4] Verificando dependências do sistema...${NC}"
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Erro: Docker não está instalado. Instale o Docker primeiro.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Erro: Docker Compose não encontrado.${NC}"
    exit 1
fi
echo -e "${GREEN}✔ Dependências validadas.${NC}"
echo ""

# 2. PARAR CONTAINERS ANTIGOS E LIMPAR
echo -e "${YELLOW}[2/4] Preparando o ambiente (Parando instâncias antigas)...${NC}"
if docker compose version &> /dev/null; then
    docker compose down
else
    docker-compose down
fi
echo -e "${GREEN}✔ Ambiente limpo.${NC}"
echo ""

# 3. RECONSTRUIR E SUBIR CONTAINERS (Build nativo da imagem local)
echo -e "${YELLOW}[3/4] Compilando painel, servidor e orquestrando portas (Isso pode demorar um pouco)...${NC}"
if docker compose version &> /dev/null; then
    docker compose up -d --build
else
    docker-compose up -d --build
fi
echo -e "${GREEN}✔ Containers criados e rodando em background (-d).${NC}"
echo ""

# 4. VALIDAÇÃO DO AMBIENTE
echo -e "${YELLOW}[4/4] Checando status dos serviços...${NC}"
sleep 5 # Aguarda subida inicial para checar status

if docker ps | grep -q "dooria-core"; then
    echo -e "${GREEN}✔ Sistema Core Online!${NC}"
else
    echo -e "${RED}❌ O servidor DoorIA (Core) não conseguiu subir. Cheque os logs: docker logs dooria-core${NC}"
fi

if docker ps | grep -q "dooria-postgres"; then
    echo -e "${GREEN}✔ Banco de Dados (PostgreSQL 16) Online!${NC}"
else
    echo -e "${RED}❌ PostgreSQL falhou. Cheque os logs: docker logs dooria-postgres${NC}"
fi

echo -e "${BLUE}"
echo "================================================================="
echo " 🎉 IMPLANTAÇÃO CONCLUÍDA COM SUCESSO!"
echo "================================================================="
echo -e "${NC}"
echo -e "Acesse o painel web no navegador do condomínio:"
echo -e "👉 ${GREEN}http://localhost:3000${NC}"
echo ""
echo -e "Monitoramento de câmeras RTSP interno (go2rtc):"
echo -e "👉 ${GREEN}http://localhost:1984${NC}"
echo ""
echo -e "Para ver os logs do sistema, digite:"
echo -e "${YELLOW}docker logs -f dooria-core${NC}"
echo "================================================================="
