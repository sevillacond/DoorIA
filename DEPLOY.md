# Manual Oficial de Implantação em VM — Homologação Física Preliminar e Guarita Piloto — Enlace-DoorIA

> **DECLARAÇÃO OBRIGATÓRIA DE AMBIENTE E ESCOPO:**  
> **ESTE AMBIENTE DESTINA-SE À HOMOLOGAÇÃO E AOS TESTES FÍSICOS CONTROLADOS DA DOORIA.**  
> «A VM de homologação será utilizada para testes controlados com equipamentos físicos. A aprovação da homologação não representa automaticamente autorização para operação em produção.»

---

## 1. Diferenciação de Ambientes: Homologação Física vs. Produção Futura

Para garantir total conformidade operacional e segurança física na portaria condominial, é obrigatório diferenciar os estágios do ciclo de vida:

| Critério | Ambiente de Homologação em VM (Atual) | Ambiente de Produção Futura (Definitivo) |
|---|---|---|
| **Classificação** | **HOMOLOGAÇÃO / TESTE FÍSICO CONTROLADO** | **PRODUÇÃO DEFINITIVA EM GUARITA** |
| **Infraestrutura** | VM Ubuntu 24.04 LTS em bancada de laboratório ou Mini PC de teste | Mini PC Industrial x86-64 dedicado na guarita com nobreak senoidal |
| **Equipamentos** | XPE 3115-IP em bancada, relé de bancada, switch de teste | Totem externo na calçada, quadro elétrico blindado interno, portões reais |
| **Banco de Dados** | PostgreSQL 16 LTS local com dados de homologação/piloto | PostgreSQL 16 LTS local com cadastro definitivo de moradores e unidades |
| **Rede & Acesso** | Subnet de bancada (ex: `192.168.1.0/24`) com acesso local restrito | VLAN isolada de segurança física na guarita com proxy TLS (Traefik/Nginx) |
| **Autorização de Uso** | Restrita aos engenheiros de teste e equipe de homologação | Liberada aos porteiros, moradores e administração condominial |

---

## 2. Visão Geral da Arquitetura de Implantação

O **Enlace-DoorIA** opera sob a filosofia **Local-First**, garantindo que as funções vitais da portaria (interfonia, CFTV e controle de acesso) funcionem com autonomia na rede local (LAN), independentemente do status de conexão com a Internet.

A stack orquestrada via Docker Compose (`docker-compose.yml`) é composta por:
1. **`dooria-postgres`** (`postgres:16-alpine`): Banco relacional **PostgreSQL 16 LTS**, com integridade ACID, 14 tabelas oficiais, migrações automatizadas via **Drizzle ORM** e isolamento na rede interna `dooria-network` (porta 5432 não exposta publicamente na interface de rede da máquina).
2. **`dooria-core`** (`dooria-app`): Servidor full-stack em **Node.js 22 LTS (Express + Vite/React + TypeScript)** compilado para executável único CommonJS (`dist/server.cjs`), integrando Policy Engine de segurança, RBAC, EventBus com auditoria SHA-256 e controle de relés.
3. **`dooria-asterisk`** (`andrius/asterisk:20-alpine`): Servidor de telefonia **Asterisk 20+ LTS Pure (PJSIP)** em `network_mode: host` para sinalização SIP (UDP 5060), WebPhone WebRTC (WSS 8089) e áudio RTP (UDP 10000-20000), gerenciado pela interface **AMI (TCP 5038)**.
4. **`dooria-go2rtc`** (`alexxit/go2rtc:v1.9.4`): Gateway de streaming de vídeo **go2rtc v1.9.4** em `network_mode: host` para re-streaming de RTSP de câmeras IP e totens para WebRTC sub-50ms (portas 1984 e 8555).

---

## 3. Requisitos da VM e Especificações Operacionais

