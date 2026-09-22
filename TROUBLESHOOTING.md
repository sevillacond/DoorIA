# Manual Oficial de Diagnóstico e Resolução de Problemas (Troubleshooting) — Enlace-DoorIA

Este documento fornece procedimentos técnicos metódicos para diagnóstico, depuração e recuperação de falhas em bancada de homologação e na guarita, cobrindo os 15 cenários críticos de operação.

---

## 1. Procedimento de Triagem Rápida

Execute esta sequência de comandos para identificar o componente com anomalia:

```bash
# 1. Estado geral e saúde dos contêineres Docker
docker compose ps

# 2. Testar Liveness da aplicação Core (processo ativo)
curl -i http://localhost:3000/health/live

# 3. Testar Readiness da aplicação Core (PostgreSQL + AMI prontos)
curl -i http://localhost:3000/health/ready

# 4. Logs recentes do container Core
docker compose logs --tail=100 dooria-core
```

---

## 2. Diagnóstico Sistemático dos 15 Cenários Críticos

---

### Cenário 1: DoorIA Core não Inicia (Container em Crash ou Reiniciando)
- **Arquivos Relevantes:** `.env`, `docker-compose.yml`, `src/config/productionValidator.ts`, `server.ts`.
- **Comandos de Inspeção:**
  ```bash
  docker compose logs --tail=100 dooria-core
  docker inspect -f '{{.State.ExitCode}} - {{.State.Error}}' dooria-core
  ```
- **Logs Característicos:**
  `[ProductionValidator] ❌ ERRO CRÍTICO DE CONFIGURAÇÃO EM PRODUÇÃO: Variável X obrigatória não definida.`
- **Causa Provável:** Falha de validação estrita no boot (`validateProductionConfig`) decorrente de variáveis obrigatórias vazias no `.env` (ex: `SESSION_SECRET`, `CONDO_CNPJ`, `RELAY_CONTROLLER_IP` ou `LOCAL_SERVER_IP`).
- **Ação Corretiva:** Edite o `.env`, preencha todas as variáveis obrigatórias com valores válidos e reinicie: `docker compose up -d dooria-app`.
- **Resultado Esperado:** O log exibe `[Enlace-DoorIA] Servidor operacional na porta 3000` e o container permanece com status `Up`.

---

### Cenário 2: PostgreSQL não Fica Saudável (Container `unhealthy`)
- **Arquivos Relevantes:** `docker-compose.yml`, volume `dooria_pg_data`.
- **Comandos de Inspeção:**
  ```bash
  docker compose logs postgres
  docker exec dooria-postgres pg_isready -h localhost -p 5432 -U dooria -d dooria_db
  ```
- **Logs Característicos:**
  `FATAL: password authentication failed for user "dooria"` ou `FATAL: lock file "postmaster.pid" already exists`.
- **Causa Provável:** Divergência na senha do PostgreSQL entre o arquivo `.env` e o volume existente inicializado anteriormente, ou arquivo de lock após reinício abrupto.
- **Ação Corretiva:** Verifique a senha no `.env`. Em caso de lock residual, pare o container (`docker compose stop postgres`), remova o postmaster.pid no volume e reinicie.
- **Resultado Esperado:** `pg_isready` retorna código 0 (`accepting connections`) e o container atinge status `healthy`.

---

### Cenário 3: Migration Falha ao Iniciar a Aplicação
- **Arquivos Relevantes:** `src/db/migrate.ts`, `src/db/schema.ts`, pasta `src/db/migrations/`.
- **Comandos de Inspeção:**
  ```bash
  docker compose run --rm -e NODE_ENV=production dooria-app npm run db:migrate
  docker exec -it dooria-postgres psql -U dooria -d dooria_db -c "\dt"
  ```
- **Logs Característicos:**
  `error: relation "xyz" already exists` ou `FATAL ERROR: FALHA NO STARTUP DO POSTGRESQL (STARTUP FAILURE)`.
