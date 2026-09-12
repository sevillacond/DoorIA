# Enlace-DoorIA - Plataforma de Portaria Autônoma Inteligente

> Sistema autônomo local-first para gestão de portaria condominial, interfonia IP (Asterisk 20+ / PJSIP), streaming de vídeo sub-50ms (go2rtc), inteligência artificial auditada (MaIA + Gemini 3.8) e controle de acesso seguro.

---

## 1. Visão Geral e Princípios Arquiteturais

O **Enlace-DoorIA** foi projetado para eliminar a vulnerabilidade de dependência contínua de nuvem em condomínios residenciais e corporativos. Todas as operações críticas de portaria (atendimento de interfone, abertura de portões, consulta de moradores e visualização de câmeras) funcionam em **modo Local-First na rede local (LAN)**.

### Pilares Fundamentais:
1. **Local-First & Resiliência LAN**: Quedas de link de internet não interrompem o interfone SIP, o acionamento de relés nem o streaming de vídeo das câmeras.
2. **Segurança Física (Regra Anti-Invasão)**: Nenhum contato seco de fechadura é instalado na calçada ou acessível externamente. Todo acionamento ocorre exclusivamente via sinalização DTMF criptografada no ramal SIP ou via relés em quadro elétrico interno blindado.
3. **Privacidade e Vídeo Assimétrico**: Ao atender o interfone pelo navegador ou app móvel, o morador recebe o vídeo da portaria em alta resolução, mas sua câmera pessoal **nunca** é aberta ou transmitida para o visitante.
4. **Governança por Policy Engine**: Nenhuma inteligência artificial (MaIA) ou requisição de usuário pode executar comandos no hardware sem passar pela validação de papéis (RBAC) e regras de autorização explícitas.

---

## 2. Topologia do Servidor e Divisão de Motores (Tríade Local)

No ambiente local da guarita (Mini PC Industrial x86-64 ou SBC Linux dedicada), a solução opera com três serviços em contêineres orquestrados:

```
                  ┌─────────────────────────────────────────────────────────┐
                  │                 Servidor Local da Guarita               │
                  │                                                         │
   Interfone IP   │  ┌──────────────────┐             ┌──────────────────┐  │
   XPE 3115-IP ───┼─►│   Asterisk 20+   │◄────AMI────►│   Enlace-DoorIA  │  │
   (SIP/RTP)      │  │    Pure PJSIP    │   (TCP 5038)│   Node.js Server │  │
                  │  └──────────────────┘             │  + Policy Engine │  │
                  │                                   │  + MaIA Gateway  │  │
                  │                                   └────────┬─────────┘  │
                  │                                            │ WebSocket  │
   Câmeras IP     │  ┌──────────────────┐                      ▼ / REST     │
   (ONVIF/RTSP) ──┼─►│     go2rtc       │◄─────────────────────┘            │
   Intelbras/Hik  │  │  Video Gateway   │   WebRTC H.264 Sub-50ms           │
                  │  └────────┬─────────┘                                   │
                  └───────────┼─────────────────────────────────────────────┘
                              ▼
                   Navegador / WebPhone Morador
```

### Motor 1: Asterisk 20+ LTS Pure (PJSIP)
- **Função**: Sinalização de voz (SIP UDP 5060) e transporte de mídia de áudio (RTP UDP 10000-20000).
- **Sem FreePBX**: Instalação Vanilla sem sobrecarga de interfaces legadas.
- **Integração**: Conectado ao backend Node.js via **Asterisk Manager Interface (AMI)** na porta TCP 5038 para escuta de eventos e injeção de ações `PlayDTMF` (*07 pedestre, *08 garagem).

### Motor 2: Enlace-DoorIA Core (Node.js + React / TypeScript)
- **Função**: Orquestrador central, Policy Engine de autorização, Event Bus com auditoria em tempo real, backend de interfonia WebRTC e interface gráfica.
- **IA MaIA**: Duplo motor (Google Gemini 3.8 Flash para processamento avançado na nuvem + Fallback Semântico Local quando a internet estiver indisponível).

### Motor 3: go2rtc Video Gateway
- **Função**: Re-streaming ultra-leve de RTSP para WebRTC sem transcodificação de CPU desnecessária.
- **Latência**: Sub-50ms direto no elemento `<video>` do navegador via WebSocket na porta 1984.

---

## 3. Módulos do Sistema

### 3.1. Discovery e Parametrização Automática de Câmeras
O sistema realiza varredura passiva e ativa na sub-rede configurada (ex: `192.168.1.0/24`) utilizando:
- **WS-Discovery**: Multicast SOAP em `239.255.255.250:3702` (ONVIF Core Spec).
- **SSDP / UPnP**: UDP na porta 1900.
- **Análise de OUI / ARP**: Detecção do fabricante pelos primeiros 24 bits do endereço MAC.

