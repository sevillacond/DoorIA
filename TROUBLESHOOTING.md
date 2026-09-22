# Manual Oficial de Diagnóstico e Resolução de Problemas (Troubleshooting) — Enlace-DoorIA

Este documento consolida os procedimentos técnicos para identificação, diagnóstico e resolução de incidentes no **Enlace-DoorIA**, cobrindo o banco de dados PostgreSQL 16 LTS, telefonia Asterisk 20+ (PJSIP/AMI), streaming de vídeo go2rtc, WebRTC e controladores físicos de portão.

---

## 1. Comandos de Diagnóstico Rápido e Triagem Inicial

Execute esta sequência de comandos no terminal da VM para obter uma visão geral do estado dos serviços:

```bash
# 1. Verificar estado de execução e saúde dos contêineres Docker
docker compose ps

# 2. Testar a Liveness Probe da aplicação Core
curl -i http://localhost:3000/health/live

# 3. Testar a Readiness Probe da guarita física
curl -i http://localhost:3000/health/ready

# 4. Inspecionar logs unificados de erro recentes
docker compose logs --tail=100 -f dooria-core
```

---

## 2. Diagnóstico de Telefonia e Interfonia IP (Asterisk 20 LTS & PJSIP)

### 2.1. Comandos Essenciais da CLI do Asterisk
Acesse a CLI do Asterisk dentro do contêiner:
```bash
docker exec -it dooria-asterisk asterisk -rvvvvv
```

Dentro da CLI, utilize os comandos de inspeção:
```text
; 1. Verificar status de registro dos ramais e totens
pjsip show endpoints

; 2. Inspecionar os contatos IP e portas registrados no PJSIP
pjsip show contacts

; 3. Verificar canais ativos em tempo real
core show channels

; 4. Ativar log de depuração SIP na tela em tempo real
pjsip set logger on

; 5. Desativar log de depuração SIP
pjsip set logger off
```

### 2.2. Falha de Registro do Totem Intelbras XPE 3115-IP (SIP 401 / 403 Forbidden)
- **Sintoma:** O totem não conclui o registro no Asterisk e a interface web do XPE exibe "Status SIP: Desconectado" ou "Registro Falhou".
- **Causa Raiz 1:** Divergência de senha entre a interface web do XPE e o arquivo `/config/asterisk/pjsip.conf` (seção `auth_totem`).
- **Causa Raiz 2:** O parâmetro `XPE_SIP_USERNAME` no `.env` difere do endpoint configurado no `pjsip.conf` (padrão homologado: `8000`).
- **Solução:**
  1. No painel web do Totem XPE (menu *Rede / SIP*), verifique se o **Servidor SIP** aponta para o IP da LAN do servidor DoorIA (`LOCAL_SERVER_IP`, ex: `192.168.1.100`), na porta `5060`.
  2. Ajuste o usuário para `8000` e a senha exatamente conforme declarada em `XPE_SIP_SECRET` no arquivo `.env`.
  3. No terminal da VM, recarregue a configuração do PJSIP:
     ```bash
     docker exec dooria-asterisk asterisk -rx 'pjsip reload'
     ```

### 2.3. Problema de Áudio Unidirecional (One-Way Audio) ou Mudo
- **Sintoma:** Ao atender a chamada, o morador ouve o visitante no totem, mas o visitante não ouve o morador (ou vice-versa).
- **Causa Raiz:** Bloqueio das portas RTP UDP (10000 a 20000) no firewall da VM ou configuração incorreta de `external_media_address` no `pjsip.conf`.
- **Solução:**
  1. Confirme que as portas RTP estão abertas no firewall:
     ```bash
     sudo ufw status | grep 10000:20000
     ```
  2. Caso a VM opere em rede com NAT, configure o endereço IP da LAN em `/config/asterisk/pjsip.conf`:
     ```ini
     [transport-udp]
     type = transport
     protocol = udp
     bind = 0.0.0.0:5060
     local_net = 192.168.1.0/24
     local_net = 172.28.0.0/24
     external_media_address = 192.168.1.100
     external_signaling_address = 192.168.1.100
     ```
  3. Recarregue o transporte: `docker exec dooria-asterisk asterisk -rx 'pjsip reload'`.

