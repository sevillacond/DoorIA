import React, { useState, useEffect } from 'react';
import {
  Home,
  PhoneCall,
  Camera,
  DollarSign,
  Server,
  Sparkles,
  ShieldCheck,
  Radio,
  QrCode,
  Bell,
  RefreshCw,
  Building,
} from 'lucide-react';
import { Header } from './components/Header.tsx';
import { Sidebar } from './components/Sidebar.tsx';
import { WebPhoneModal } from './components/WebPhoneModal.tsx';
import { XpeIntercomSimulator } from './components/XpeIntercomSimulator.tsx';
import { QrVirtualIntercomModal } from './components/QrVirtualIntercomModal.tsx';
import { ResidentDashboard } from './components/ResidentDashboard.tsx';
import { CamerasGrid } from './components/CamerasGrid.tsx';
import { FinancialModule } from './components/FinancialModule.tsx';
import { AmenitiesModule } from './components/AmenitiesModule.tsx';
import { AdminTopologyView } from './components/AdminTopologyView.tsx';
import { UnitManagementModule } from './components/UnitManagementModule.tsx';
import { DeviceManagementModule } from './components/DeviceManagementModule.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';
import { PortariaModule } from './components/PortariaModule.tsx';
import { MaiaChatDrawer } from './components/MaiaChatDrawer.tsx';
import { CallAuditModal } from './components/CallAuditModal.tsx';
import { PWAInstallBanner } from './components/PWAInstallBanner.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { NotificationCenterModal } from './components/NotificationCenterModal.tsx';
import { CondominiumSettingsModule } from './components/CondominiumSettingsModule.tsx';
import { HelpModule } from './components/HelpModule.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { useAuth } from './context/AuthContext.tsx';
import { usePushNotifications } from './hooks/usePushNotifications.ts';
import type {
  UserSession,
  Unit,
  Gate,
  CameraDevice,
  ActiveCall,
  CallLog,
  FinancialBill,
  FinancialSummary,
  Agreement,
  PackageDelivery,
  VisitorInvite,
  Vehicle,
  IoTDevice,
  AutomationRule,
  EventBusMessage,
  AuditLogEntry,
  SystemStatus,
  CallPurpose,
} from './types.ts';
import { getSessionToken, setSessionToken, apiFetch } from './utils/authClient.ts';

