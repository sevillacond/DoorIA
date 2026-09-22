# Manual Oficial de Implantação e Deploy em Produção — Enlace-DoorIA

Este documento é o guia técnico oficial para implantação, configuração e operação do **Enlace-DoorIA** a partir de uma máquina virtual ou servidor físico limpo executando **Ubuntu 24.04 LTS (Noble Numbat)**.

---

## 1. Visão Geral da Arquitetura de Implantação

O **Enlace-DoorIA** é uma plataforma condominial operada sob a filosofia **Local-First**, eliminando dependências contínuas de serviços de nuvem para a operação diária da guarita.

A solução é orquestrada através do Docker Compose e composta por quatro contêineres principais:
1. **`dooria-postgres`**: Banco de dados relacional puro local **PostgreSQL 16 LTS**, com integridade referencial ACID, migrações automatizadas via **Drizzle ORM** e isolamento na rede interna do Docker (porta 5432 não exposta à LAN).
2. **`dooria-core`**: Aplicação full-stack em **Node.js 22 LTS (Express + Vite/React + TypeScript)** compilada para um executável único CommonJS (`dist/server.cjs`), incorporando o Policy Engine de segurança, RBAC, EventBus com auditoria em tempo real e controle de acesso a relés.
3. **`dooria-asterisk`**: Servidor de telefonia e interfonia IP **Asterisk 20+ LTS Pure (PJSIP)**, operando em `network_mode: host` para comunicação SIP nativa (UDP 5060), WebPhone WebRTC (WSS 8089) e áudio RTP (UDP 10000-20000), gerenciado pela interface **AMI (TCP 5038)**.
4. **`dooria-go2rtc`**: Gateway de streaming de vídeo ultra-leve **go2rtc v1.9.4**, operando em `network_mode: host` para re-streaming de RTSP de câmeras IP e totens para WebRTC sub-50ms (porta 1984 e 8555).

---

## 2. Requisitos de Infraestrutura (VM / Servidor Local)

### 2.1. Especificações de Hardware
| Recurso | Mínimo (Homologação / Testes) | Recomendado (Guarita Física / Produção) |
|---|---|---|
| **Sistema Operacional** | Ubuntu 24.04 LTS (x86_64) | Ubuntu 24.04 LTS (x86_64) |
| **Processador (CPU)** | 2 vCPUs (Intel/AMD x86_64) | 4 vCPUs ou Intel Core i3/i5 (10ª gen+) / Celeron N5105/N100 |
| **Memória RAM** | 4 GB | 8 GB a 16 GB |
| **Armazenamento** | 30 GB SSD | 120 GB+ SSD NVMe |
| **Interface de Rede** | 1 Gbps Ethernet | 1 Gbps Ethernet dedicada (cabeamento Cat6 blindado) |
| **Alimentação** | Fonte padrão | Nobreak (UPS) senoidal puro de 1200VA+ com autonomia para portaria |

### 2.2. Endereçamento e Rede Local (LAN)
- **IP do Servidor Local (`LOCAL_SERVER_IP`):** Endereço IPv4 estático atribuído à interface do servidor (exemplo: `192.168.1.100` ou `10.0.0.100`).
- **Totem Intelbras XPE 3115-IP (`XPE_IP`):** Endereço IPv4 estático na mesma LAN (exemplo: `192.168.1.150`).
- **Controlador de Relé e Sensores (`RELAY_CONTROLLER_IP`):** Endereço IPv4 estático do quadro elétrico blindado (exemplo: `192.168.1.160`).

---

## 3. Preparação do Sistema Operacional (Ubuntu 24.04 LTS)

Execute os comandos a seguir em uma sessão de terminal com privilégios de superusuário (`sudo`):

### 3.1. Atualização de Pacotes e Instalação de Utilitários
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git net-tools ufw ca-certificates gnupg lsb-release
```

### 3.2. Configuração de Fuso Horário e Hostname
```bash
# Definir fuso horário padrão oficial
sudo timedatectl set-timezone America/Sao_Paulo

# Definir hostname descritivo para a guarita
sudo hostnamectl set-hostname guarita-dooria
```

### 3.3. Instalação Oficial do Docker Engine e Docker Compose Plugin
```bash
# Adicionar a chave GPG oficial do Docker
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Adicionar o repositório estável do Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker Engine, CLI, Containerd e Plugin Docker Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Adicionar o usuário atual ao grupo docker para executar comandos sem sudo
sudo usermod -aG docker $USER