### 3.1. Requisitos de Hardware
| Recurso | Mínimo para Homologação (Bancada) | Recomendação Operacional (Instalação Física Definitiva) |
|---|---|---|
| **Sistema Operacional** | Ubuntu 24.04 LTS (x86_64 limpo) | Ubuntu 24.04 LTS (x86_64 limpo) |
| **CPU** | 2 vCPUs (Intel/AMD x86_64) | 4 vCPUs ou Intel Core i3/i5 (10ª gen+) / Celeron N5105/N100 |
| **Memória RAM** | 4 GB | 8 GB a 16 GB |
| **Armazenamento** | 30 GB SSD | 120 GB+ SSD NVMe |
| **Rede** | 1 Gbps Ethernet em modo Bridge na LAN | 1 Gbps Ethernet dedicada (Cat6 blindado) |
| **Alimentação** | Alimentação convencional | Nobreak (UPS) senoidal puro de 1200VA+ com autonomia para guarita |

*Nota: As especificações acima constituem recomendações operacionais de engenharia e não requisitos intrínsecos do software.*

---

## 4. Preparação da VM Ubuntu 24.04 LTS

Execute a sequência de comandos em terminal administrativo (`sudo`):

### 4.1. Atualização e Utilitários Essenciais
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git net-tools ufw ca-certificates gnupg lsb-release jq
```

### 4.2. Hostname, Fuso Horário e Permissões
```bash
# Definir fuso horário oficial
sudo timedatectl set-timezone America/Sao_Paulo

# Definir hostname da estação de homologação
sudo hostnamectl set-hostname guarita-homologacao

# Adicionar usuário atual ao grupo docker (após instalação do Docker)
sudo usermod -aG docker $USER
```

### 4.3. Instalação Oficial do Docker Engine e Docker Compose Plugin
```bash
# Adicionar repositório oficial do Docker
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Habilitar e iniciar o daemon do Docker
sudo systemctl enable docker
sudo systemctl start docker

# Validação das versões instaladas
docker --version
docker compose version
```

---

## 5. Configuração de Rede, Portas e Firewall (UFW)

### 5.1. Endereçamento IP na Bancada de Homologação
- **IP da VM / Servidor Local (`LOCAL_SERVER_IP`):** Endereço IPv4 estático na interface física (ex: `192.168.1.100`).
- **IP do Totem Intelbras XPE (`XPE_IP`):** Endereço IPv4 estático do interfone IP (ex: `192.168.1.150`).
- **IP do Controlador de Relé (`RELAY_CONTROLLER_IP`):** Endereço IPv4 do módulo de relés/sensores (ex: `192.168.1.160`).
- **IP das Câmeras CFTV:** Endereços IPv4 das câmeras IP da bancada (ex: `192.168.1.151` a `192.168.1.153`).
- **Subnet Docker Bridge (`dooria-network`):** `172.28.0.0/24` (Gateway: `172.28.0.1`).

### 5.2. Regra Fundamental de Endereçamento entre Contêineres e Host
> **É ESTRITAMENTE PROIBIDO DOCUMENTAR "localhost" OU "127.0.0.1" COMO ENDEREÇO DO HOST QUANDO A CONEXÃO PARTE DO CONTAINER `dooria-app`:**
> - `localhost` dentro do container `dooria-app` refere-se ao **próprio container**.
> - Para acessar serviços em `network_mode: host` (como go2rtc e Asterisk AMI a partir do Core), o container `dooria-app` utiliza o IP do gateway da bridge (`172.28.0.1`), o alias `host.docker.internal` (mapeado via `host-gateway`) ou o IP da interface LAN da VM (`LOCAL_SERVER_IP`).
> - A variável `GO2RTC_API_URL` **NUNCA** deve ser configurada como `http://localhost:1984` dentro do container. O validador de inicialização (`productionValidator.ts`) rejeita essa configuração e aborta o boot em modo de guarita física.

### 5.3. Tabela Completa de Portas e Firewall
| Porta | Protocolo | Serviço | Origem Autorizada | Descrição |
|---|---|---|---|---|
| **22** | TCP | SSH | Rede de Gerência | Acesso administrativo à VM |
| **3000** | TCP | DoorIA Core API & Web | LAN / Proxy Reverso | Interface Web e rotas REST |
| **80** / **443** | TCP | HTTP / HTTPS | LAN / Clientes | Proxy reverso e terminação TLS para PWA |
| **5060** | UDP | Asterisk SIP/PJSIP | Totem XPE e Telefones IP | Sinalização de chamadas de interfone |
| **8089** | TCP | Asterisk WSS | Navegadores e App Mobile | WebSocket Seguro para WebPhone WebRTC |
| **10000:20000** | UDP | Asterisk RTP Media | Clientes SIP e Totens | Mídia de áudio de conversação |
| **1984** | TCP | go2rtc Web/API | LAN / Proxy Reverso | Interface de streams e WebSockets de vídeo |
| **8555** | TCP/UDP | go2rtc WebRTC Media | Navegadores e App Mobile | Transporte de pacotes WebRTC de vídeo |
| **554** | TCP/UDP | RTSP | Câmeras IP da LAN | Transporte de vídeo RTSP para o go2rtc |
| **5432** | TCP | PostgreSQL 16 LTS | **Apenas Rede Docker (`172.28.0.0/24`)** | Banco de dados (NUNCA exposto à LAN) |
| **5038** | TCP | Asterisk AMI | **Apenas `127.0.0.1` e Rede Docker** | Interface de gerenciamento do Asterisk |

