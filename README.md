# Enlace-DoorIA - Plataforma de Portaria Autônoma Inteligente

> Sistema autônomo local-first para gestão de portaria condominial, interfonia IP (Asterisk 20+ / PJSIP), streaming de vídeo sub-50ms (go2rtc), banco de dados puro local relacional (PostgreSQL 16 LTS), inteligência artificial auditada (MaIA + Gemini 3.8) e controle de acesso seguro.

---

## 1. Visão Geral e Princípios Arquiteturais

O **Enlace-DoorIA** foi projetado para eliminar a vulnerabilidade de dependência contínua de nuvem em condomínios residenciais e corporativos. Todas as operações críticas de portaria (atendimento de interfone, abertura de portões, consulta de moradores, controle financeiro e visualização de câmeras) funcionam em **modo Local-First na rede local (LAN)**.

### Pilares Fundamentais:
1. **Local-First & Resiliência LAN**: Quedas de link de internet não interrompem o interfone SIP, o acionamento de relés nem o streaming de vídeo das câmeras.
2. **Banco de Dados Puro Local (PostgreSQL 16 LTS)**: Persistência relacional pura na guarita (porta 5432), sem dependência de Firestore ou bancos proprietários em nuvem. 14 tabelas estruturadas com integridade ACID, chaves estrangeiras e índices.
3. **Segurança Física (Regra Anti-Invasão)**: Nenhum contato seco de fechadura é instalado na calçada ou acessível externamente. Todo acionamento ocorre exclusivamente via sinalização DTMF criptografada no ramal SIP ou via relés em quadro elétrico interno blindado.
4. **Privacidade e Vídeo Assimétrico**: Ao atender o interfone pelo navegador ou app móvel, o morador recebe o vídeo da portaria em alta resolução, mas sua câmera pessoal **nunca** é aberta ou transmitida para o visitante.
5. **Governança por Policy Engine & RBAC**: Nenhuma inteligência artificial (MaIA) ou requisição de usuário pode executar comandos no hardware sem passar pela validação de papéis e regras de autorização explícitas no servidor local.
6. **Estabilidade de Interface e CFTV**: Proteção global contra falhas de renderização via `ErrorBoundary` e memoização estrita em players WebRTC com detecção automática de resolução (4K, 1080p, 720p, SD).

---

## 2. Topologia do Servidor e Quádrupla Local

No ambiente local da guarita (Mini PC Industrial x86-64 ou SBC Linux dedicada), a solução opera com quatro serviços essenciais orquestrados via Docker:

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
                  │                                            │ Pool PG    │
   Banco de Dados │  ┌──────────────────┐                      ▼ (Porta 5432)
   PostgreSQL 16  │  │  PostgreSQL 16   │◄─────────────────────┤            │
   Puro Local     │  │  14 Tabelas ACID │                      │            │
                  │  └──────────────────┘                      │ WebSocket  │
                  │                                            │ / REST     │
   Câmeras IP     │  ┌──────────────────┐                      ▼            │
   (ONVIF/RTSP) ──┼─►│     go2rtc       │◄─────────────────────┘            │
   Intelbras/Hik  │  │  Video Gateway   │   WebRTC H.264 Sub-50ms           │
                  │  └────────┬─────────┘                                   │
                  └───────────┼─────────────────────────────────────────────┘
                              ▼
                Clientes WebRTC (Browser / PWA / Android)
```
                   Navegador / WebPhone Morador
```

### Motor 1: Asterisk 20+ LTS Pure (PJSIP)
- **Função**: Sinalização de voz (SIP UDP 5060) e transporte de mídia de áudio (RTP UDP 10000-20000).
- **Sem FreePBX**: Instalação Vanilla sem sobrecarga de interfaces legadas.
- **Integração**: Conectado ao backend Node.js via **Asterisk Manager Interface (AMI)** na porta TCP 5038 para escuta de eventos e injeção de ações `PlayDTMF` (*07 pedestre, *08 garagem).

### Motor 2: Enlace-DoorIA Core (Node.js + React / TypeScript)
- **Função**: Orquestrador central, Policy Engine de autorização, Event Bus com auditoria em tempo real, backend de interfonia WebRTC e interface gráfica responsiva com modo escuro/claro.
- **IA MaIA**: Duplo motor (Google Gemini 3.8 Flash para processamento avançado na nuvem + Fallback Semântico Local quando a internet estiver indisponível).
- **Central de Ajuda e Manuais Integrada**: Aba dedicada com diagramas interativos, parametrização do XPE 3115-IP, dialplan Asterisk e FAQ de diagnóstico.

