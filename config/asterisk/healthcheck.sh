#!/bin/sh
# ==============================================================================
# ENLACE-DOORIA: HEALTHCHECK ROBUSTO DO SERVIDOR ASTERISK 20 LTS (AMI / PJSIP)
# Valida:
# 1. Core do Asterisk ativo e responsivo (core ping)
# 2. Manager (AMI) habilitado na configuração em execução
# 3. Socket TCP do AMI acessível na porta 5038 em 127.0.0.1
# SEGURANÇA: Nenhuma credencial ou secret é exposto em stdout/stderr/logs.
# ==============================================================================

set -e

# 1. Verifica se o processo principal do Asterisk está ativo e respondendo a comandos
if ! asterisk -rx 'core ping' > /dev/null 2>&1; then
  echo "❌ Asterisk Core não está respondendo ao ping" >&2
  exit 1
fi

# 2. Verifica se o subsistema AMI está devidamente habilitado
MANAGER_SETTINGS=$(asterisk -rx 'manager show settings' 2>/dev/null || true)
if ! echo "$MANAGER_SETTINGS" | grep -Eqi 'enabled:.*(yes|true|1)'; then
  echo "❌ Asterisk Manager (AMI) não está habilitado" >&2
  exit 1
fi

# 3. Testa a conectividade física do socket TCP local na porta 5038
AMI_PORT=5038
if command -v nc > /dev/null 2>&1; then
  if ! nc -z 127.0.0.1 $AMI_PORT > /dev/null 2>&1; then
    echo "❌ Socket TCP do Asterisk AMI fechado na porta $AMI_PORT" >&2
    exit 1
  fi
else
  # Fallback caso netcat não esteja instalado na imagem Alpine
  if ! (exec 3<>/dev/tcp/127.0.0.1/$AMI_PORT) 2>/dev/null; then
    echo "❌ Socket TCP do Asterisk AMI inacessível na porta $AMI_PORT" >&2
    exit 1
  fi
fi

# Sucesso
exit 0