---

## 3. Diagnóstico do Asterisk Manager Interface (AMI - Porta 5038)

### 3.1. Teste de Conectividade do Socket AMI
A partir do host ou de dentro do contêiner `dooria-core`:
```bash
# Teste a partir do host da VM
nc -zv 127.0.0.1 5038

# Teste a partir do container dooria-core (rede bridge)
docker exec dooria-core nc -zv 172.28.0.1 5038
```

### 3.2. Falha de Autenticação AMI (`Authentication failed` ou Erro 401)
- **Sintoma:** O endpoint `/health/ready` do DoorIA retorna HTTP 503 reportando `ami: { status: "offline" }`.
- **Causa Raiz 1:** A senha declarada em `ASTERISK_AMI_SECRET` no `.env` não é idêntica à declarada em `/etc/asterisk/manager.conf`.
- **Causa Raiz 2:** A ACL do `manager.conf` rejeitou a conexão oriunda da rede interna do Docker (`172.28.0.0/24`).
- **Solução:**
  1. Inspecione a configuração ativa do gerenciador no Asterisk:
     ```bash
     docker exec dooria-asterisk asterisk -rx 'manager show settings'
     docker exec dooria-asterisk asterisk -rx 'manager show users'
     ```
  2. Certifique-se de que `/etc/asterisk/manager.conf` possui as diretivas de permissão:
     ```ini
     [dooria_ami_user]
     secret = <SENHA_DO_ENV>
     deny = 0.0.0.0/0.0.0.0
     permit = 127.0.0.1/255.255.255.255
     permit = 172.28.0.0/255.255.255.0
     ```
  3. Recarregue o gerenciador: `docker exec dooria-asterisk asterisk -rx 'manager reload'`.

---

## 4. Diagnóstico de Acionamento dos Portões e Comandos DTMF

### 4.1. Falha: `Não foi possível determinar inequivocamente o canal SIP da chamada XPE`
- **Sintoma:** Ao clicar no botão de abertura do portão no PWA, o sistema retorna erro HTTP 502 com a mensagem acima e o relé não é acionado.
- **Causa Raiz 1:** A chamada de interfone já foi finalizada antes do clique de abertura (o canal PJSIP correspondente foi destruído pelo Asterisk).
- **Causa Raiz 2:** Existem múltiplos canais ativos simultâneos no Asterisk e a requisição não informou o `UniqueID` ou o canal preferencial, ativando a proteção de cancelamento por ambiguidade.
- **Solução:**
  1. Durante a chamada ativa, consulte os canais no Asterisk:
     ```bash
     docker exec dooria-asterisk asterisk -rx 'core show channels'
     ```
  2. Verifique se o canal do XPE possui formato reconhecido (`PJSIP/totem-xpe-...` ou `PJSIP/8000-...`). O sistema associa automaticamente chamadas originadas no contexto `dooria-totem`.
  3. Certifique-se de que o visitante não encerrou a chamada antes da liberação do portão.

### 4.2. Falha: `Código DTMF não autorizado para acionamento de portão físico`
- **Sintoma:** A requisição é rejeitada com código HTTP 400.
- **Causa Raiz:** O comando enviado difere da lista homologada (`*07`, `*08`, `07`, `08`).
- **Comportamento Seguro:** O `PolicyEngine` intercepta comandos maliciosos ou incorretos (ex: `*09`, `09`, `*99`, `99`) antes que qualquer ação seja disparada no Asterisk AMI. Nenhuma ação física é executada.