### Motor 3: go2rtc Video Gateway
- **Função**: Re-streaming ultra-leve de RTSP para WebRTC sem transcodificação de CPU desnecessária.
- **Latência**: Sub-50ms direto no elemento `<video>` do navegador via WebSocket na porta 1984.

---

## 3. Módulos do Sistema

### 3.1. Central de Ajuda, Manuais e Diagnóstico (`HelpModule`)
- **Acesso Universal**: Disponível para todos os perfis (Morador, Síndico, Super Admin) pelo menu lateral e pelo cabeçalho superior.
- **Conteúdo Técnico Completo**:
  - Parametrizações exatas para o Totem Intelbras XPE 3115-IP (Rede, SIP, RTSP, DTMF *07 e *08).
  - Configurações do Asterisk 20 LTS (`pjsip.conf` e `extensions.conf` com cópia em 1 clique).
  - Mapeamento das 4 câmeras no `go2rtc.yaml`.
  - Passos de instalação PWA e compilação do APK Android.
  - Guias de deploy e checklist de smoke tests.

### 3.2. Discovery e Parametrização Automática de Câmeras
- **WS-Discovery**: Multicast SOAP em `239.255.255.250:3702` (ONVIF Core Spec).
- **Análise de OUI / ARP**: Detecção do fabricante pelos primeiros 24 bits do endereço MAC.
- **Perfis Pré-Configurados**: Intelbras (Profile T), Hikvision (Profile T), Dahua (Profile T), Axis e Genéricas.

### 3.3. WebPhone e Interfonia Integrada
- Suporte a discagem de ramais SIP condominiais (ex: `200` Guarita, `101`-`304` Unidades).
- **QR Virtual Intercom**: Totem virtual onde visitantes escaneiam o QR Code na entrada e acionam o interfone WebRTC direto pelo celular, sem necessidade de app instalado.
- **Teclado DTMF e Abertura Segura**:
  - `*07`: Portão Pedestre Social (Relé 1).
  - `*08`: Portão Garagem Veicular (Relé 2).

### 3.4. MaIA (Módulo de Automação e Inteligência Autônoma)
- **Cloud Engine**: Gemini 3.8 Flash via `@google/genai` no backend Node.js.
- **Local Fallback**: Mecanismo semântico local que responde a status de portaria, ramais e consultas de moradores quando a conexão externa falhar.
- **Guardrails**: Todas as intenções geram propostas auditadas submetidas ao Policy Engine.

### 3.5. Controle de Acesso Baseado em Papéis (RBAC & PostgreSQL Local)
- **Super Administrador / Síndico**: Gestão de unidades, dispositivos, configurações do condomínio e auditoria completa.
- **Operador de Portaria**: Monitoramento de chamadas, acionamento de portões sob supervisão e visualização de CFTV.
- **Morador**: Visualização de boletos, convites de visitantes com QR Code, autorização de encomendas e atendimento de interfone.

---

## 4. Manuais e Documentações Dedicadas

O repositório conta com guias especializados:

| Documento | Descrição |
|---|---|
| 📖 **[`DEPLOY.md`](./DEPLOY.md)** | Manual completo de implantação em produção (Mini PC com Docker Compose, PostgreSQL Local e Checklist) |
| 📱 **[`DOCS_APK_BUILD.md`](./DOCS_APK_BUILD.md)** | Guia passo a passo para gerar o instalador nativo Android (`.apk` / `.aab`) via Capacitor 6+ |
| 🛡️ **[`AGENTS.md`](./AGENTS.md)** | Regras arquiteturais, idioma estrito (pt-BR), segurança física e diretrizes de desenvolvimento |

---

## 5. Configuração e Execução

### Comandos de Execução:
```bash
# 1. Instalar dependências
npm install

# 2. Iniciar servidor em desenvolvimento (Express + Vite na porta 3000)
npm run dev

# 3. Validar TypeScript e Sintaxe (Zero erros)
npm run lint

# 4. Compilar para Produção (Frontend Vite + Backend esbuild dist/server.cjs)
npm run build

# 5. Iniciar em Produção
npm start
```

---

## 6. Piloto e Licenciamento
- **Instalação Piloto:** São Luís - MA.
- **Totens Suportados:** Intelbras XPE 3115-IP, XPE 1013-IP, XPE 1001-IP.
- **Relés:** NovaDigital Zigbee 3.0 / Módulos de relé optoacoplados Ethernet/IP.
