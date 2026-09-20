# Manual de Implantação e Deploy em Produção (Enlace-DoorIA)

Este guia documenta os passos completos para implantar o sistema **Enlace-DoorIA** em dois cenários principais:
1. **Ambiente Local-First (Mini PC / Servidor Físico na Guarita)**
2. **Ambiente em Nuvem (Google Cloud Run com Firebase Firestore)**
3. **Geração do Aplicativo Android (APK / AAB via Capacitor)**

---

## 1. Pré-Requisitos Gerais do Sistema

### Hardware Recomendado para a Guarita
- **Mini PC / Servidor Local:** Processador Intel Core i3/i5 (10ª geração ou superior) ou Celeron N5105/N100 com 8GB/16GB de RAM e SSD NVMe de 128GB+.
- **Sistema Operacional:** Ubuntu Server 22.04 LTS ou Debian 12 (64 bits).
- **Rede Local (LAN):** Switch Gigabit dedicado para CFTV e Interfonia, com cabo de rede Cat6 blindado e nobreak (UPS) senoidal de no mínimo 1200VA para manter o sistema operando em quedas elétricas.

### Portas de Rede Necessárias
| Porta | Protocolo | Serviço | Descrição |
|---|---|---|---|
| **3000** | TCP | Node.js / Express | Aplicação Web DoorIA e APIs REST |
| **5432** | TCP | PostgreSQL 16 LTS | Banco de dados puro local relacional (ACID) |
| **5060** | UDP | Asterisk PJSIP | Sinalização SIP dos totens e ramais |
| **8089** | TCP | Asterisk WSS | WebPhone WebRTC via WebSocket Seguro |
| **10000-20000** | UDP | Asterisk RTP | Fluxo de áudio e voz em tempo real |
| **1984** | TCP | go2rtc Web/API | Painel de controle e WebSocket do go2rtc |
| **8555** | TCP/UDP | go2rtc WebRTC | Streaming de vídeo para os navegadores |
| **554** | TCP/UDP | RTSP | Câmeras IP e totem Intelbras XPE 3115-IP |
| **5038** | TCP | Asterisk AMI | Interface de Gerenciamento do Asterisk |

---

## 2. Compilação e Inicialização em Produção

O projeto conta com scripts unificados de compilação em `package.json`:

```bash
# 1. Instalar as dependências do projeto
npm install

# 2. Compilar o frontend Vite e empacotar o backend TypeScript em dist/server.cjs
npm run build

# 3. Iniciar o servidor em modo de produção
npm start
```

O comando `npm run build` executa:
1. `vite build`: Compila os componentes React, Tailwind CSS e assets estáticos para `dist/`.
2. `esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`: Resolve todas as importações relativas e empacota o backend TypeScript em um único arquivo CommonJS autônomo.

---

## 3. Implantação Local via Docker Compose (Guarita)

Utilize o arquivo `docker-compose.yml` no servidor local da guarita para orquestrar a quádrupla de serviços:

