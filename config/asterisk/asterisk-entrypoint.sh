#!/bin/sh
set -e

# ==============================================================================
# ENLACE-DOORIA: SCRIPT DE INICIALIZAÇÃO DO ASTERISK 20 LTS (ENTRYPOINT)
# Injeta credenciais seguras do AMI a partir das variáveis de ambiente
# ==============================================================================

AMI_BINDADDR="${ASTERISK_AMI_BINDADDR:-0.0.0.0}"

if [ -n "$ASTERISK_AMI_USERNAME" ] && [ -n "$ASTERISK_AMI_SECRET" ]; then
  # Validação estrita de segurança: impede categoricamente exposição pública do AMI
  if [ "$ASTERISK_AMI_PERMIT" = "0.0.0.0/0.0.0.0" ] || [ "$ASTERISK_AMI_PERMIT" = "0.0.0.0/0" ]; then
    echo "❌ [Asterisk Entrypoint] ERRO DE SEGURANÇA: ASTERISK_AMI_PERMIT não pode permitir 0.0.0.0/0.0.0.0 (exposição pública proibida)." >&2
    exit 1
  fi

  # Subnet Docker real utilizada pelo DoorIA Core (definida no docker-compose.yml como 172.28.0.0/24)
  REAL_DOCKER_SUBNET="${DOCKER_SUBNET:-172.28.0.0/255.255.255.0}"
  if [ "$REAL_DOCKER_SUBNET" = "0.0.0.0/0.0.0.0" ] || [ "$REAL_DOCKER_SUBNET" = "0.0.0.0/0" ]; then
    echo "❌ [Asterisk Entrypoint] ERRO DE SEGURANÇA: DOCKER_SUBNET não pode permitir 0.0.0.0/0 (exposição pública proibida)." >&2
    exit 1
  fi

  cat <<EOF > /etc/asterisk/manager.conf
; ==============================================================================
; ENLACE-DOORIA: ASTERISK MANAGEMENT INTERFACE (AMI) - CONFIGURAÇÃO SEGURA
; Gerado automaticamente a partir das variáveis de ambiente de produção
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

  # Permite conexão da interface do servidor local caso configurado
  if [ -n "$LOCAL_SERVER_IP" ] && [ "$LOCAL_SERVER_IP" != "127.0.0.1" ]; then
    echo "permit = ${LOCAL_SERVER_IP}/255.255.255.255" >> /etc/asterisk/manager.conf
  fi

  # Permite conexão através do ASTERISK_HOST caso configurado e distinto
  if [ -n "$ASTERISK_HOST" ] && [ "$ASTERISK_HOST" != "127.0.0.1" ] && [ "$ASTERISK_HOST" != "$LOCAL_SERVER_IP" ]; then
    echo "permit = ${ASTERISK_HOST}/255.255.255.255" >> /etc/asterisk/manager.conf
  fi

  # Permite subnet ou IP específico configurado por ASTERISK_AMI_PERMIT
  if [ -n "$ASTERISK_AMI_PERMIT" ]; then
    echo "permit = ${ASTERISK_AMI_PERMIT}" >> /etc/asterisk/manager.conf
  fi

  cat <<EOF >> /etc/asterisk/manager.conf
read = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
write = system,call,command,agent,user,originate
EOF

  echo "✔ [Asterisk Entrypoint] manager.conf configurado dinamicamente para o usuário '${ASTERISK_AMI_USERNAME}' com bindaddr '${AMI_BINDADDR}' e regras de permit restritivas."
fi

# Garante permissões de execução no healthcheck
[ -f /etc/asterisk/healthcheck.sh ] && chmod +x /etc/asterisk/healthcheck.sh

# Inicia o processo principal do Asterisk em primeiro plano
exec asterisk -f -vvv
