# Regras de Comunicação e Arquitetura do Enlace-DoorIA

## 1. Idioma e Comunicação
- **Idioma Principal:** Você DEVE sempre se comunicar, explicar conceitos e documentar o código exclusivamente em **Português Brasileiro (pt-BR)**.
- **Tom:** Profissional, técnico, objetivo e focado em engenharia de software e design de interfaces.

## 2. Arquitetura do Sistema (Enlace-DoorIA CRM)
- **Telefonia e Interfonia (Asterisk 20 LTS Pure):** O sistema DoorIA possui seu **próprio servidor Asterisk local/independente**. A integração utiliza SIP/PJSIP puro (UDP 5060, WSS 8089 para WebRTC e socket AMI na porta 5038), focado em alta disponibilidade local (Local-First) para portarias, sem depender de nuvens de terceiros para o tráfego de voz básico.
- **Streaming de Vídeo CFTV (go2rtc):** Re-streaming ultra-eficiente de RTSP para WebRTC (sub-50ms) no navegador, sem transcodificação na CPU. Perfis ONVIF Profile T e S pré-configurados para Intelbras, Hikvision e Dahua.
- **Banco de Dados Puro Local (PostgreSQL 16 LTS) e Drizzle ORM:** O sistema opera com banco de dados **puro local PostgreSQL (PostgreSQL 16 LTS)** na porta padrão 5432 no servidor físico da guarita (Mini PC), mantendo a filosofia *Local-First* e eliminando qualquer dependência de Firestore ou nuvens de terceiros para o armazenamento persistente de dados. Possui tabelas relacionais rigorosamente tipadas em TypeScript utilizando o motor ultra-leve **Drizzle ORM** (cujos schemas ficam em `src/db/schema.ts`). Migrações são gerenciadas com `drizzle-kit`.
- **Credenciais e Integração Nativa Automática (Zero Configuração Manual):** As conexões com o PostgreSQL local (porta 5432) e o servidor Asterisk 20 (portas 5060/8089/5038) são **100% nativas, autônomas e pré-vinculadas**. O sistema NUNCA solicita URLs, senhas, tokens ou chaves de banco ou Asterisk ao usuário em telas, diálogos ou pop-ups; todo o handshake e provisionamento ocorrem de forma automática e transparente no backend.
- **Inteligência Artificial Híbrida (MaIA) e Roteamento de IA (Gateway):** Motor dual alimentado por Google Gemini (via `@google/genai` no servidor) com fallback semântico local. O sistema suporta redirecionamento dinâmico do tráfego de IA para Gateways Locais (ex: `9router.enlace.slz.br`) sem alterar arquivos de ambiente, injetando `baseUrl` na instância do SDK.

## 3. Diretrizes de Engenharia e Resiliência (Frontend & Backend)
- **Prevenção de Loops de Renderização (Anti-Crash):** Em componentes de vídeo (`WebRtcLivePlayer.tsx`, `CamerasGrid.tsx`), callbacks de notificação de resolução e estado DEVEM usar referências estáveis (`useRef`, `useCallback`) e deduplicação de eventos (`lastReportedResolutionRef`). Notificações contínuas em loop infinito são estritamente proibidas.
- **Contenção Global por ErrorBoundary:** A raiz da aplicação em `main.tsx` DEVE estar envolvida pelo componente `ErrorBoundary` para evitar telas em branco (*white screen of death*) e permitir recuperação graciosa com interface de diagnóstico.
- **Segurança de Sessão e Iframe:** O listener de autenticação `onAuthStateChanged` deve contar com timeout de fallback seguro para não travar a aplicação quando cookies de terceiros forem restritos no preview de iframe. A tela de login deve manter atalhos de demonstração rápida (Super Admin, Síndico e Morador) para testes funcionais contínuos.

## 4. Segurança Física e Controle de Acesso (Anti-Arrombamento)
- **Regra de Ouro:** Nenhum contato seco de fechadura ou portão elétrico deve passar pelo totem externo (calçada). Todo acionamento é feito via sinalização DTMF (`*07` para pedestre / `*08` para garagem) decodificada pelo Asterisk e executada por relés remotos blindados dentro da guarita/quadro elétrico interno.
- **Vídeo Assimétrico Seguro:** Durante chamadas de interfone, o morador visualiza o vídeo em alta definição do totem, mas a câmera pessoal do morador permanece desativada e confidencial.

## 5. Diretrizes de Deploy e Operação
- **Build de Produção:** O comando `npm run build` compila o frontend Vite para `dist/` e empacota o backend Node.js em um único arquivo CommonJS executável `dist/server.cjs` via esbuild. O início em produção é executado por `npm start` (`node dist/server.cjs`).
- **Deploy Automático (Guarita / Mini PC):** Orquestrado via contêineres Docker usando o script interativo `./deploy.sh` e `docker-compose.yml` (política de reinício automático `--restart=always`).
- **Banco e Migrações:** O esquema relacional é mantido e gerado pelo Drizzle ORM. A inicialização de volume fica em `dooria_pg_data`.

## 6. PWA Mobile e Aplicativo Android
- **PWA Instalável:** Manifesto Web com suporte a instalação em tela cheia (Add to Home Screen) no Android e iOS.
- **Notificações Push:** Suporte a notificações de chamadas de interfone e encomendas.
- **APK Android:** Empacotamento direto via Capacitor 8.x localizado no diretório `/android`.