```yaml
version: '3.8'

services:
  # 1. BANCO DE DADOS PURO LOCAL POSTGRESQL 16 LTS
  postgres:
    image: postgres:16-alpine
    container_name: dooria-postgres
    restart: always
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-dooria_db}
      POSTGRES_USER: ${POSTGRES_USER:-dooria}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Erro: POSTGRES_PASSWORD obrigatorio}
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "5432:5432"
    volumes:
      - dooria_pg_data:/var/lib/postgresql/data
      - ./src/db/init.sql:/docker-entrypoint-initdb.d/init.sql:ro
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-dooria} -d ${POSTGRES_DB:-dooria_db}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - dooria-network

  # 2. SISTEMA ENLACE-DOORIA (CORE / API / WEB FRONTEND)
  dooria-app:
    build: .
    container_name: dooria-core
    restart: always
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      SESSION_SECRET: ${SESSION_SECRET:?Erro de Seguranca: SESSION_SECRET e estritamente obrigatorio e deve ser configurado no arquivo .env}
      CONDO_ID: ${CONDO_ID:-condo-master}
      CONDO_CNPJ: ${CONDO_CNPJ:?Erro de Seguranca: CONDO_CNPJ e estritamente obrigatorio em producao}
      CONDO_NAME: ${CONDO_NAME:?Erro de Seguranca: CONDO_NAME e estritamente obrigatorio em producao}
      CONDO_CITY: ${CONDO_CITY:?Erro de Seguranca: CONDO_CITY e estritamente obrigatorio em producao}
      CONDO_STATE: ${CONDO_STATE:?Erro de Seguranca: CONDO_STATE e estritamente obrigatorio em producao}
      CONDO_UNITS_COUNT: ${CONDO_UNITS_COUNT:?Erro de Seguranca: CONDO_UNITS_COUNT e estritamente obrigatorio em producao}
      LOCAL_SERVER_IP: ${LOCAL_SERVER_IP:?Erro de Seguranca: LOCAL_SERVER_IP e estritamente obrigatorio em producao}
      INITIAL_ADMIN_USER: ${INITIAL_ADMIN_USER:?Erro de Seguranca: INITIAL_ADMIN_USER e estritamente obrigatorio em producao}
      INITIAL_ADMIN_PASSWORD: ${INITIAL_ADMIN_PASSWORD:?Erro de Seguranca: INITIAL_ADMIN_PASSWORD e estritamente obrigatorio em producao}
      INITIAL_ADMIN_EMAIL: ${INITIAL_ADMIN_EMAIL:?Erro de Seguranca: INITIAL_ADMIN_EMAIL e estritamente obrigatorio em producao}
      POSTGRES_HOST: postgres
      POSTGRES_PORT: 5432
      POSTGRES_DB: ${POSTGRES_DB:-dooria_db}
      POSTGRES_USER: ${POSTGRES_USER:-dooria}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:?Erro: POSTGRES_PASSWORD obrigatorio}
      PGHOST: postgres
      PGPORT: 5432
      PGUSER: ${POSTGRES_USER:-dooria}
      PGPASSWORD: ${POSTGRES_PASSWORD:?Erro: PGPASSWORD obrigatorio}
      PGDATABASE: ${POSTGRES_DB:-dooria_db}
      DATABASE_URL: postgresql://${POSTGRES_USER:-dooria}:${POSTGRES_PASSWORD:?Erro: POSTGRES_PASSWORD obrigatorio}@postgres:5432/${POSTGRES_DB:-dooria_db}
      ASTERISK_HOST: ${ASTERISK_HOST:?Erro de Seguranca: ASTERISK_HOST e estritamente obrigatorio em producao}
      ASTERISK_AMI_PORT: ${ASTERISK_AMI_PORT:-5038}
      ASTERISK_AMI_USERNAME: ${ASTERISK_AMI_USERNAME:?Erro de Seguranca: ASTERISK_AMI_USERNAME e estritamente obrigatorio}
      ASTERISK_AMI_SECRET: ${ASTERISK_AMI_SECRET:?Erro de Seguranca: ASTERISK_AMI_SECRET e estritamente obrigatorio}
      ASTERISK_SIP_SERVER: ${ASTERISK_SIP_SERVER:-${ASTERISK_HOST}}
      ASTERISK_SIP_PORT: ${ASTERISK_SIP_PORT:-5060}
      ASTERISK_WSS_PORT: ${ASTERISK_WSS_PORT:-8089}
      XPE_IP: ${XPE_IP:?Erro de Seguranca: XPE_IP e estritamente obrigatorio em producao}
      XPE_SIP_USERNAME: ${XPE_SIP_USERNAME:-8000}
      XPE_SIP_SECRET: ${XPE_SIP_SECRET:?Erro de Seguranca: XPE_SIP_SECRET e estritamente obrigatorio em producao}
      XPE_RTSP_USERNAME: ${XPE_RTSP_USERNAME:?Erro de Seguranca: XPE_RTSP_USERNAME e estritamente obrigatorio em producao}
      XPE_RTSP_PASSWORD: ${XPE_RTSP_PASSWORD:?Erro de Seguranca: XPE_RTSP_PASSWORD e estritamente obrigatorio em producao}
      RELAY_CONTROLLER_IP: ${RELAY_CONTROLLER_IP:?Erro de Seguranca: RELAY_CONTROLLER_IP e estritamente obrigatorio em producao}
      GO2RTC_API_URL: ${GO2RTC_API_URL:-http://localhost:1984}
      GEMINI_API_KEY: ${GEMINI_API_KEY:-}
    ports:
      - "3000:3000"
    healthcheck:
      test: ["CMD-SHELL", "wget -q -O - http://127.0.0.1:3000/api/v1/health || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 15s
    networks:
      - dooria-network

  # 3. ASTERISK 20 LTS (TELEFONIA E INTERFONIA PURA SIP / WEBRTC)
  asterisk:
    image: andrius/asterisk:20-alpine
    container_name: dooria-asterisk
    restart: always
    network_mode: host
    entrypoint: ["/etc/asterisk/asterisk-entrypoint.sh"]
    volumes:
      - ./config/asterisk:/etc/asterisk
    environment:
      ASTERISK_AMI_USERNAME: ${ASTERISK_AMI_USERNAME:?Erro de Seguranca: ASTERISK_AMI_USERNAME e obrigatorio}
      ASTERISK_AMI_SECRET: ${ASTERISK_AMI_SECRET:?Erro de Seguranca: ASTERISK_AMI_SECRET e obrigatorio}
    healthcheck:
      test: ["CMD-SHELL", "/etc/asterisk/healthcheck.sh || exit 1"]
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 15s

  # 4. GO2RTC (STREAMING WEBRTC RTSP SUB-50MS)
  go2rtc:
    image: alexxit/go2rtc:latest
    container_name: dooria-go2rtc
    restart: always
    network_mode: host
    volumes:
      - ./config/go2rtc.yaml:/config/go2rtc.yaml

volumes:
  dooria_pg_data:
    name: dooria_pg_data

networks:
  dooria-network:
    name: dooria-network
    driver: bridge
```

