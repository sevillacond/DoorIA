#!/bin/sh
set -e

# ==============================================================================
# ENLACE-DOORIA: SCRIPT DE INICIALIZAÇÃO DO ASTERISK 20 LTS (ENTRYPOINT)
# Injeta credenciais seguras do AMI a partir das variáveis de ambiente
# ==============================================================================

if [ -n "$ASTERISK_AMI_USERNAME" ] && [ -n "$ASTERISK_AMI_SECRET" ]; then
  cat <<EOF > /etc/asterisk/manager.conf
; ==============================================================================
; ENLACE-DOORIA: ASTERISK MANAGEMENT INTERFACE (AMI) - CONFIGURAÇÃO SEGURA
; Gerado automaticamente a partir das variáveis de ambiente de produção
; ==============================================================================

[general]
enabled = yes
port = 5038
bindaddr = 127.0.0.1
displayconnects = no

[${ASTERISK_AMI_USERNAME}]
secret = ${ASTERISK_AMI_SECRET}
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.255
read = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
write = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
EOF
  echo "✔ [Asterisk Entrypoint] manager.conf configurado dinamicamente para o usuário '${ASTERISK_AMI_USERNAME}'."
fi

# Garante permissões de execução no healthcheck
[ -f /etc/asterisk/healthcheck.sh ] && chmod +x /etc/asterisk/healthcheck.sh

# Inicia o processo principal do Asterisk em primeiro plano
exec asterisk -f -vvv