### 5.4. Regras do Firewall UFW
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Acesso de gerenciamento
sudo ufw allow 22/tcp comment 'SSH'

# Aplicação e Proxy
sudo ufw allow 3000/tcp comment 'DoorIA Web/API'
sudo ufw allow 80/tcp comment 'HTTP'
sudo ufw allow 443/tcp comment 'HTTPS'

# Telefonia Asterisk
sudo ufw allow 5060/udp comment 'SIP PJSIP'
sudo ufw allow 8089/tcp comment 'WebRTC WSS'
sudo ufw allow 10000:20000/udp comment 'RTP Media'

# Vídeo go2rtc
sudo ufw allow 1984/tcp comment 'go2rtc API'
sudo ufw allow 8555/tcp comment 'go2rtc WebRTC TCP'
sudo ufw allow 8555/udp comment 'go2rtc WebRTC UDP'

# Habilitar firewall
sudo ufw --force enable
sudo ufw status verbose
```

---

## 6. Dicionário Completo de Variáveis de Ambiente (`.env`)

Copie o arquivo de exemplo antes de iniciar:
```bash
cp .env.example .env
chmod 600 .env
```

| Variável | Obrigatória | Exemplo Seguro | Finalidade |
|---|:---:|---|---|
| `NODE_ENV` | Sim | `production` | Modo de execução do runtime Node.js |
| `DEPLOY_TARGET` | Sim | `physical_guarita` | Alvo operacional (ativa validação estrita anti-bypass) |
| `STRICT_PRODUCTION_AUDIT` | Sim | `true` | Ativa fail-fast para todas as regras de segurança física |
| `SESSION_SECRET` | Sim | `<STRING_HEX_32_CHARS>` | Chave secreta de no mínimo 32 caracteres para sessões |
| `CONDO_ID` | Sim | `condo-homologacao` | Identificador do condomínio no banco |
| `CONDO_CNPJ` | Sim | `12.345.678/0001-90` | CNPJ de registro do condomínio |
| `CONDO_NAME` | Sim | `Condomínio Solar Homologação` | Nome do condomínio |
| `CONDO_CITY` | Sim | `São Luís` | Cidade |
| `CONDO_STATE` | Sim | `MA` | Sigla da Unidade Federativa |
| `CONDO_UNITS_COUNT` | Sim | `12` | Quantidade de unidades autônomas |
| `LOCAL_SERVER_IP` | Sim | `<IP_DA_VM>` (ex: `192.168.1.100`) | Endereço IPv4 estático da VM na LAN |
| `INITIAL_ADMIN_USER` | Sim | `admin_guarita` | Usuário administrador criado no bootstrap |
| `INITIAL_ADMIN_PASSWORD` | Sim | `<SENHA_FORTE_ADMIN_32_CHARS>` | Senha mestra do administrador no bootstrap inicial |
| `INITIAL_ADMIN_EMAIL` | Sim | `guarita@condominio.local` | E-mail do administrador |
| `POSTGRES_DB` | Sim | `dooria_db` | Nome do banco relacional PostgreSQL |
| `POSTGRES_USER` | Sim | `dooria` | Usuário do banco de dados |
| `POSTGRES_PASSWORD` | Sim | `<SENHA_FORTE_POSTGRES_32_CHARS>` | Senha do banco (obrigatória e sem valor padrão) |
| `POSTGRES_HOST` | Sim | `postgres` | Hostname do container na rede Docker bridge |
| `POSTGRES_PORT` | Sim | `5432` | Porta interna do banco na rede Docker |
| `DATABASE_URL` | Sim | `postgresql://dooria:<SENHA>@postgres:5432/dooria_db` | URL completa de conexão Drizzle ORM |
| `ASTERISK_HOST` | Sim | `<IP_DA_VM>` (ex: `192.168.1.100`) | IP do servidor Asterisk acessível pelo Core |
| `ASTERISK_AMI_PORT` | Sim | `5038` | Porta TCP do serviço AMI do Asterisk |
| `ASTERISK_AMI_USERNAME` | Sim | `dooria_ami_user` | Usuário configurado no `manager.conf` |
| `ASTERISK_AMI_SECRET` | Sim | `<SENHA_FORTE_AMI_32_CHARS>` | Senha do AMI configurada no `manager.conf` |
| `ASTERISK_SIP_SERVER` | Sim | `<IP_DA_VM>` | IP do servidor SIP PJSIP para WebPhone |
| `ASTERISK_SIP_PORT` | Sim | `5060` | Porta UDP da sinalização SIP |
| `ASTERISK_WSS_PORT` | Sim | `8089` | Porta TCP do WebSocket Seguro para WebPhone |
| `XPE_IP` | Sim | `<IP_DO_XPE>` (ex: `192.168.1.150`) | IP estático do totem Intelbras XPE 3115-IP na LAN |
| `XPE_SIP_USERNAME` | Sim | `8000` | Ramal SIP registrado pelo totem no Asterisk |
| `XPE_SIP_SECRET` | Sim | `<SENHA_SIP_XPE>` | Senha de registro SIP do totem no `pjsip.conf` |
| `XPE_RTSP_USERNAME` | Sim | `admin` | Usuário de autenticação RTSP da câmera do totem |
| `XPE_RTSP_PASSWORD` | Sim | `<SENHA_RTSP_XPE>` | Senha RTSP da câmera do totem |
| `RELAY_CONTROLLER_IP` | Sim | `<IP_CONTROLADOR>` (ex: `192.168.1.160`) | IP do controlador de relés e sensores na LAN |
| `TRIGGER_METHOD` | Não | `dtmf` | Método de acionamento (em guarita física, estritamente `dtmf`) |
| `CAMERA_PORTARIA_ENABLED`| Sim | `true` | Habilita a câmera principal da portaria/totem XPE |
| `GO2RTC_CAMERA_PORTARIA_URL`| Condicional | `rtsp://<USER>:<PASS>@<IP>:554/cam/realmonitor?channel=1&subtype=0` | URL RTSP da portaria (obrigatória se habilitada) |
| `CAMERA_GARAGEM_ENABLED` | Não | `false` | Habilita câmera veicular da garagem |
| `GO2RTC_CAMERA_GARAGEM_URL` | Condicional | `rtsp://<USER>:<PASS>@<IP>:554/live` | URL RTSP da garagem (obrigatória se habilitada) |
| `CAMERA_HALL_ENABLED` | Não | `false` | Habilita câmera do hall social |
| `GO2RTC_CAMERA_HALL_URL` | Condicional | `rtsp://<USER>:<PASS>@<IP>:554/live` | URL RTSP do hall (obrigatória se habilitada) |
| `CAMERA_GOURMET_ENABLED` | Não | `false` | Habilita câmera da área gourmet |
| `GO2RTC_CAMERA_GOURMET_URL`| Condicional | `rtsp://<USER>:<PASS>@<IP>:554/live` | URL RTSP da área gourmet (obrigatória se habilitada) |
| `GO2RTC_API_URL` | Sim | `http://172.28.0.1:1984` | URL da API do go2rtc acessível pelo Core |
| `GEMINI_API_KEY` | Não | `<CHAVE_OPCIONAL>` | Chave Google Gemini (opcional; há fallback semântico local) |