Para iniciar todos os serviços em segundo plano:
```bash
docker compose up -d
```

---

## 4. Banco de Dados Puro Local PostgreSQL 16 LTS & Backup

Em alinhamento rigoroso com a arquitetura *Local-First*, o sistema utiliza **PostgreSQL 16 LTS Puro Local**, operando na porta 5432 sem qualquer dependência de Firestore ou nuvens de terceiros:

1. **Schema e DDL Automático:**
   - O arquivo `src/db/init.sql` contém a definição completa de 14 tabelas relacionais com integridade referencial ACID, índices otimizados e dados baseline do Condomínio Solar das Palmeiras (São Luís - MA).
   - Na primeira execução do contêiner Docker, o script `/docker-entrypoint-initdb.d/init.sql` é executado automaticamente.
   - O backend Node.js executa `initializePostgresSchema()` ao conectar, garantindo que todas as tabelas e índices existam.

2. **Rotina de Backup Local Automatizada (pg_dump):**
```bash
# Gerar backup relacional instantâneo da guarita
docker exec dooria-postgres pg_dump -U dooria dooria_db > backup_dooria_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup relacional
docker exec -i dooria-postgres psql -U dooria dooria_db < backup_dooria_YYYYMMDD_HHMMSS.sql
```

3. **Verificação de Saúde do Banco:**
   - Endpoint HTTP: `GET http://localhost:3000/api/v1/database/status`
   - Retorna o status de conexão, latência em milissegundos, número de tabelas ativas e integridade.

---

## 5. Compilação do Aplicativo Android (APK / AAB)

O projeto está integrado com o **Capacitor 6+**:

```bash
# 1. Compilar os assets web para o diretório dist
npm run build

# 2. Sincronizar os assets e plugins com o projeto Android
npx cap sync android

# 3. Gerar o APK de depuração (Debug)
cd android
./gradlew assembleDebug

# O arquivo compilado estará disponível em:
# android/app/build/outputs/apk/debug/app-debug.apk

# 4. Gerar o pacote assinado de produção (Release)
./gradlew assembleRelease
```

---

## 6. Checklist de Validação Pós-Deploy (Smoke Tests)

Antes de liberar o condomínio para os moradores, realize as seguintes verificações:
- [ ] **Teste de Interfone Físico:** Discar no Totem XPE 3115-IP e confirmar toque no WebPhone do morador e no ramal da guarita.
- [ ] **Teste de Vídeo WebRTC:** Abrir o monitoramento de câmeras e verificar a latência sub-50ms com a tag de resolução verde (ex: `1080p Full HD`).
- [ ] **Teste de Fechadura Remota:** Clicar em "Abrir Portão Social" e escutar o clique do relé físico e confirmação no log de auditoria.
- [ ] **Teste de Queda de Link WAN:** Desconectar o cabo de fibra ótica da internet do roteador. As chamadas entre o totem e os apartamentos na rede Wi-Fi/cabeada local devem continuar funcionando ininterruptamente.