### 4.3. Falha: `Bypass proibido: TRIGGER_METHOD=http_cgi não é permitido no modo físico da guarita`
- **Sintoma:** Erro HTTP 403 reportado nos logs do Core.
- **Causa Raiz:** A variável `TRIGGER_METHOD` no `.env` foi definida como `http_cgi` enquanto `DEPLOY_TARGET` está como `physical_guarita`.
- **Solução:** Em guarita física real, todo acionamento do totem é obrigatoriamente executado via injeção DTMF (`*07` ou `*08`) decodificada e enviada ao quadro elétrico blindado. Defina `TRIGGER_METHOD=dtmf` no arquivo `.env`.

---

## 5. Diagnóstico de Sensores Físicos (Reed Switch) e Status de Confirmação

### 5.1. O acionamento ocorreu, mas o status ficou `COMMAND_SENT` em vez de `HARDWARE_CONFIRMED`
- **Causa Raiz 1 (Ausência de Sensor):** Não há sensor de fim de curso (reed switch) instalado na porta ou o borne de entrada digital está desconectado. O sistema recusa emitir `HARDWARE_CONFIRMED` sem validação mecânica comprovada.
- **Causa Raiz 2 (Sensor Fechado):** O pulso elétrico foi enviado, mas o portão continuou fisicamente fechado (ex: trava mecânica emperrada ou motor sem energia).
- **Causa Raiz 3 (Mau Contato / Distância do Ímã):** A distância entre o sensor magnético e a folha do portão ultrapassa 15mm, impedindo a detecção da abertura.
- **Procedimento de Teste:**
  1. Teste a leitura do sensor via API ou controlador:
     ```bash
     curl -s http://192.168.1.160/status/sensor/1
     ```
  2. Abra manualmente a folha do portão afastando o ímã: o status deve alternar imediatamente de `fechado` para `aberto`.
  3. Acione o botão de abertura com o portão aberto: o sistema registrará `HARDWARE_CONFIRMED` na auditoria do banco de dados.

---

## 6. Diagnóstico de Câmeras IP, RTSP e Digest Auth (RFC 2617)

### 6.1. Teste de Conectividade com a Câmera IP
```bash
# Testar se a porta RTSP padrão está aberta na câmera
nc -zv 192.168.1.150 554

# Testar handshake OPTIONS via curl ou ferramenta RTSP
curl -i -X OPTIONS rtsp://192.168.1.150:554/cam/realmonitor?channel=1&subtype=0
```

### 6.2. Falha de Autenticação RTSP: `RTSP_AUTH_UNSUPPORTED_QOP`
- **Sintoma:** O validador de câmeras reporta falha de autenticação com o código `RTSP_AUTH_UNSUPPORTED_QOP`.
- **Causa Raiz:** A câmera está configurada com proteção Digest restrita a `qop="auth-int"` (integridade com cálculo de hash do corpo da mensagem), que não é suportado pelo protocolo RTSP padrão de streaming.
- **Solução:** Na interface web da câmera IP ou do Totem Intelbras, acesse o menu *Segurança / Autenticação* e altere o modo para **Digest (MD5)** com suporte a `qop="auth"` básico.

### 6.3. Falha: `Linha m=video ausente no SDP retornado`
- **Sintoma:** O comando DESCRIBE autenticado é aceito pela câmera, mas o status da câmera não atinge `STREAM_VALIDATED`.
- **Causa Raiz:** A URL RTSP aponta para uma sub-stream configurada com codec de vídeo desativado ou apenas canal de áudio.
- **Solução:** Acesse a interface web da câmera e garanta que o canal secundário (Sub-stream / Perfil T) possui codec de vídeo **H.264** ativado com taxa de quadros (FPS) entre 15 e 30 fps.

---

## 7. Diagnóstico do Gateway go2rtc (v1.9.4) e WebRTC