#### Tabela de Parametrização por Fabricante:
| Fabricante | Perfil Recomendado | Padrão RTSP Main Stream | Padrão RTSP Sub Stream |
| :--- | :--- | :--- | :--- |
| **Intelbras** | ONVIF Profile T | `/cam/realmonitor?channel=1&subtype=0` | `/cam/realmonitor?channel=1&subtype=1` |
| **Hikvision** | ONVIF Profile T | `/Streaming/Channels/101` | `/Streaming/Channels/102` |
| **Dahua** | ONVIF Profile T | `/cam/realmonitor?channel=1&subtype=0` | `/cam/realmonitor?channel=1&subtype=1` |
| **Axis** | ONVIF Profile T | `/axis-media/media.amp?videocodec=h264` | `...&resolution=640x360` |
| **Uniview** | ONVIF Profile S | `/unicast/c1/s0/live` | `/unicast/c1/s1/live` |
| **Genéricas** | ONVIF Profile S | `/onvif1` | `/onvif2` |

O sistema gera automaticamente o bloco correspondente para o `go2rtc.yaml` e permite teste instantâneo de handshake RTSP.

### 3.2. WebPhone e Interfonia Integrada
- Suporte a discagem de ramais SIP condominiais (ex: `200` Guarita, `101`-`304` Unidades).
- **QR Virtual Intercom**: Totem virtual onde visitantes escaneiam o QR Code na entrada e acionam o interfone WebRTC direto pelo celular, sem necessidade de app instalado.
- **Teclado DTMF e Abertura Segura**:
  - `*07`: Portão Pedestre Social (Relé 1).
  - `*08`: Portão Garagem Veicular (Relé 2).
  - Rejeição e bloqueio caso o usuário não tenha sessão ativa ou permissão no Policy Engine.

### 3.3. MaIA (Módulo de Automação e Inteligência Autônoma)
- **Cloud Engine**: Gemini 3.8 Flash via `@google/genai` com chamadas estruturadas de ferramentas (Function Calling).
- **Local Fallback**: Mecanismo semântico local que responde a status de portaria, ramais e consultas de moradores quando a conexão externa falhar.
- **Guardrails**: A MaIA não tem acesso direto a banco de dados ou pinos de relés; todas as intenções geram propostas auditadas submetidas ao Policy Engine.

### 3.4. Controle de Unidades e Moradores (Piloto 12 Unidades)
- Cadastro de proprietários, inquilinos e dependentes.
- Status financeiro com sincronização de boletos condominiais.
- Vínculo direto de veículos com placas cadastradas e leitura LPR (License Plate Recognition).

### 3.5. Controle de Acesso Baseado em Papéis (RBAC)
- **Síndico / Administrador**: Acesso irrestrito a configurações de hardware, relatórios de auditoria, cadastros de rede e logs de segurança.
- **Operador de Portaria**: Monitoramento de chamadas, acionamento de portões sob supervisão e visualização de CFTV.
- **Morador**: Acesso exclusivo à sua própria unidade, histórico de visitas do seu apartamento, geração de convites e atendimento do interfone.

---

## 4. Estrutura de Diretórios

```
├── server.ts                       # Backend Express + APIs + WebSocket + Mock Asterisk/go2rtc
├── index.html                      # Ponto de entrada SPA com viewport otimizada
├── vite.config.ts                  # Configuração do Vite com Tailwind v4
├── package.json                    # Dependências do projeto (React 18, Lucide, GenAI)
├── metadata.json                   # Metadados e permissões da aplicação
├── src/
│   ├── main.tsx                    # Ponto de inicialização do React DOM
│   ├── App.tsx                     # Shell principal com abas, header e drawer da MaIA
│   ├── types.ts                    # Interfaces TypeScript (Câmeras, Totens, Moradores, RBAC)
│   ├── components/
│   │   ├── WebPhoneDialer.tsx       # Interfone WebRTC com vídeo assimétrico e DTMF
│   │   ├── CamerasGrid.tsx          # Grid de CFTV com player WebRTC go2rtc sub-50ms
│   │   ├── CameraDiscoveryModule.tsx# Varredura LAN (WS-Discovery/SSDP) e parametrização
│   │   ├── DeviceManagementModule.tsx # Gestão unificada de totens, relés e câmeras
│   │   ├── UnitsManagementModule.tsx# CRUD de apartamentos, blocos e moradores
│   │   ├── MaiaChatDrawer.tsx       # Assistente de IA com auditoria de ferramentas
│   │   ├── SecurityAuditLog.tsx     # Trilhas de auditoria criptográficas e eventos
│   │   ├── FinancialModule.tsx      # Situação cadastral e conciliação de taxas
│   │   └── FacialAccessSimulator.tsx# Simulação de reconhecimento facial no totem
│   ├── services/
│   │   ├── CameraDiscovery.ts       # Algoritmos de probe SOAP, patterns RTSP e go2rtc config
│   │   ├── AsteriskAMI.ts           # Cliente de conexão socket com o Asterisk Manager
│   │   └── VideoGateway.ts          # Orquestrador do go2rtc WebRTC proxy
│   └── utils/
│       └── webRtcPlayer.ts          # Manipulador RTCPeerConnection para o frontend
```