- **Causa Provável:** Inconsistência entre a tabela `__drizzle_migrations` e as tabelas existentes, ou ausência de permissões de escrita para o usuário `dooria`.
- **Ação Corretiva:** Conecte-se ao banco via `psql`, garanta que o usuário possui privilégios de `OWNER` no schema `public`, ou execute a migração manual com o comando de inspeção acima.
- **Resultado Esperado:** O comando finaliza com `[DB Migrations] Migrações aplicadas com sucesso.` e as 14 tabelas são listadas.

---

### Cenário 4: Asterisk não Inicia (Container `dooria-asterisk` Cai no Boot)
- **Arquivos Relevantes:** `config/asterisk/asterisk-entrypoint.sh`, `config/asterisk/pjsip.conf`, `config/asterisk/manager.conf`.
- **Comandos de Inspeção:**
  ```bash
  docker compose logs asterisk
  docker exec -it dooria-asterisk asterisk -rx 'core show version'
  ```
- **Logs Característicos:**
  `Unable to bind socket: Address already in use` ou `Permission denied /etc/asterisk/manager.conf`.
- **Causa Provável:** Conflito de porta UDP 5060 no host (ex: outro serviço de telefonia rodando no host da VM) ou erro de permissão no script `asterisk-entrypoint.sh`.
- **Ação Corretiva:** Execute `sudo lsof -i :5060` no host para identificar processos concorrentes. Aplique `chmod +x config/asterisk/*.sh` e suba novamente.
- **Resultado Esperado:** O processo Asterisk permanece ativo em `network_mode: host` respondendo à CLI.

---

### Cenário 5: Totem Intelbras XPE não Registra (SIP 401 / 403 Forbidden)
- **Arquivos Relevantes:** `config/asterisk/pjsip.conf`, interface web do XPE.
- **Comandos de Inspeção:**
  ```bash
  docker exec -it dooria-asterisk asterisk -rx 'pjsip show endpoints'
  docker exec -it dooria-asterisk asterisk -rx 'pjsip set logger on'
  ```
- **Logs Característicos:**
  `<--- Received SIP request (492 bytes) from UDP:192.168.1.150:5060 ---> REGISTER sip:...` seguido de `401 Unauthorized`.
- **Causa Provável:** Divergência na senha de autenticação configurada na interface web do totem XPE e a declarada em `auth_totem` no `pjsip.conf`.
- **Ação Corretiva:** Ajuste a senha no painel do XPE (menu *Rede / SIP*) exatamente igual a `XPE_SIP_SECRET` do `.env`. Recarregue o PJSIP: `docker exec dooria-asterisk asterisk -rx 'pjsip reload'`.
- **Resultado Esperado:** `pjsip show endpoints` exibe o endpoint `totem-xpe` com status `Avail`.

---

### Cenário 6: AMI não Conecta (Erro na Porta 5038 / `Authentication Failed`)
- **Arquivos Relevantes:** `config/asterisk/manager.conf`, `src/services/AsteriskAMI.ts`, `.env`.
- **Comandos de Inspeção:**
  ```bash
  docker exec -it dooria-core nc -zv 172.28.0.1 5038
  docker exec -it dooria-asterisk asterisk -rx 'manager show settings'
  docker exec -it dooria-asterisk asterisk -rx 'manager show users'
  ```
- **Logs Característicos:**
  `[AsteriskAMI] Falha de autenticação no Asterisk AMI: Bad credentials` ou `Connection refused`.
- **Causa Provável:** A subnet Docker bridge (`172.28.0.0/24`) não está liberada na diretiva `permit` do `manager.conf`, ou o `ASTERISK_AMI_SECRET` está divergente.
- **Ação Corretiva:** Certifique-se de que `/etc/asterisk/manager.conf` possui `permit = 172.28.0.0/255.255.255.0` e recarregue com `asterisk -rx 'manager reload'`.
- **Resultado Esperado:** O endpoint `/health/ready` responde HTTP 200 com `ami: { status: "online", ping: "pong" }`.

---

### Cenário 7: Chamada de Interfone não Chega ao Residente
- **Arquivos Relevantes:** `config/asterisk/extensions.conf`, `src/services/AsteriskAMI.ts`.
- **Comandos de Inspeção:**
  ```bash
  docker exec -it dooria-asterisk asterisk -rx 'core show channels'
  docker exec -it dooria-asterisk asterisk -rx 'pjsip show contacts'
  ```