### 7.1. Verificação da API do go2rtc
```bash
# Consultar a lista de streams registradas no go2rtc
curl -s http://127.0.0.1:1984/api/streams | jq .
```
Se a resposta retornar `{}` (vazio), o arquivo de configuração `/config/go2rtc.yaml` não possui streams ativas ou os links RTSP falharam na inicialização.

### 7.2. Erro de Conexão: `ECONNREFUSED 127.0.0.1:1984` dentro do container Core
- **Sintoma:** O Core reporta erro de timeout ao tentar consultar a API do go2rtc.
- **Causa Raiz:** A variável `GO2RTC_API_URL` foi configurada como `http://localhost:1984` ou `http://127.0.0.1:1984` dentro do container `dooria-core`. Como o Core roda na bridge do Docker e o go2rtc roda em `network_mode: host`, `localhost` dentro do container refere-se ao próprio container!
- **Solução:** Configure `GO2RTC_API_URL=http://172.28.0.1:1984` (IP do gateway da bridge) ou `http://192.168.1.100:1984` (IP da LAN do servidor) no arquivo `.env`.

### 7.3. WebRTC no Navegador: Tela Preta ou Vídeo em "Conectando..."
- **Causa Raiz 1 (Codec H.265 Incompatível):** Câmeras configuradas com codec de vídeo H.265 / HEVC requerem decodificadores específicos que nem todos os navegadores suportam nativamente via WebRTC sem transcodificação.
  - **Solução:** Configure a câmera IP para emitir stream em **H.264 (Baseline ou Main Profile)**.
- **Causa Raiz 2 (Portas WebRTC Bloqueadas):** A porta `8555` (TCP e UDP) não está liberada no firewall do host.
  - **Solução:** Execute `sudo ufw allow 8555/tcp && sudo ufw allow 8555/udp`.
- **Causa Raiz 3 (Certificado Autoassinado / WSS):** Se o acesso ao PWA for realizado via HTTPS, o navegador bloqueia conexões WebSocket inseguras (`ws://`). É obrigatório ter proxy com terminação TLS (Traefik ou Nginx) ou acessar localmente via HTTP durante a homologação em bancada.

---

## 8. Diagnóstico do Banco de Dados PostgreSQL 16 LTS

### 8.1. Verificação de Saúde do PostgreSQL
```bash
# Verificar se o servidor do PostgreSQL está aceitando conexões
docker exec dooria-postgres pg_isready -h localhost -p 5432 -U dooria -d dooria_db
```
Se o retorno for `accepting connections`, o banco está saudável.

### 8.2. Inspecionar as 14 Tabelas Oficiais no Banco de Dados
Acesse a CLI `psql`:
```bash
docker exec -it dooria-postgres psql -U dooria -d dooria_db -c "\dt"
```
A listagem deve conter:
- `condominium_config`
- `xpe_config`
- `units`
- `residents`
- `vehicles`
- `gates`
- `camera_devices`
- `active_calls`
- `call_logs`
- `financial_bills`
- `audit_logs`
- `visitor_invites`
- `package_deliveries`
- `lpr_logs`

### 8.3. Execução Forçada de Migrações do Drizzle ORM
Caso alguma tabela esteja ausente ou o schema tenha sofrido atualização:
```bash
docker compose run --rm -e NODE_ENV=production dooria-app npm run db:migrate
```

---

## 9. Contenção Global e Diagnóstico de Frontend (`ErrorBoundary`)

O frontend React é protegido na raiz por um componente de contenção de erros (`ErrorBoundary.tsx`):
- **Prevenção de White Screen:** Caso ocorra qualquer exceção não tratada em componentes filhos, a aplicação não exibe tela em branco.
- **Painel de Diagnóstico:** Uma tela técnica exibe a mensagem de erro, o componente causador e um botão para "Recarregar Aplicação".
- **Log Seguro Automático:** O erro é sanitizado e despachado automaticamente via requisição `POST /api/v1/log-error` para o servidor Node.js, registrando o incidente estruturado no terminal com IP e contexto, sem risco de loop infinito.