---

## 5. Endpoints da API Principal

| Método | Endpoint | Descrição |
| :--- | :--- | :--- |
| `GET` | `/api/v1/system/status` | Status do nó Asterisk, go2rtc, LAN e contadores |
| `GET` | `/api/v1/devices/cameras` | Lista de câmeras ativas no CFTV do condomínio |
| `POST` | `/api/v1/devices/cameras` | Cadastro manual de câmera IP |
| `DELETE`| `/api/v1/devices/cameras/:id` | Desvinculação de câmera do sistema |
| `GET` | `/api/v1/discovery/cameras` | Lista de câmeras descobertas na sub-rede |
| `POST` | `/api/v1/discovery/scan` | Dispara varredura WS-Discovery na sub-rede |
| `POST` | `/api/v1/discovery/import` | Importa câmera descoberta com parametrização do fabricante |
| `POST` | `/api/v1/discovery/test-stream`| Executa handshake RTSP de validação com cálculo de latência |
| `POST` | `/api/v1/calls/initiate` | Inicia chamada SIP/WebRTC |
| `POST` | `/api/v1/calls/dtmf` | Envia comando DTMF validado pelo Policy Engine |
| `POST` | `/api/v1/ai/maia` | Processa prompt com a MaIA (Gemini ou Fallback Local) |
| `GET` | `/api/v1/units` | Lista de apartamentos e moradores |
| `GET` | `/api/v1/audit/logs` | Log de eventos de segurança com hash de integridade |

---

## 6. Configuração e Execução em Desenvolvimento

### Variáveis de Ambiente (`.env`):
```env
# Chave da API do Google Gemini (opcional para fallback local)
GEMINI_API_KEY="AIzaSy..."

# URL base do serviço
APP_URL="http://localhost:3000"
```

### Comandos de Execução:
```bash
# Instalar dependências
npm install

# Iniciar servidor em desenvolvimento (Express + Vite na porta 3000)
npm run dev

# Validar TypeScript e Sintaxe
npm run lint

# Compilar para Produção (Vite frontend + esbuild server.cjs)
npm run build

# Iniciar build de produção
npm start
```

---

## 7. Práticas Recomendadas de Instalação Física

1. **Segmentação de Rede (VLANs)**:
   - *VLAN 10 - Segurança*: Câmeras IP, Totens XPE 3115-IP e Servidor Enlace-DoorIA (Sem acesso à internet externa não autorizada).
   - *VLAN 20 - Moradores/Wi-Fi*: Tráfego residencial isolado da infraestrutura de controle de acesso.
2. **Nobreak Senoidal com Autonomia**: O Mini PC do servidor e o switch PoE das câmeras e totens devem ser alimentados por nobreak dedicado para suportar quedas de energia elétrica mantendo a portaria operacional.
3. **Isolamento Galvânico de Relés**: Utilizar módulos de relé optoacoplados e diodos de roda livre (snubbers) para acionamento de fechaduras eletroímã e motores de portão, protegendo a placa controladora contra transientes elétricos.

---

## 8. PWA Mobile, Notificações Push & Compilação em APK Android

O **Enlace-DoorIA** é uma **Progressive Web App (PWA) instalável** de ponta com suporte nativo a:
- **Instalação Direta no Celular (Add to Home Screen)**: Banner de instalação guiado para Android (Chrome) e iOS (Safari).
- **Trabalho Offline & Cache Workbox**: Funcionalidades essenciais operam mesmo durante interrupções temporárias de rede.
- **Notificações Push Prioritárias**: Alertas visuais e sonoros para chamadas de interfone (totem XPE 3115-IP), avisos de encomendas recebidas e registros de abertura de portões.
- **Compilação em APK Android Nativo**: Empacotamento completo usando **Capacitor 6+** para geração de instalador `.apk` ou `.aab` para distribuição direta no condomínio ou na Google Play Store.

Consulte o manual detalhado com comandos passo a passo em:
👉 **[`DOCS_APK_BUILD.md`](./DOCS_APK_BUILD.md)**