- **Logs Característicos:**
  `[DOORIA] Discagem do Totem para Apartamento 101` seguido de `DIALSTATUS = CHANUNAVAIL`.
- **Causa Provável:** O ramal da unidade (ex: `101`) não está conectado via WebPhone WebRTC (porta WSS 8089) ou a discagem no totem foi direcionada a contexto incorreto.
- **Ação Corretiva:** Abra a interface do morador no navegador para autenticar e registrar o WebPhone. Verifique no Asterisk se o contato correspondente está registrado.
- **Resultado Esperado:** A chamada entra no contexto `dooria-totem`, o Asterisk estabelece o canal e o navegador exibe o modal de atendimento.

---

### Cenário 8: DTMF não Aciona o Portão (`*07` / `*08` sem Abertura)
- **Arquivos Relevantes:** `src/services/hardware/RealHardwareAdapter.ts`, `src/services/AsteriskAMI.ts`.
- **Comandos de Inspeção:**
  ```bash
  docker compose logs --tail=50 dooria-core | grep REAL_HARDWARE
  docker exec -it dooria-asterisk asterisk -rx 'core show channels'
  ```
- **Logs Característicos:**
  `[REAL_HARDWARE] Canal SIP inexistente, inativo ou não correlacionado à chamada do XPE no Asterisk. PlayDTMF abortado.`
- **Causa Provável:** A chamada de áudio já foi finalizada antes do clique de abertura, ou existem canais ambíguos sem identificador único (`UniqueID`).
- **Ação Corretiva:** Mantenha a chamada de áudio ativa entre o totem e o morador durante o clique de abertura. O sistema correlacionará o canal e enviará o `PlayDTMF`.
- **Resultado Esperado:** O Asterisk injeta o áudio DTMF, o relé do quadro elétrico atua e o retorno é `COMMAND_SENT`.

---

### Cenário 9: Sensor Reed Switch não Confirma Abertura (Permanece `COMMAND_SENT`)
- **Arquivos Relevantes:** `src/services/hardware/RealHardwareAdapter.ts`, módulo de entrada digital do relé.
- **Comandos de Inspeção:**
  ```bash
  curl -s http://192.168.1.160/status/sensor/1
  ```
- **Logs Característicos:**
  `[REAL_HARDWARE] Leitura física do sensor: fechado (hasPhysicalSensor: true). Status final: COMMAND_SENT.`
- **Causa Provável:** O pulso do relé foi enviado, mas o portão não se moveu (falta de energia no motor), o ímã não se afastou mais de 15mm do sensor, ou fio rompido.
- **Ação Corretiva:** Inspecione o alinhamento mecânico do ímã e teste a continuidade elétrica no borne digital do controlador ao abrir manualmente o portão.
- **Resultado Esperado:** A leitura do sensor alterna para `aberto`, e a auditoria transiciona para `HARDWARE_CONFIRMED`.

---

### Cenário 10: Câmera IP não Valida no Módulo de CFTV
- **Arquivos Relevantes:** `src/services/CameraValidator.ts`, `.env`.
- **Comandos de Inspeção:**
  ```bash
  nc -zv 192.168.1.150 554
  curl -i -X OPTIONS rtsp://192.168.1.150:554/live
  ```
- **Logs Característicos:**
  `[CameraValidator] Falha ao conectar socket TCP: ECONNREFUSED na porta 554.`
- **Causa Provável:** Câmera desligada, IP incorreto no `.env`, ou serviço RTSP desativado na interface web da câmera.
- **Ação Corretiva:** Acesse o painel da câmera IP, confirme que o protocolo RTSP está ativo na porta 554 e que o IP está estático na LAN.
- **Resultado Esperado:** O socket conecta e o handshake atinge `TCP_REACHABLE` e `RTSP_VALIDATED`.

---

### Cenário 11: RTSP Retorna 401 Unauthorized e Bloqueia
- **Arquivos Relevantes:** `src/services/CameraValidator.ts`, `.env`.
- **Comandos de Inspeção:**
  ```bash
  curl -i -X DESCRIBE rtsp://192.168.1.150:554/cam/realmonitor?channel=1&subtype=0
  ```
