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

# 4. Validação completa com handshake AMI: Login -> Autenticação -> Ping -> Logoff
# Credenciais obtidas exclusivamente de variáveis de ambiente sem expor segredos.
AMI_USER="${ASTERISK_AMI_USERNAME:-}"
AMI_PASS="${ASTERISK_AMI_SECRET:-}"

if [ -z "$AMI_USER" ] || [ -z "$AMI_PASS" ]; then
  if [ -f /etc/asterisk/manager.conf ]; then
    [ -z "$AMI_USER" ] && AMI_USER=$(grep -E '^\[' /etc/asterisk/manager.conf | grep -v '\[general\]' | head -n 1 | tr -d '[] \r')
    [ -z "$AMI_PASS" ] && AMI_PASS=$(grep -E '^[[:space:]]*secret[[:space:]]*=' /etc/asterisk/manager.conf | head -n 1 | cut -d= -f2- | tr -d ' \r\t')
  fi
fi

if [ -n "$AMI_USER" ] && [ -n "$AMI_PASS" ]; then
  AMI_PAYLOAD=$(printf "Action: Login\r\nUsername: %s\r\nSecret: %s\r\n\r\nAction: Ping\r\n\r\nAction: Logoff\r\n\r\n" "$AMI_USER" "$AMI_PASS")
  unset AMI_PASS

  AMI_RESPONSE=""
  if command -v nc > /dev/null 2>&1; then
    AMI_RESPONSE=$(printf "%s" "$AMI_PAYLOAD" | nc -w 3 127.0.0.1 "$AMI_PORT" 2>/dev/null || true)
  elif (exec 3<>/dev/tcp/127.0.0.1/"$AMI_PORT") 2>/dev/null; then
    printf "%s" "$AMI_PAYLOAD" >&3
    AMI_RESPONSE=$(cat <&3 2>/dev/null || true)
    exec 3>&-
  fi
  unset AMI_PAYLOAD

  if ! echo "$AMI_RESPONSE" | grep -qi 'Response: Success'; then
    unset AMI_RESPONSE
    echo "❌ Falha na autenticação do Asterisk AMI (credenciais inválidas ou rejeitadas)" >&2
    exit 1
  fi

  if ! echo "$AMI_RESPONSE" | grep -qi 'Ping: Pong'; then
    unset AMI_RESPONSE
    echo "❌ Falha na resposta ao Ping do Asterisk AMI" >&2
    exit 1
  fi
  unset AMI_RESPONSE
fi

# Sucesso
exit 0