# Habilitar e iniciar o serviço Docker no boot
sudo systemctl enable docker
sudo systemctl start docker
```

Verifique a instalação:
```bash
docker --version
docker compose version
```

---

## 4. Configuração de Firewall e Portas de Rede

O sistema opera com separação rigorosa entre portas públicas (acessíveis aos moradores e interfone na LAN) e portas restritas à comunicação interna de processos.

### 4.1. Tabela Completa de Portas
| Porta | Protocolo | Serviço | Origem Permitida | Descrição |
|---|---|---|---|---|
| **22** | TCP | SSH | Rede de Gerência / Administrador | Acesso administrativo remoto à VM |
| **80** / **443** | TCP | HTTP / HTTPS (Traefik/Nginx) | Qualquer (LAN / Internet) | Proxy reverso e terminação TLS para PWA |
| **3000** | TCP | DoorIA Core API & Web | LAN / Proxy Reverso | Interface Web e rotas REST do sistema |
| **5060** | UDP | Asterisk SIP/PJSIP | Totens XPE e Telefones IP | Sinalização de interfonia e chamadas |
| **8089** | TCP | Asterisk WSS | Navegadores e App Mobile | WebSocket Seguro para WebPhone WebRTC |
| **10000-20000** | UDP | Asterisk RTP Media | Clientes SIP e Totens | Fluxos de áudio de conversação em tempo real |
| **1984** | TCP | go2rtc Web/API | LAN / Proxy Reverso | Interface administrativa e WebSockets de vídeo |
| **8555** | TCP/UDP | go2rtc WebRTC Media | Navegadores e App Mobile | Transporte de vídeo WebRTC sub-50ms |
| **554** | TCP/UDP | RTSP | Câmeras IP da LAN | Coleta de vídeo RTSP para o go2rtc |
| **5432** | TCP | PostgreSQL 16 LTS | **Apenas Rede Docker (`172.28.0.0/24`)** | Banco de dados puro local (NUNCA exposto à LAN) |
| **5038** | TCP | Asterisk AMI | **Apenas `127.0.0.1` e Rede Docker** | Interface de Gerenciamento do Asterisk |

### 4.2. Aplicação das Regras no UFW (Uncomplicated Firewall)
```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Acesso administrativo SSH
sudo ufw allow 22/tcp comment 'SSH Administrativo'

# DoorIA Core e Proxies
sudo ufw allow 3000/tcp comment 'DoorIA Web e API'
sudo ufw allow 80/tcp comment 'HTTP Proxy'
sudo ufw allow 443/tcp comment 'HTTPS TLS Proxy'

# Telefonia e Interfonia Asterisk
sudo ufw allow 5060/udp comment 'Asterisk SIP UDP'
sudo ufw allow 8089/tcp comment 'Asterisk WebRTC WSS'
sudo ufw allow 10000:20000/udp comment 'Asterisk RTP Media'

# Streaming de Vídeo go2rtc
sudo ufw allow 1984/tcp comment 'go2rtc API e Web'
sudo ufw allow 8555/tcp comment 'go2rtc WebRTC TCP'
sudo ufw allow 8555/udp comment 'go2rtc WebRTC UDP'