- **Logs Característicos:**
  `RTSP/1.0 401 Unauthorized` com cabeçalho `WWW-Authenticate: Digest realm="..."`.
- **Causa Provável:** Senha da câmera incorreta declarada no `.env` (`XPE_RTSP_PASSWORD`).
- **Ação Corretiva:** Atualize as credenciais no `.env` e reinicie a aplicação. O validador utilizará o cálculo Digest RFC 2617.
- **Resultado Esperado:** A resposta seguinte retorna `RTSP/1.0 200 OK` e o payload SDP de vídeo.

---

### Cenário 12: Digest Auth Falha com `RTSP_AUTH_UNSUPPORTED_QOP`
- **Arquivos Relevantes:** `src/services/CameraValidator.ts`.
- **Logs Característicos:**
  `[CameraValidator] ❌ Falha de segurança: Challenge exige qop="auth-int", que não é suportado pelo protocolo RTSP.`
- **Causa Provável:** A câmera IP está configurada com proteção rigorosa `auth-int` (integridade de corpo de mensagem).
- **Ação Corretiva:** Na interface da câmera (menu *Segurança / Autenticação*), mude o modo Digest para compatibilidade padrão (`qop="auth"` ou MD5 simples).
- **Resultado Esperado:** O validador processa o challenge com `qop=auth` e extrai os parâmetros SDP de vídeo.

---

### Cenário 13: go2rtc não Registra a Stream na API
- **Arquivos Relevantes:** `config/go2rtc.yaml`, `deploy.sh`.
- **Comandos de Inspeção:**
  ```bash
  curl -s http://127.0.0.1:1984/api/streams | jq .
  docker compose logs go2rtc
  ```
- **Logs Característicos:**
  A resposta da API retorna `{}` (vazio) ou `[streams] probe error`.
- **Causa Provável:** A câmera não está habilitada (`CAMERA_PORTARIA_ENABLED=false`) ou a URL RTSP correspondente está vazia no `.env`.
- **Ação Corretiva:** Certifique-se de que `CAMERA_PORTARIA_ENABLED=true` e `GO2RTC_CAMERA_PORTARIA_URL` contém a URL RTSP completa. Execute `./deploy.sh` para regenerar o `go2rtc.yaml`.
- **Resultado Esperado:** A stream `camera_portaria` é exibida no JSON da API com status ativo.

---

### Cenário 14: WebRTC não Conecta (Vídeo Travado em "Conectando...")
- **Arquivos Relevantes:** `src/components/WebRtcLivePlayer.tsx`, firewall UFW.
- **Comandos de Inspeção:**
  ```bash
  sudo ufw status | grep 8555
  ```
- **Logs Característicos no Navegador:**
  `ICE connection state failed` ou `RTCPeerConnection: connectionState -> failed`.
- **Causa Provável:** Porta WebRTC `8555` (TCP e UDP) bloqueada no firewall da VM, impedindo a passagem dos pacotes de mídia entre o go2rtc e o navegador.
- **Ação Corretiva:** Libere a porta: `sudo ufw allow 8555/tcp && sudo ufw allow 8555/udp`. Recarregue a página no navegador.
- **Resultado Esperado:** O ICE estabelece estado `connected` e a stream de vídeo começa a fluir.

---

### Cenário 15: PWA não Apresenta Vídeo (Tela Preta ou Codec Incompatível)
- **Arquivos Relevantes:** Interface da câmera IP, `WebRtcLivePlayer.tsx`.
- **Logs Característicos no Console do Navegador:**
  `Failed to execute 'setRemoteDescription' on 'RTCPeerConnection': Unsupported video codec` ou tela preta contínua com timer zerado.
- **Causa Provável:** A câmera IP está configurada com codec de vídeo **H.265 / HEVC**, que não é suportado nativamente pelo decodificador WebRTC da maioria dos navegadores sem transcodificação.
- **Ação Corretiva:** Na interface da câmera IP, altere o codec da stream para **H.264 (Baseline ou Main Profile)**.
- **Resultado Esperado:** O navegador recebe os pacotes de mídia e renderiza a imagem em tempo real com latência sub-50ms.