export default function App() {
  const { user, loading: authLoading } = useAuth();

  const [session, setSession] = useState<UserSession>({
    id: 'user-carlos-101',
    name: 'Carlos Eduardo Mendes',
    email: 'carlos.mendes@gmail.com',
    role: 'morador',
    unitId: 'u-101',
    unitNumber: '101',
    mfaEnabled: true,
  });

  // Sync session with Firebase Auth user
  useEffect(() => {
    if (user) {
      setSession((prev) => ({
        ...prev,
        id: user.uid,
        name: user.displayName || 'Usuário',
        email: user.email || '',
        // Temporarily default to admin if it's the developer email, else morador
        role: user.email === 'sevillacond@gmail.com' ? 'super_admin' : 'morador'
      }));
    }
  }, [user]);

  const [activeTab, setActiveTab] = useState<'inicio' | 'portaria' | 'cameras' | 'financeiro' | 'engenharia' | 'dispositivos' | 'moradores' | 'condominio' | 'reservas' | 'ajuda'>('inicio');

  // Estados dos Módulos do Sistema
  const [units, setUnits] = useState<Unit[]>([]);
  const [gates, setGates] = useState<Gate[]>([]);
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [packages, setPackages] = useState<PackageDelivery[]>([]);
  const [visitorInvites, setVisitorInvites] = useState<VisitorInvite[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [bills, setBills] = useState<FinancialBill[]>([]);
  const [financialSummary, setFinancialSummary] = useState<FinancialSummary | null>(null);
  const [agreements, setAgreements] = useState<Agreement[]>([]);
  const [iotDevices, setIotDevices] = useState<IoTDevice[]>([]);
  const [automations, setAutomations] = useState<AutomationRule[]>([]);
  const [events, setEvents] = useState<EventBusMessage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);

  // Chamada Ativa & Modais
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [isWebPhoneOpen, setIsWebPhoneOpen] = useState(false);
  const [isXpeOpen, setIsXpeOpen] = useState(false);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [initialQrToken, setInitialQrToken] = useState<string | null>(null);

  // Verifica URL por convite QR
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('qr_token');
    if (token) {
      setInitialQrToken(token);
      setIsQrOpen(true);
      // Remove o token da URL para não poluir
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  const [isMaiaOpen, setIsMaiaOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [selectedRecordingId, setSelectedRecordingId] = useState<string | null>(null);
  
  // Notificações Push
  const { triggerLocalNotification, permission } = usePushNotifications();
  const [notifiedCallIds, setNotifiedCallIds] = useState<Set<string>>(new Set());

  const handleOpenAuditModal = (recordingId: string) => {
    setSelectedRecordingId(recordingId);
    setIsAuditModalOpen(true);
  };

  // Carregar dados iniciais
  const refreshAllData = async () => {
    try {
      const [
        sessRes,
        unitsRes,
        gatesRes,
        camsRes,
        pkgsRes,
        invsRes,
        vehsRes,
        callsRes,
        billsRes,
        sumRes,
        agrsRes,
        iotRes,
        autoRes,
        evtsRes,
        audRes,
        statusRes,
        activeCallRes,
      ] = await Promise.all([
        apiFetch('/api/v1/auth/me').then((r) => r.json()),
        apiFetch('/api/v1/units').then((r) => r.json()),
        apiFetch('/api/v1/gates').then((r) => r.json()),
        apiFetch('/api/v1/cameras').then((r) => r.json()),
        apiFetch('/api/v1/packages').then((r) => r.json()),
        apiFetch('/api/v1/visitors/invites').then((r) => r.json()),
        apiFetch('/api/v1/vehicles').then((r) => r.json()),
        apiFetch('/api/v1/calls/history').then((r) => r.json()),
        apiFetch('/api/v1/finance/bills').then((r) => r.json()),
        apiFetch('/api/v1/finance/summary').then((r) => r.json()),
        apiFetch('/api/v1/finance/agreements').then((r) => r.json()),
        apiFetch('/api/v1/iot/devices').then((r) => r.json()),
        apiFetch('/api/v1/iot/automations').then((r) => r.json()),
        apiFetch('/api/v1/events').then((r) => r.json()),
        apiFetch('/api/v1/audit').then((r) => r.json()),
        apiFetch('/api/v1/system/status').then((r) => r.json()),
        apiFetch('/api/v1/calls/active').then((r) => r.json()),
      ]);

      if (sessRes?.id) {
        setSession(sessRes);
        if (sessRes.token) {
          setSessionToken(sessRes.token);
        }
      }
      if (Array.isArray(unitsRes)) setUnits(unitsRes);
      if (Array.isArray(gatesRes)) setGates(gatesRes);
      if (Array.isArray(camsRes)) setCameras(camsRes);
      if (Array.isArray(pkgsRes)) setPackages(pkgsRes);
      if (Array.isArray(invsRes)) setVisitorInvites(invsRes);
      if (Array.isArray(vehsRes)) setVehicles(vehsRes);
      if (Array.isArray(callsRes)) setCallLogs(callsRes);
      if (Array.isArray(billsRes)) setBills(billsRes);
      if (sumRes) setFinancialSummary(sumRes);
      if (Array.isArray(agrsRes)) setAgreements(agrsRes);
      if (Array.isArray(iotRes)) setIotDevices(iotRes);
      if (Array.isArray(autoRes)) setAutomations(autoRes);
      if (Array.isArray(evtsRes)) setEvents(evtsRes);
      if (Array.isArray(audRes)) setAuditLogs(audRes);
      if (statusRes) setSystemStatus(statusRes);

      const incoming = activeCallRes?.activeCall;
      setActiveCall(incoming);
      // Se houver chamada tocando para a nossa unidade ou síndico, abre o WebPhone automaticamente
      if (incoming && incoming.state === 'chamando') {
        if (!isWebPhoneOpen) {
          setIsWebPhoneOpen(true);
        }
        
        // Dispara a Notificação Push se ainda não foi notificada nesta chamada
        if (permission === 'granted' && !notifiedCallIds.has(incoming.id)) {
          triggerLocalNotification(
            '🔔 Chamada de Interfone (XPE)',
            `Visitante na ${incoming.origin} aguardando atendimento.`,
            '/icon.svg'
          );
          setNotifiedCallIds((prev) => new Set(prev).add(incoming.id));
        }
      }
    } catch (err) {
      console.warn('Erro ao atualizar dados:', err);
    }
  };

  useEffect(() => {
    if (!user) return;
    refreshAllData();
    const interval = setInterval(refreshAllData, 3000);
    return () => clearInterval(interval);
  }, [user]);

  // Alternar Papel RBAC
  const handleSwitchRole = async (role: 'morador' | 'sindico' | 'super_admin', unitNumber?: string) => {
    try {
      const res = await apiFetch('/api/v1/auth/switch-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role, unitNumber }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        if (data.token) {
          setSessionToken(data.token);
        }
        setSession(data.session);
        setActiveTab('inicio');
        setFeedbackMessage(`Sessão alterada para perfil: ${data.session.role.toUpperCase()}`);
        setTimeout(() => setFeedbackMessage(null), 3000);
        refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Garante que haja um token assinado ativo na inicialização em desenvolvimento
  useEffect(() => {
    if (!getSessionToken()) {
      handleSwitchRole('morador', '101');
    }
  }, []);

  // Iniciar chamada pelo Totem XPE
  const handleStartXpeCall = async (unitNumber: string, purpose: CallPurpose) => {
    try {
      const res = await apiFetch('/api/v1/calls/xpe/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitNumber, purpose }),
      });
      const data = await res.json();
      if (data.call) {
        setActiveCall(data.call);
        setIsWebPhoneOpen(true);
        refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Iniciar chamada pelo QR Virtual Intercom
  const handleStartQrCall = async (
    unitNumber: string,
    purpose: CallPurpose,
    cameraGranted: boolean,
    micGranted: boolean,
    qrToken?: string | null
  ) => {
    try {
      const res = await apiFetch('/api/v1/calls/qr/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ unitNumber, purpose, cameraGranted, microphoneGranted: micGranted, qrToken }),
      });
      const data = await res.json();
      if (data.call) {
        setActiveCall(data.call);
        setIsWebPhoneOpen(true);
        refreshAllData();
      } else if (data.error) {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Atender chamada no WebPhone
  const handleAnswerCall = async () => {
    try {
      const res = await apiFetch('/api/v1/calls/answer', { method: 'POST' });
      const data = await res.json();
      if (data.call) {
        setActiveCall(data.call);
        setFeedbackMessage('Canal WebRTC conectado. Áudio bidirecional e vídeo assimétrico ativos.');
        setTimeout(() => setFeedbackMessage(null), 4000);
        refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Enviar DTMF (*07 ou *08)
  const handleSendDtmf = async (dtmf: '*07' | '*08') => {
    try {
      const res = await apiFetch('/api/v1/calls/dtmf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dtmf }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage(`[Policy Engine: Autorizado] Comando DTMF ${dtmf} executado com sucesso.`);
      } else if (data.error) {
        setFeedbackMessage(`[Policy Engine: Negado] ${data.error}`);
      }
      setTimeout(() => setFeedbackMessage(null), 5000);
      refreshAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Encerrar Chamada
  const handleHangupCall = async () => {
    const wasRinging = activeCall?.state === 'chamando';
    try {
      await apiFetch('/api/v1/calls/hangup', { method: 'POST' });
      setActiveCall(null);
      
      if (wasRinging) {
        setFeedbackMessage('Chamada recusada. URA da MaIA assumiu o atendimento do visitante no Totem.');
      } else {
        setFeedbackMessage('Atendimento finalizado. Gravação protegida e registrada na auditoria.');
      }
      
      setTimeout(() => setFeedbackMessage(null), 5000);
      refreshAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Criar Convite QR
  const handleCreateVisitorInvite = async (name: string, type: 'visitante' | 'entrega' | 'prestador') => {
    try {
      const res = await apiFetch('/api/v1/visitors/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visitorName: name, type }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMessage(`Convite gerado com sucesso para ${name}. Token seguro pronto.`);
        setTimeout(() => setFeedbackMessage(null), 4000);
        refreshAllData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Alternar dispositivo IoT Zigbee
  const handleToggleIoTDevice = async (deviceId: string) => {
    try {
      await apiFetch(`/api/v1/iot/devices/${deviceId}/toggle`, { method: 'POST' });
      refreshAllData();
    } catch (err) {
      console.error(err);
    }
  };

  // Loading State
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#070d18] flex flex-col items-center justify-center gap-4 text-slate-300 font-sans">
        <div className="w-10 h-10 rounded-full border-3 border-[#0a50ff] border-t-transparent animate-spin"></div>
        <div className="text-xs font-mono text-slate-400 tracking-wide">Iniciando Enlace-DoorIA...</div>
      </div>
    );
  }

  // Unauthenticated State
  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="min-h-screen bg-[#f5f8ff] dark:bg-[#070d18] text-[#0d1b35] dark:text-[#f1f5f9] flex selection:bg-[#0a50ff]/20 selection:text-[#0a50ff] font-sans transition-colors duration-200">
      {/* MENU SIDEBAR COMPLETO */}
      <Sidebar
        currentTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        session={session}
        systemStatus={systemStatus}
        activeCallCount={activeCall && activeCall.state === 'chamando' ? 1 : 0}
        onOpenXpeSimulator={() => setIsXpeOpen(true)}
        onOpenQrSimulator={() => setIsQrOpen(true)}
        onToggleWebPhone={() => setIsWebPhoneOpen(!isWebPhoneOpen)}
        onOpenMaia={() => setIsMaiaOpen(true)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onSwitchRole={handleSwitchRole}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
      />

      {/* ÁREA PRINCIPAL COM HEADER E CONTEÚDO */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-72 transition-all duration-300">
        {/* BANNER INSTALAÇÃO PWA */}
        <PWAInstallBanner />

        {/* HEADER SUPERIOR */}
        <Header
          session={session}
          systemStatus={systemStatus}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenXpeSimulator={() => setIsXpeOpen(true)}
          onOpenQrSimulator={() => setIsQrOpen(true)}
          onToggleWebPhone={() => setIsWebPhoneOpen(!isWebPhoneOpen)}
          onOpenMaia={() => setIsMaiaOpen(true)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onSelectTab={setActiveTab}
          activeCallCount={activeCall && activeCall.state === 'chamando' ? 1 : 0}
          currentTab={activeTab}
        />

        {/* FEEDBACK GLOBAL */}
        {feedbackMessage && (
          <div className="bg-[#ebf2ff] dark:bg-[#0a2352] border-b border-[#dde8ff] dark:border-[#193b7a] text-[#0a50ff] dark:text-[#60a5fa] text-xs px-4 py-2.5 text-center flex items-center justify-center gap-2 animate-fadeIn sticky top-16 z-20 font-semibold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-[#0a50ff] dark:text-[#60a5fa]" />
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* ÁREA DE CONTEÚDO PRINCIPAL */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {activeTab === 'inicio' && session.role === 'morador' && (
            <ResidentDashboard
              session={session}
              gates={gates}
              packages={packages}
              visitorInvites={visitorInvites}
              vehicles={vehicles}
              callLogs={callLogs}
              onOpenWebPhone={() => setIsWebPhoneOpen(true)}
              onCreateVisitorInvite={handleCreateVisitorInvite}
              onSelectTab={(tab) => setActiveTab(tab as any)}
              onOpenAuditModal={handleOpenAuditModal}
            />
          )}
          
          {activeTab === 'inicio' && session.role !== 'morador' && (
            <AdminDashboard
              session={session}
              units={units}
              gates={gates}
              callLogs={callLogs}
              financialSummary={financialSummary}
              systemStatus={systemStatus}
              auditLogs={auditLogs}
              onSelectTab={(tab) => setActiveTab(tab as any)}
              onOpenAuditModal={handleOpenAuditModal}
            />
          )}

          {activeTab === 'portaria' && session.role !== 'morador' && (
            <PortariaModule
              session={session}
              units={units}
              packages={packages}
              visitorInvites={visitorInvites}
              vehicles={vehicles}
              gates={gates}
              onRefreshData={refreshAllData}
            />
          )}

          {activeTab === 'cameras' && (
            <CamerasGrid
              cameras={cameras}
              onOpenDiscovery={session.role !== 'morador' ? () => setActiveTab('dispositivos') : undefined}
            />
          )}

          {activeTab === 'financeiro' && (
            <FinancialModule
              bills={bills}
              summary={financialSummary}
              agreements={agreements}
              session={session}
            />
          )}

          {activeTab === 'reservas' && (
            <AmenitiesModule
              session={session}
            />
          )}

          {activeTab === 'engenharia' && (session.role === 'super_admin' || session.role === 'admin_sistema') && (
            <AdminTopologyView
              systemStatus={systemStatus}
              auditLogs={auditLogs}
              events={events}
              iotDevices={iotDevices}
              automations={automations}
              onToggleIoTDevice={handleToggleIoTDevice}
            />
          )}

          
          {activeTab === 'moradores' && session.role !== 'morador' && (
            <UnitManagementModule />
          )}

          {activeTab === 'condominio' && session.role !== 'morador' && (
            <CondominiumSettingsModule
              session={session}
              onRefreshCondoData={refreshAllData}
            />
          )}
  
          {activeTab === 'dispositivos' && (session.role === 'super_admin' || session.role === 'admin_sistema') && (
            <DeviceManagementModule />
          )}

          {activeTab === 'ajuda' && (
            <HelpModule
              session={session}
              onOpenXpeSimulator={() => setIsXpeOpen(true)}
              onOpenQrSimulator={() => setIsQrOpen(true)}
              onToggleWebPhone={() => setIsWebPhoneOpen(prev => !prev)}
              onOpenMaia={() => setIsMaiaOpen(true)}
              onSelectTab={setActiveTab}
            />
          )}
        </main>
      </div>

      {/* MODAIS DO SISTEMA */}
      <WebPhoneModal
        isOpen={isWebPhoneOpen}
        onClose={() => setIsWebPhoneOpen(false)}
        activeCall={activeCall}
        session={session}
        onAnswerCall={handleAnswerCall}
        onHangupCall={handleHangupCall}
        onSendDtmf={handleSendDtmf}
        feedbackMessage={feedbackMessage}
      />

      <XpeIntercomSimulator
        isOpen={isXpeOpen}
        onClose={() => setIsXpeOpen(false)}
        units={units}
        onStartCall={handleStartXpeCall}
        isCallInProgress={!!activeCall}
      />

      <QrVirtualIntercomModal
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
        units={units}
        onStartCall={handleStartQrCall}
        prefilledToken={initialQrToken}
      />

      <MaiaChatDrawer
        isOpen={isMaiaOpen}
        onClose={() => setIsMaiaOpen(false)}
        session={session}
      />

      <CallAuditModal
        isOpen={isAuditModalOpen}
        onClose={() => setIsAuditModalOpen(false)}
        recordingId={selectedRecordingId}
        session={session}
      />

      {/* MODAL CENTRAL DE NOTIFICAÇÕES PUSH */}
      <NotificationCenterModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* INDICADOR DE CONECTIVIDADE LOCAL-FIRST / OFFLINE */}
      <OfflineIndicator />
    </div>
  );
}