# Habilitar o firewall
sudo ufw --force enable
sudo ufw status verbose
```

> **Atenção:** As portas `5432` (PostgreSQL) e `5038` (AMI) **NÃO** devem ser abertas no UFW para o tráfego externo da interface de rede.

---

## 5. Topologia e Isolamento da Rede Docker

O arquivo `docker-compose.yml` adota um modelo híbrido de rede intencional e endurecido:

```
                           HOST FÍSICO / VM (Interface LAN - ex: 192.168.1.100)
       ┌──────────────────────────────────────────────────────────────────────────────────┐
       │                                                                                  │
       │   Serviços em network_mode: host                                                 │
       │   ┌────────────────────────────────┐       ┌─────────────────────────────────┐   │
       │   │       dooria-asterisk          │       │          dooria-go2rtc          │   │
       │   │  (UDP 5060, WSS 8089, AMI 5038)│       │     (TCP 1984, TCP/UDP 8555)    │   │
       │   └───────────────▲────────────────┘       └────────────────▲────────────────┘   │
       │                   │                                         │                    │
       │                   │ Conexão TCP 5038                        │ Conexão TCP 1984   │
       │                   │ (permit 172.28.0.0/24)                  │                    │
       │  ═════════════════╪═════════════════════════════════════════╪═════════════════   │
       │  REDE DOCKER BRIDGE: dooria-network (Subnet: 172.28.0.0/24, Gateway: 172.28.0.1) │
       │                   │                                         │                    │
       │   ┌───────────────┴─────────────────────────────────────────┴────────────────┐   │
       │   │                                dooria-core                               │   │
       │   │       IP na bridge: 172.28.0.X | Porta mapeada para o host: 3000:3000     │   │
       │   │       GO2RTC_API_URL: http://172.28.0.1:1984 (ou http://LOCAL_SERVER_IP) │   │
       │   └──────────────────────────────────────┬───────────────────────────────────┘   │
       │                                          │ Pool PostgreSQL                       │
       │                                          │ (TCP 5432 interno)                    │
       │                                          ▼                                       │
       │   ┌──────────────────────────────────────────────────────────────────────────┐   │
       │   │                              dooria-postgres                             │   │
       │   │       IP na bridge: 172.28.0.Y | Porta 5432 interna à rede bridge        │   │
       │   └──────────────────────────────────────────────────────────────────────────┘   │
       └──────────────────────────────────────────────────────────────────────────────────┘
```

### Regras Críticas de Conectividade entre Contêineres e Host:
1. **Comunicação `dooria-core` → `go2rtc`:**
   Como o `go2rtc` roda em `network_mode: host` e o `dooria-core` roda dentro da bridge `dooria-network`, o Core acessa a API do go2rtc através do gateway da bridge (`http://172.28.0.1:1984`), através de `http://host.docker.internal:1984` (injetado via `extra_hosts`) ou através do IP LAN (`http://${LOCAL_SERVER_IP}:1984`).
   - **PROIBIÇÃO DE LOOPBACK:** É estritamente proibido configurar `GO2RTC_API_URL=http://localhost:1984` ou `http://127.0.0.1:1984` dentro do container `dooria-core`. O validador de produção (`productionValidator.ts`) rejeita essa configuração no boot em modo de guarita física (`DEPLOY_TARGET=physical_guarita`).
2. **Comunicação `dooria-core` → `Asterisk AMI`:**
   O `dooria-core` conecta-se na porta 5038 do Asterisk. O arquivo `/etc/asterisk/manager.conf` possui regras de ACL explícitas autorizando conexões oriundas da subnet `172.28.0.0/24` e de `127.0.0.1`.
3. **Comunicação `dooria-core` → `PostgreSQL`:**
   O container do banco de dados atende pelo hostname interno `postgres` na porta padrão `5432` da rede bridge. A porta não é exposta publicamente na interface de rede do host.

---

## 6. Dicionário Completo de Variáveis de Ambiente (`.env`)

Copie o modelo de produção antes de iniciar a configuração:
```bash
cp .env.example .env
chmod 600 .env
```

### 6.1. Segurança, Autenticação e Configuração do Condomínio
| Variável | Obrigatória | Exemplo | Descrição |
|---|---|---|---|
| `NODE_ENV` | Sim | `production` | Modo de execução da aplicação. |
| `DEPLOY_TARGET` | Sim | `physical_guarita` | Alvo de implantação. Em guarita física, ativa validação estrita anti-bypass. |
| `STRICT_PRODUCTION_AUDIT` | Sim | `true` | Ativa fail-fast para todas as regras de segurança física e banco. |
| `SESSION_SECRET` | Sim | `<STRING_HEX_32_CHARS>` | Chave secreta de no mínimo 32 caracteres para assinatura de sessões. |
| `CONDO_ID` | Sim | `condo-solar-palmeiras` | Identificador único do condomínio no banco de dados. |
| `CONDO_CNPJ` | Sim | `12.345.678/0001-90` | CNPJ oficial do condomínio. |
| `CONDO_NAME` | Sim | `Condomínio Solar das Palmeiras` | Razão social ou nome de fachada do condomínio. |
| `CONDO_CITY` | Sim | `São Luís` | Cidade de localização. |
| `CONDO_STATE` | Sim | `MA` | Sigla da Unidade Federativa (UF). |
| `CONDO_UNITS_COUNT` | Sim | `12` | Quantidade total de unidades autônomas. |
| `LOCAL_SERVER_IP` | Sim | `192.168.1.100` | Endereço IP estático da interface física da guarita na LAN. |
| `INITIAL_ADMIN_USER` | Sim | `admin_guarita` | Nome do usuário administrador padrão criado no bootstrap. |
| `INITIAL_ADMIN_PASSWORD`| Sim | `<SENHA_FORTE_ADMIN_32_CHARS>` | Senha mestra do administrador no bootstrap inicial. |
| `INITIAL_ADMIN_EMAIL` | Sim | `guarita@condominio.local` | E-mail corporativo para contato e auditoria do administrador. |