---

## 7. Procedimentos de Implantação e Inicialização

### 7.1. Validação Sintática de Composição
Antes de subir qualquer serviço, valide o arquivo `docker-compose.yml`:
```bash
docker compose config
```

### 7.2. Implantação Automatizada com `./deploy.sh` (Procedimento Oficial)
O script oficial `./deploy.sh` executa a checagem sequencial e a orquestração segura:
```bash
cd /opt/dooria
chmod +x deploy.sh
sudo ./deploy.sh
```

#### Ordem Real de Inicialização Orquestrada:
```
PostgreSQL 16 LTS
       ↓
healthcheck nativo (pg_isready)
       ↓
migrations estruturais (Drizzle ORM: npm run db:migrate)
       ↓
bootstrap de dados iniciais
       ↓
Asterisk 20 LTS (PJSIP / AMI na porta 5038)
       ↓
go2rtc v1.9.4 (Gateway de Vídeo)
       ↓
DoorIA Core (Express / Vite / PolicyEngine na porta 3000)
```

---

## 8. Healthchecks Oficiais e Monitoramento

| Probe | Endpoint | Critério de Aprovação | Comportamento em Falha |
|---|---|---|---|
| **Liveness Probe** | `GET /health/live` | Processo Node.js respondendo com código HTTP 200 | Container não responsivo; Docker reinicia o container |
| **Readiness Probe** | `GET /health/ready` | 1. PostgreSQL conectado com tabelas migradas<br>2. Socket Asterisk AMI ativo na porta 5038<br>3. Handshake/Ping AMI autenticado com sucesso<br>4. Configuração estrita de guarita validada | Retorna HTTP 503 com relatório detalhado. **REGRA:** O readiness probe **JAMAIS** aciona relés elétricos ou emite `PlayDTMF`. |
| **Health Global** | `GET /api/v1/health` | Responde relatório consolidado do banco, AMI e integridade geral | Exibe componentes degradados no JSON |