### 6.2. Banco de Dados Puro Local (PostgreSQL 16 LTS)
| Variável | Obrigatória | Exemplo | Descrição |
|---|---|---|---|
| `POSTGRES_DB` | Sim | `dooria_db` | Nome do banco de dados relacional. |
| `POSTGRES_USER` | Sim | `dooria` | Usuário proprietário do banco no PostgreSQL. |
| `POSTGRES_PASSWORD` | Sim | `<SENHA_FORTE_POSTGRES_32_CHARS>`| Senha do usuário do banco (obrigatória e sem valor padrão). |
| `DATABASE_URL` | Sim | `postgresql://dooria:<SENHA>@postgres:5432/dooria_db` | URL completa de conexão PDO/Drizzle ORM. |
| `POSTGRES_HOST` | Sim | `postgres` | Hostname do contêiner do PostgreSQL na rede Docker. |
| `POSTGRES_PORT` | Sim | `5432` | Porta interna do banco de dados na rede Docker. |

### 6.3. Telefonia, Interfonia IP (Asterisk 20 LTS & AMI) e Totem XPE
| Variável | Obrigatória | Exemplo | Descrição |
|---|---|---|---|
| `ASTERISK_HOST` | Sim | `192.168.1.100` | IP do servidor Asterisk acessível pelo Core (IP da LAN). |
| `ASTERISK_AMI_PORT` | Sim | `5038` | Porta TCP do serviço AMI do Asterisk. |
| `ASTERISK_AMI_USERNAME` | Sim | `dooria_ami_user` | Nome de usuário cadastrado no `manager.conf`. |
| `ASTERISK_AMI_SECRET` | Sim | `<SENHA_FORTE_AMI_32_CHARS>` | Senha de autenticação no AMI. |
| `ASTERISK_SIP_SERVER` | Sim | `192.168.1.100` | Endereço do servidor SIP PJSIP para os clientes WebPhone. |
| `ASTERISK_SIP_PORT` | Sim | `5060` | Porta UDP da sinalização SIP PJSIP. |
| `ASTERISK_WSS_PORT` | Sim | `8089` | Porta TCP do transporte WebSocket Seguro (WSS) para WebPhone. |
| `XPE_IP` | Sim | `192.168.1.150` | Endereço IP estático do totem Intelbras XPE 3115-IP na LAN. |
| `XPE_SIP_USERNAME` | Sim | `8000` | Ramal SIP registrado pelo totem XPE no Asterisk. |
| `XPE_SIP_SECRET` | Sim | `<SENHA_SIP_XPE_32_CHARS>` | Senha de registro SIP do totem XPE no `pjsip.conf`. |
| `XPE_RTSP_USERNAME` | Sim | `admin` | Usuário de autenticação RTSP da câmera embutida no totem. |
| `XPE_RTSP_PASSWORD` | Sim | `<SENHA_RTSP_XPE>` | Senha de autenticação RTSP do totem XPE. |

### 6.4. Hardware, Relés e Sensores Físicos
| Variável | Obrigatória | Exemplo | Descrição |
|---|---|---|---|
| `RELAY_CONTROLLER_IP` | Sim | `192.168.1.160` | IP do controlador de relés e sensores na LAN. |
| `TRIGGER_METHOD` | Não | `dtmf` | Método de acionamento. Em `physical_guarita`, é fixado em `dtmf` (*07/*08). O valor `http_cgi` é estritamente proibido. |

### 6.5. Câmeras CFTV e Gateway de Vídeo (go2rtc v1.9.4)
| Variável | Obrigatória | Exemplo | Descrição |
|---|---|---|---|
| `CAMERA_PORTARIA_ENABLED`| Sim | `true` | Habilita a câmera principal da portaria/totem XPE. |
| `GO2RTC_CAMERA_PORTARIA_URL`| Condicional | `rtsp://admin:<SENHA>@192.168.1.150:554/cam/realmonitor?channel=1&subtype=0` | URL RTSP da câmera da portaria (obrigatória se `CAMERA_PORTARIA_ENABLED=true`). |
| `CAMERA_GARAGEM_ENABLED` | Não | `false` | Habilita câmera veicular da garagem (padrão: `false`). |
| `GO2RTC_CAMERA_GARAGEM_URL` | Condicional | `rtsp://admin:<SENHA>@192.168.1.151:554/live` | URL RTSP da garagem (obrigatória se `CAMERA_GARAGEM_ENABLED=true`). |
| `CAMERA_HALL_ENABLED` | Não | `false` | Habilita câmera do hall social (padrão: `false`). |
| `GO2RTC_CAMERA_HALL_URL` | Condicional | `rtsp://admin:<SENHA>@192.168.1.152:554/live` | URL RTSP do hall (obrigatória se `CAMERA_HALL_ENABLED=true`). |
| `CAMERA_GOURMET_ENABLED` | Não | `false` | Habilita câmera da área gourmet (padrão: `false`). |
| `GO2RTC_CAMERA_GOURMET_URL`| Condicional | `rtsp://admin:<SENHA>@192.168.1.153:554/live` | URL RTSP da área gourmet (obrigatória se `CAMERA_GOURMET_ENABLED=true`). |
| `GO2RTC_API_URL` | Sim | `http://172.28.0.1:1984` | URL de acesso da API go2rtc pelo Core. Proibido `localhost` em produção física. |

### 6.6. Módulo de Inteligência Artificial (MaIA)
| Variável | Obrigatória | Exemplo | Descrição |
|---|---|---|---|
| `GEMINI_API_KEY` | Não | `<CHAVE_GEMINI_OPCIONAL>` | Chave da API do Google Gemini para o motor em nuvem. Se ausente, o sistema opera com o fallback semântico local. |

---

## 7. Procedimento de Implantação e Inicialização

O projeto possui um script de implantação automatizado e robusto (`./deploy.sh`), compatível com Docker Compose v2 e v1.

### 7.1. Implantação Automatizada com `./deploy.sh` (Recomendado)
```bash
# 1. Clonar o repositório oficial
git clone https://github.com/sevillacond/DoorIA.git /opt/dooria
cd /opt/dooria

# 2. Configurar o arquivo .env
cp .env.example .env
nano .env

# 3. Garantir permissões de execução no script
chmod +x deploy.sh

# 4. Executar a implantação automatizada
sudo ./deploy.sh
```

#### Etapas executadas automaticamente pelo `deploy.sh`:
1. **[1/8]** Validação da presença do Docker, Docker Compose e do arquivo `.env`.
2. **[2/8]** Execução do validador estrito (`ProductionValidator`) para variáveis obrigatórias e consistência de URLs RTSP das câmeras ativas.
3. **[3/8]** Inicialização do PostgreSQL 16 LTS e bloqueio com polling até o healthcheck (`pg_isready`) retornar saudável.
4. **[4/8]** Compilação da imagem Docker do DoorIA Core (`dooria-app`).
5. **[5/8]** Aplicação das migrações do banco de dados via Drizzle ORM (`npm run db:migrate`) com política fail-fast (abortando o deploy se houver erro estrutural).
6. **[6/8]** Geração dinâmica dos arquivos de configuração seguros `/etc/asterisk/manager.conf` e `/config/go2rtc.yaml` e subida de todos os contêineres (`docker compose up -d`).
7. **[7/8]** Validação do healthcheck da API HTTP (`GET /api/v1/health`) retornando código HTTP 200.
8. **[8/8]** Emissão do resumo de implantação com as URLs locais de acesso.

---

### 7.2. Implantação Manual Passo a Passo via Docker Compose
Caso prefira orquestrar manualmente cada componente, siga a ordem estrita de dependências:

```bash
cd /opt/dooria

# 1. Validar a sintaxe do arquivo de composição e as variáveis
docker compose config

# 2. Subir o PostgreSQL isoladamente e aguardar a saúde do banco
docker compose up -d postgres
until [ "`docker inspect -f {{.State.Health.Status}} dooria-postgres 2>/dev/null`" == "healthy" ]; do
    echo "Aguardando PostgreSQL ficar saudável..."
    sleep 2
done

# 3. Executar as migrações estruturais do Drizzle ORM
docker compose run --rm -e NODE_ENV=production dooria-app npm run db:migrate

# 4. Subir a totalidade dos serviços da stack
docker compose up -d

# 5. Monitorar a inicialização e os logs em tempo real
docker compose ps
docker compose logs -f dooria-core
```

---

## 8. Verificação de Saúde e Endpoints Oficiais (Healthchecks)

A aplicação implementa a separação arquitetural estrita entre **Liveness** (processo ativo) e **Readiness** (pronto para operação física de guarita):

| Endpoint | Método | Objetivo | Comportamento em `physical_guarita` |
|---|---|---|---|
| `/health/live` ou `/api/v1/health/live` | `GET` | **Liveness Probe** | Responde HTTP 200 `{ status: "alive" }` indicando que o processo Node.js está em execução e responsivo. |
| `/health/ready` ou `/api/v1/health/ready`| `GET` | **Readiness Probe** | Valida: <br>1. Conexão e integridade do PostgreSQL 16 LTS;<br>2. Socket TCP do Asterisk AMI na porta 5038;<br>3. Autenticação e Ping AMI bem-sucedidos;<br>4. Validação estrita de variáveis de produção.<br>**REGRA DE OURO:** O readiness probe **JAMAIS** executa `PlayDTMF` ou qualquer acionamento elétrico. Se qualquer componente obrigatório falhar, retorna HTTP 503 com relatório detalhado. |
| `/api/v1/health` | `GET` | **Healthcheck Global** | Relatório completo de diagnóstico de saúde do banco, AMI, contagem de tabelas e status geral. |

Para testar localmente no terminal da VM:
```bash
curl -s http://localhost:3000/api/v1/health | jq .
```

---

## 9. Rotinas de Backup e Restauração do Banco de Dados

O banco relacional opera localmente com volume Docker persistente denominado `dooria_pg_data`.

### 9.1. Geração de Backup Manual Instantâneo (`pg_dump`)
```bash
mkdir -p /opt/dooria/backups
docker exec dooria-postgres pg_dump -U dooria dooria_db > /opt/dooria/backups/backup_dooria_$(date +%Y%m%d_%H%M%S).sql
```

### 9.2. Restauração de Backup em Caso de Desastre
```bash
# ATENÇÃO: A restauração deve ser realizada com a aplicação Core temporariamente pausada
docker compose stop dooria-app

# Restaurar os dados a partir de um arquivo SQL existente
docker exec -i dooria-postgres psql -U dooria dooria_db < /opt/dooria/backups/backup_dooria_YYYYMMDD_HHMMSS.sql

# Reiniciar a aplicação
docker compose start dooria-app
```

> **Nota:** Não existe rotina de backup em nuvem automática configurada por padrão, em estrita aderência ao modelo *Local-First*. Recomenda-se configurar uma tarefa `cron` local na VM para exportar o arquivo SQL gerado para um armazenamento NAS ou pendrive USB montado na guarita.

---

## 10. Procedimento Seguro de Atualização de Versão

Para atualizar o código do **Enlace-DoorIA** sem risco de perda de dados:

```bash
cd /opt/dooria

# 1. Gerar backup preventivo do banco de dados
docker exec dooria-postgres pg_dump -U dooria dooria_db > backup_pre_update.sql

# 2. Obter as alterações do repositório Git
git pull origin main

# 3. Recompilar a imagem do Core
docker compose build dooria-app

# 4. Aplicar novas migrações estruturais do Drizzle ORM
docker compose run --rm -e NODE_ENV=production dooria-app npm run db:migrate

# 5. Reiniciar os serviços atualizados
docker compose up -d

# 6. Validar a saúde do sistema
curl -s http://localhost:3000/api/v1/health/ready
```

---

## 11. Procedimento de Rollback de Versão

Caso a nova versão apresente incompatibilidade física ou lógica:

```bash
cd /opt/dooria

# 1. Retornar ao commit ou tag estável anterior no Git
git checkout <COMMIT_SHA_ESTAVEL>

# 2. Recompilar a imagem da versão anterior
docker compose build dooria-app

# 3. Caso tenha havido alteração incompatível no schema do banco, restaurar o backup
docker compose stop dooria-app
docker exec -i dooria-postgres psql -U dooria dooria_db < backup_pre_update.sql

# 4. Subir a versão anterior
docker compose up -d
```

> **Limitação de Rollback de Schema:** As migrações do Drizzle ORM são do tipo incremental (*forward-only*). O rollback de estrutura de dados exige a restauração do arquivo `backup_pre_update.sql` gerado antes da atualização.