---

## 9. Backup, Restauração e Recuperação de Desastres

> **AVISO IMPORTANTE:** O sistema opera sob o modelo *Local-First* e **NÃO** realiza backup automático em nuvem por padrão. A realização de cópias de segurança é um procedimento operacional sob responsabilidade do técnico.

### 9.1. Procedimento de Backup Manual Instantâneo
```bash
mkdir -p /opt/dooria/backups
docker exec dooria-postgres pg_dump -U dooria dooria_db > /opt/dooria/backups/backup_dooria_$(date +%Y%m%d_%H%M%S).sql
cp .env /opt/dooria/backups/env_backup_$(date +%Y%m%d_%H%M%S)
```

### 9.2. Procedimento de Restauração de Banco de Dados
```bash
# 1. Parar a aplicação Core
docker compose stop dooria-app

# 2. Restaurar o dump do banco de dados no PostgreSQL
docker exec -i dooria-postgres psql -U dooria dooria_db < /opt/dooria/backups/backup_dooria_YYYYMMDD_HHMMSS.sql

# 3. Reiniciar a aplicação Core
docker compose start dooria-app

# 4. Validar a prontidão do sistema
curl -s http://localhost:3000/health/ready | jq .
```

---

## 10. Atualização Segura e Procedimento de Rollback

### 10.1. Atualização do Sistema
```bash
cd /opt/dooria

# 1. Backup prévio obrigatório
docker exec dooria-postgres pg_dump -U dooria dooria_db > backup_pre_update.sql

# 2. Atualizar código do repositório Git
git pull origin main

# 3. Validar sintaxe da composição
docker compose config

# 4. Recompilar imagem do Core
docker compose build dooria-app

# 5. Aplicar migrações do Drizzle ORM
docker compose run --rm -e NODE_ENV=production dooria-app npm run db:migrate

# 6. Reiniciar contêineres atualizados
docker compose up -d

# 7. Validar healthcheck
curl -s http://localhost:3000/health/ready
```

### 10.2. Procedimento de Rollback
> **Nota de Arquitetura:** As migrações do Drizzle ORM são do tipo incremental (*forward-only*), não existindo rollback automático de migrações estruturais. Em caso de incompatibilidade de banco, é mandatório restaurar o dump gerado antes da atualização.

```bash
cd /opt/dooria

# 1. Retornar ao commit Git anterior estável
git checkout <COMMIT_SHA_ANTERIOR>

# 2. Recompilar a imagem do Core da versão anterior
docker compose build dooria-app

# 3. Restaurar banco se houve migração incompatível
docker compose stop dooria-app
docker exec -i dooria-postgres psql -U dooria dooria_db < backup_pre_update.sql

# 4. Subir a versão anterior
docker compose up -d
```
