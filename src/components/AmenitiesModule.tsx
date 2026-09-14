import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Users, 
  CheckCircle2, 
  XCircle, 
  AlertCircle,
  Plus, 
  Info, 
  CalendarCheck,
  CalendarDays,
  ShieldCheck,
  Wrench,
  Sparkles
} from 'lucide-react';
import type { Amenity, Reservation, UserSession } from '../types.ts';

interface AmenitiesModuleProps {
  session: UserSession;
}

const initialAmenities: Amenity[] = [
  {
    id: 'am-1',
    name: 'Salão de Festas Principal',
    description: 'Espaço climatizado com cozinha completa, mesas, cadeiras e freezer industrial.',
    capacity: 60,
    openTime: '10:00',
    closeTime: '23:59',
    requiresFee: true,
    feeAmount: 150,
    requiresApproval: true,
    status: 'disponivel',
    maxDurationHours: 12,
  },
  {
    id: 'am-2',
    name: 'Churrasqueira Gourmet VIP',
    description: 'Área gourmet com churrasqueira a carvão, bancada de granito, freezer e TV 55".',
    capacity: 20,
    openTime: '09:00',
    closeTime: '22:00',
    requiresFee: true,
    feeAmount: 50,
    requiresApproval: false,
    status: 'disponivel',
    maxDurationHours: 6,
  },
  {
    id: 'am-3',
    name: 'Quadra Poliesportiva',
    description: 'Quadra poliesportiva com iluminação LED para futsal, basquete e vôlei.',
    capacity: 15,
    openTime: '06:00',
    closeTime: '22:00',
    requiresFee: false,
    requiresApproval: false,
    status: 'disponivel',
    maxDurationHours: 2,
  },
  {
    id: 'am-4',
    name: 'Espaço Coworking & Reuniões',
    description: 'Salas com Wi-Fi de alta velocidade, tomadas dedicadas e mesa para reuniões.',
    capacity: 10,
    openTime: '07:00',
    closeTime: '21:00',
    requiresFee: false,
    requiresApproval: false,
    status: 'disponivel',
    maxDurationHours: 4,
  }
];

const initialReservations: Reservation[] = [
  {
    id: 'res-1',
    amenityId: 'am-1',
    unitId: 'u-101',
    unitNumber: '101',
    residentName: 'Carlos Silva',
    date: '2026-09-18',
    startTime: '14:00',
    endTime: '22:00',
    status: 'aprovada',
    guestCount: 40,
    feeAddedToBill: true
  },
  {
    id: 'res-2',
    amenityId: 'am-2',
    unitId: 'u-102',
    unitNumber: '102',
    residentName: 'Ana Souza',
    date: '2026-09-19',
    startTime: '11:00',
    endTime: '17:00',
    status: 'pendente',
    guestCount: 15,
  }
];

export const AmenitiesModule: React.FC<AmenitiesModuleProps> = ({ session }) => {
  const [activeTab, setActiveTab] = useState<'disponiveis' | 'minhas_reservas' | 'gestao'>('disponiveis');
  
  // Persisted state in localStorage
  const [amenities, setAmenities] = useState<Amenity[]>(() => {
    try {
      const saved = localStorage.getItem('enlace_amenities');
      return saved ? JSON.parse(saved) : initialAmenities;
    } catch {
      return initialAmenities;
    }
  });

  const [reservations, setReservations] = useState<Reservation[]>(() => {
    try {
      const saved = localStorage.getItem('enlace_reservations');
      return saved ? JSON.parse(saved) : initialReservations;
    } catch {
      return initialReservations;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('enlace_amenities', JSON.stringify(amenities));
    } catch (e) {
      console.error('Erro ao salvar amenities:', e);
    }
  }, [amenities]);

  useEffect(() => {
    try {
      localStorage.setItem('enlace_reservations', JSON.stringify(reservations));
    } catch (e) {
      console.error('Erro ao salvar reservations:', e);
    }
  }, [reservations]);

  const [selectedAmenity, setSelectedAmenity] = useState<Amenity | null>(null);
  const [scheduleAmenity, setScheduleAmenity] = useState<Amenity | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  
  // New Reservation Form State
  const [resDate, setResDate] = useState('');
  const [resStartTime, setResStartTime] = useState('12:00');
  const [resEndTime, setResEndTime] = useState('18:00');
  const [resGuests, setResGuests] = useState(1);
  const [resNotes, setResNotes] = useState('');

  // New Amenity Modal for Admin
  const [isAddAmenityModalOpen, setIsAddAmenityModalOpen] = useState(false);
  const [newAmenityName, setNewAmenityName] = useState('');
  const [newAmenityDesc, setNewAmenityDesc] = useState('');
  const [newAmenityCapacity, setNewAmenityCapacity] = useState(25);
  const [newAmenityOpen, setNewAmenityOpen] = useState('08:00');
  const [newAmenityClose, setNewAmenityClose] = useState('22:00');
  const [newAmenityFee, setNewAmenityFee] = useState<number>(0);
  const [newAmenityApproval, setNewAmenityApproval] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isAdmin = session.role === 'sindico' || session.role === 'admin_sistema' || session.role === 'super_admin';

  // Conflict verification
  const checkTimeOverlap = (startA: string, endA: string, startB: string, endB: string) => {
    return startA < endB && endA > startB;
  };

  const handleRequestReservation = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (!selectedAmenity) return;

    if (resStartTime >= resEndTime) {
      setErrorBanner('O horário de início deve ser anterior ao horário de término.');
      return;
    }

    if (resStartTime < selectedAmenity.openTime || resEndTime > selectedAmenity.closeTime) {
      setErrorBanner(`O espaço só funciona entre ${selectedAmenity.openTime} e ${selectedAmenity.closeTime}.`);
      return;
    }

    // Check conflict
    const conflicts = reservations.filter(r => 
      r.amenityId === selectedAmenity.id &&
      r.date === resDate &&
      r.status !== 'cancelada' &&
      r.status !== 'rejeitada' &&
      checkTimeOverlap(resStartTime, resEndTime, r.startTime, r.endTime)
    );

    if (conflicts.length > 0) {
      const conflict = conflicts[0];
      setErrorBanner(`Conflito de horário! Este espaço já está reservado para a Unidade ${conflict.unitNumber} das ${conflict.startTime} às ${conflict.endTime}. Escolha outro horário ou data.`);
      return;
    }

    const newRes: Reservation = {
      id: `res-${Date.now()}`,
      amenityId: selectedAmenity.id,
      unitId: session.unitId || `u-${session.unitNumber || '101'}`,
      unitNumber: session.unitNumber || '101',
      residentName: session.name,
      date: resDate,
      startTime: resStartTime,
      endTime: resEndTime,
      status: selectedAmenity.requiresApproval ? 'pendente' : 'aprovada',
      guestCount: resGuests,
      notes: resNotes.trim() || undefined,
      feeAddedToBill: selectedAmenity.requiresFee,
    };

    setReservations(prev => [newRes, ...prev]);
    setSelectedAmenity(null);
    setResDate('');
    setResNotes('');
    showToast(`Reserva para "${selectedAmenity.name}" solicitada! Status: ${newRes.status === 'aprovada' ? 'Confirmada e Aprovada' : 'Aguardando Análise do Síndico'}`);
    setActiveTab('minhas_reservas');
  };

  const handleCancelReservation = (resId: string) => {
    if (!confirm('Deseja realmente cancelar esta reserva?')) return;
    setReservations(prev => prev.map(r => r.id === resId ? { ...r, status: 'cancelada' } : r));
    showToast('Reserva cancelada com sucesso.');
  };

  const handleUpdateStatus = (resId: string, newStatus: 'aprovada' | 'rejeitada' | 'cancelada') => {
    setReservations(prev => prev.map(r => r.id === resId ? { ...r, status: newStatus } : r));
    showToast(`Reserva atualizada para "${newStatus.toUpperCase()}".`);
  };

  const handleToggleMaintenance = (amenityId: string) => {
    setAmenities(prev => prev.map(a => {
      if (a.id === amenityId) {
        const nextStatus = a.status === 'disponivel' ? 'manutencao' : 'disponivel';
        return { ...a, status: nextStatus };
      }
      return a;
    }));
    showToast('Status do espaço atualizado.');
  };

  const handleAddAmenity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAmenityName.trim()) return;

    const created: Amenity = {
      id: `am-${Date.now()}`,
      name: newAmenityName.trim(),
      description: newAmenityDesc.trim() || 'Área de uso comum dos condôminos.',
      capacity: newAmenityCapacity,
      openTime: newAmenityOpen,
      closeTime: newAmenityClose,
      requiresFee: newAmenityFee > 0,
      feeAmount: newAmenityFee > 0 ? newAmenityFee : undefined,
      requiresApproval: newAmenityApproval,
      status: 'disponivel',
      maxDurationHours: 6,
    };

    setAmenities(prev => [...prev, created]);
    setIsAddAmenityModalOpen(false);
    setNewAmenityName('');
    setNewAmenityDesc('');
    setNewAmenityFee(0);
    showToast(`Área "${created.name}" adicionada com sucesso!`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'aprovada':
        return <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 rounded-full text-[10px] font-bold uppercase">Aprovada</span>;
      case 'pendente':
        return <span className="px-2.5 py-0.5 bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800 rounded-full text-[10px] font-bold uppercase">Pendente</span>;
      case 'rejeitada':
        return <span className="px-2.5 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800 rounded-full text-[10px] font-bold uppercase">Rejeitada</span>;
      case 'cancelada':
        return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 rounded-full text-[10px] font-bold uppercase">Cancelada</span>;
      default:
        return <span className="px-2.5 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 rounded-full text-[10px] font-bold uppercase">{status}</span>;
    }
  };

  const myReservations = reservations.filter(r => r.unitNumber === session.unitNumber || session.role !== 'morador');

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#0d1b35] text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-slideUp text-xs font-semibold">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0d1b35] dark:text-white font-['Red_Hat_Display'] flex items-center gap-2">
            <span>Áreas Comuns & Reservas</span>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/50 text-[#0a50ff] dark:text-cyan-400 border border-blue-200 dark:border-blue-900">
              {amenities.length} espaços
            </span>
          </h2>
          <p className="text-sm text-[#5a6a85] dark:text-slate-400 mt-1">
            Reserve churrasqueira, salão e quadra com checagem automática de agenda e normas do condomínio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isAdmin && (
            <button
              onClick={() => setIsAddAmenityModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0d1b35] dark:text-white text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Plus className="w-4 h-4 text-[#0a50ff] dark:text-cyan-400" />
              <span className="hidden sm:inline">Cadastrar Espaço</span>
            </button>
          )}

          <div className="flex bg-[#f8fafc] dark:bg-slate-900 p-1 rounded-xl border border-[#dde5f0] dark:border-slate-800">
            <button
              onClick={() => setActiveTab('disponiveis')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition ${
                activeTab === 'disponiveis' 
                  ? 'bg-white dark:bg-slate-800 text-[#0a50ff] dark:text-cyan-400 shadow-xs' 
                  : 'text-[#5a6a85] dark:text-slate-400 hover:text-[#0d1b35] dark:hover:text-white'
              }`}
            >
              Espaços
            </button>
            <button
              onClick={() => setActiveTab('minhas_reservas')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                activeTab === 'minhas_reservas' 
                  ? 'bg-white dark:bg-slate-800 text-[#0a50ff] dark:text-cyan-400 shadow-xs' 
                  : 'text-[#5a6a85] dark:text-slate-400 hover:text-[#0d1b35] dark:hover:text-white'
              }`}
            >
              <span>Minhas Reservas</span>
              {myReservations.filter(r => r.status === 'aprovada' || r.status === 'pendente').length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#0a50ff] text-white">
                  {myReservations.filter(r => r.status === 'aprovada' || r.status === 'pendente').length}
                </span>
              )}
            </button>
            {isAdmin && (
              <button
                onClick={() => setActiveTab('gestao')}
                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                  activeTab === 'gestao' 
                    ? 'bg-white dark:bg-slate-800 text-[#0a50ff] dark:text-cyan-400 shadow-xs' 
                    : 'text-[#5a6a85] dark:text-slate-400 hover:text-[#0d1b35] dark:hover:text-white'
                }`}
              >
                <span>Gestão (Síndico)</span>
                {reservations.filter(r => r.status === 'pendente').length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-500 text-white">
                    {reservations.filter(r => r.status === 'pendente').length}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ABA 1: ESPAÇOS DISPONÍVEIS */}
      {activeTab === 'disponiveis' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {amenities.map(amenity => {
            const upcoming = reservations.filter(r => 
              r.amenityId === amenity.id && 
              (r.status === 'aprovada' || r.status === 'pendente') &&
              r.date >= new Date().toISOString().split('T')[0]
            );

            return (
              <div key={amenity.id} className="bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition flex flex-col">
                <div className="h-32 bg-slate-100 dark:bg-slate-800/80 flex items-center justify-center relative p-4">
                  <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900/80 shadow-inner flex items-center justify-center">
                    {amenity.status === 'disponivel' ? (
                      <CalendarCheck className="w-7 h-7 text-[#0a50ff] dark:text-cyan-400" />
                    ) : (
                      <Wrench className="w-7 h-7 text-rose-500" />
                    )}
                  </div>
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase backdrop-blur-md shadow-xs ${
                      amenity.status === 'disponivel' 
                        ? 'bg-emerald-500/90 text-white' 
                        : 'bg-rose-500/90 text-white'
                    }`}>
                      {amenity.status === 'disponivel' ? 'Disponível' : 'Em Manutenção'}
                    </span>
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <h3 className="font-extrabold text-[#0d1b35] dark:text-white text-base font-['Red_Hat_Display']">{amenity.name}</h3>
                  </div>

                  <p className="text-xs text-[#5a6a85] dark:text-slate-400 leading-relaxed mb-4 flex-1">
                    {amenity.description}
                  </p>

                  <div className="space-y-2 mb-4 text-xs font-mono text-[#0d1b35] dark:text-slate-300 bg-[#f8fafc] dark:bg-slate-950 p-3 rounded-xl border border-[#dde5f0] dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[#5a6a85] dark:text-slate-400">
                        <Users className="w-3.5 h-3.5" /> Lotação Máxima
                      </span>
                      <span className="font-bold">{amenity.capacity} pessoas</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[#5a6a85] dark:text-slate-400">
                        <Clock className="w-3.5 h-3.5" /> Funcionamento
                      </span>
                      <span className="font-bold">{amenity.openTime} às {amenity.closeTime}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[#5a6a85] dark:text-slate-400">
                        <Info className="w-3.5 h-3.5" /> Taxa de Limpeza/Uso
                      </span>
                      <span className={amenity.requiresFee ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-emerald-600 dark:text-emerald-400 font-bold'}>
                        {amenity.requiresFee ? `R$ ${amenity.feeAmount?.toFixed(2)}` : 'Isento'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setScheduleAmenity(amenity)}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0d1b35] dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-1.5"
                    >
                      <CalendarDays className="w-3.5 h-3.5 text-[#0a50ff] dark:text-cyan-400" />
                      <span>Ver Agenda ({upcoming.length})</span>
                    </button>

                    {isAdmin && (
                      <button
                        onClick={() => handleToggleMaintenance(amenity.id)}
                        title="Alternar Manutenção"
                        className="py-2 px-3 rounded-xl border border-[#dde5f0] dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-bold transition"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedAmenity(amenity);
                      setErrorBanner(null);
                      setResDate('');
                    }}
                    disabled={amenity.status !== 'disponivel'}
                    className="w-full py-2.5 rounded-xl bg-[#0a50ff] hover:bg-[#0842cc] disabled:bg-slate-200 disabled:dark:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold transition shadow-md shadow-blue-500/20 active:scale-98"
                  >
                    {amenity.status === 'disponivel' ? 'Solicitar Reserva' : 'Indisponível no Momento'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ABA 2: MINHAS RESERVAS */}
      {activeTab === 'minhas_reservas' && (
        <div className="space-y-3">
          {myReservations.map(res => {
            const space = amenities.find(a => a.id === res.amenityId);
            return (
              <div key={res.id} className="p-4 bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl shadow-xs hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-[#0d1b35] dark:text-white text-sm">{space?.name || 'Espaço'}</span>
                    {getStatusBadge(res.status)}
                    {res.feeAddedToBill && space?.feeAmount && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-[#0a50ff] border border-blue-200 dark:bg-blue-950 dark:text-cyan-300 dark:border-blue-900">
                        Taxa: R$ {space.feeAmount.toFixed(2)} (Boleto)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#5a6a85] dark:text-slate-400 font-mono flex flex-wrap items-center gap-2">
                    <span>{new Date(res.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    <span>•</span>
                    <span>{res.startTime} às {res.endTime}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {res.guestCount} convidados
                    </span>
                  </div>
                  {res.notes && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                      "{res.notes}"
                    </div>
                  )}
                </div>
                
                <div className="flex items-center justify-end gap-2 pt-3 sm:pt-0 border-t border-[#dde5f0] dark:border-slate-800 sm:border-0">
                  {res.status === 'pendente' && (
                    <button 
                      onClick={() => handleCancelReservation(res.id)}
                      className="text-xs px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold border border-rose-200 transition active:scale-95"
                    >
                      Cancelar Solicitação
                    </button>
                  )}
                  {res.status === 'aprovada' && (
                    <button 
                      onClick={() => handleCancelReservation(res.id)}
                      className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 font-bold transition active:scale-95"
                    >
                      Desistir / Cancelar
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {myReservations.length === 0 && (
            <div className="p-12 text-center bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl text-slate-500 font-medium">
              <CalendarCheck className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
              <p>Nenhuma reserva solicitada para sua unidade no momento.</p>
              <button
                onClick={() => setActiveTab('disponiveis')}
                className="mt-3 px-4 py-2 rounded-xl bg-[#0a50ff] text-white text-xs font-bold shadow-md shadow-blue-500/20"
              >
                Conhecer e Reservar Espaços
              </button>
            </div>
          )}
        </div>
      )}

      {/* ABA 3: GESTÃO DO SÍNDICO */}
      {activeTab === 'gestao' && isAdmin && (
        <div className="space-y-4">
          <div className="p-4 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShieldCheck className="w-5 h-5 text-[#0a50ff] dark:text-cyan-400" />
              <span className="text-xs text-[#0d1b35] dark:text-slate-200 font-medium">
                Controle operacional de aprovação, cobrança de taxa e bloqueio de datas conflitantes.
              </span>
            </div>
            <div className="text-xs font-mono font-bold text-[#0a50ff] dark:text-cyan-400">
              Total: {reservations.length} reservas registradas
            </div>
          </div>

          <div className="space-y-3">
            {reservations.map(res => {
              const space = amenities.find(a => a.id === res.amenityId);
              return (
                <div key={res.id} className="p-4 bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl shadow-xs hover:shadow-md transition flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-[#0d1b35] dark:text-white">Unidade {res.unitNumber}</span>
                      <span className="text-xs text-[#5a6a85] dark:text-slate-400 font-medium">• {res.residentName}</span>
                      {getStatusBadge(res.status)}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-[#0a50ff] dark:text-cyan-400">{space?.name}</span>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <span className="text-[#5a6a85] dark:text-slate-400 font-mono">
                        {new Date(res.date + 'T00:00:00').toLocaleDateString('pt-BR')} • {res.startTime} às {res.endTime}
                      </span>
                      <span className="text-slate-300 dark:text-slate-700">|</span>
                      <span className="text-[#5a6a85] dark:text-slate-400 font-mono">
                        {res.guestCount} convidados
                      </span>
                    </div>
                    {res.notes && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-950 p-2 rounded-lg border border-slate-100 dark:border-slate-800">
                        Obs: "{res.notes}"
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center sm:flex-col sm:items-end justify-between gap-2 pt-3 sm:pt-0 border-t border-[#dde5f0] dark:border-slate-800 sm:border-0">
                    {res.status === 'pendente' && (
                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button 
                          onClick={() => handleUpdateStatus(res.id, 'aprovada')}
                          className="flex-1 sm:flex-none text-xs px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800 font-bold border border-emerald-200 transition text-center active:scale-95"
                        >
                          Aprovar
                        </button>
                        <button 
                          onClick={() => handleUpdateStatus(res.id, 'rejeitada')}
                          className="flex-1 sm:flex-none text-xs px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800 font-bold border border-rose-200 transition text-center active:scale-95"
                        >
                          Rejeitar
                        </button>
                      </div>
                    )}
                    {res.status === 'aprovada' && (
                      <button 
                        onClick={() => handleUpdateStatus(res.id, 'cancelada')}
                        className="w-full sm:w-auto text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold border border-slate-300 dark:border-slate-700 transition text-center active:scale-95"
                      >
                        Revogar Reserva
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            
            {reservations.length === 0 && (
              <div className="p-8 text-center bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl text-slate-500 font-medium">
                Nenhuma reserva registrada no condomínio.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Visualizador de Agenda / Ocupação */}
      {scheduleAmenity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-[#0d1b35] dark:text-white flex items-center gap-2 font-['Red_Hat_Display']">
                <CalendarDays className="w-5 h-5 text-[#0a50ff] dark:text-cyan-400" />
                <span>Ocupação & Horários: {scheduleAmenity.name}</span>
              </h3>
              <button
                onClick={() => setScheduleAmenity(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-[#0d1b35] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {reservations.filter(r => r.amenityId === scheduleAmenity.id && r.status !== 'cancelada' && r.status !== 'rejeitada').length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs font-medium bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800">
                  Nenhum horário reservado para este espaço até o momento. Todas as datas estão livres!
                </div>
              ) : (
                reservations
                  .filter(r => r.amenityId === scheduleAmenity.id && r.status !== 'cancelada' && r.status !== 'rejeitada')
                  .sort((a, b) => a.date.localeCompare(b.date))
                  .map(res => (
                    <div key={res.id} className="p-3 bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-[#0d1b35] dark:text-white">
                          {new Date(res.date + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                        </div>
                        <div className="font-mono text-[#5a6a85] dark:text-slate-400">
                          {res.startTime} às {res.endTime} • Unidade {res.unitNumber}
                        </div>
                      </div>
                      <div>
                        {getStatusBadge(res.status)}
                      </div>
                    </div>
                  ))
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => {
                  const am = scheduleAmenity;
                  setScheduleAmenity(null);
                  setSelectedAmenity(am);
                }}
                className="px-4 py-2 rounded-xl bg-[#0a50ff] text-white text-xs font-bold shadow-md shadow-blue-500/20"
              >
                Solicitar Reserva Neste Espaço
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Reserva */}
      {selectedAmenity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-[#0d1b35] dark:text-white flex items-center gap-2 font-['Red_Hat_Display']">
                <CalendarCheck className="w-5 h-5 text-[#0a50ff] dark:text-cyan-400" />
                <span>Nova Reserva</span>
              </h3>
              <button
                onClick={() => setSelectedAmenity(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-[#0d1b35] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4 p-3 bg-[#ebf2ff] dark:bg-cyan-950/30 rounded-xl border border-[#dde8ff] dark:border-cyan-900/50 flex flex-col gap-1">
              <span className="font-bold text-[#0a50ff] dark:text-cyan-400 text-sm">{selectedAmenity.name}</span>
              <span className="text-[11px] text-[#0a50ff]/70 dark:text-cyan-400/70">
                {selectedAmenity.requiresFee ? `Sujeito a taxa de R$ ${selectedAmenity.feeAmount?.toFixed(2)} (cobrada no boleto da cota)` : 'Isento de taxa'} • Horário permitido: {selectedAmenity.openTime} às {selectedAmenity.closeTime}
              </span>
            </div>

            {errorBanner && (
              <div className="mb-4 p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorBanner}</span>
              </div>
            )}

            <form onSubmit={handleRequestReservation} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0d1b35] dark:text-slate-200 mb-1">Data da Reserva</label>
                  <input
                    type="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    value={resDate}
                    onChange={(e) => setResDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 rounded-xl text-xs text-[#0d1b35] dark:text-white focus:outline-none focus:border-[#0a50ff] dark:focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0d1b35] dark:text-slate-200 mb-1">Qtd. Convidados</label>
                  <input
                    type="number"
                    required
                    min="1"
                    max={selectedAmenity.capacity}
                    value={resGuests}
                    onChange={(e) => setResGuests(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 rounded-xl text-xs text-[#0d1b35] dark:text-white focus:outline-none focus:border-[#0a50ff] dark:focus:border-cyan-500 font-mono"
                  />
                  <span className="text-[10px] text-slate-400">Máx: {selectedAmenity.capacity}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-[#0d1b35] dark:text-slate-200 mb-1">Horário Início</label>
                  <input
                    type="time"
                    required
                    value={resStartTime}
                    onChange={(e) => setResStartTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 rounded-xl text-xs text-[#0d1b35] dark:text-white focus:outline-none focus:border-[#0a50ff] dark:focus:border-cyan-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0d1b35] dark:text-slate-200 mb-1">Horário Término</label>
                  <input
                    type="time"
                    required
                    value={resEndTime}
                    onChange={(e) => setResEndTime(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 rounded-xl text-xs text-[#0d1b35] dark:text-white focus:outline-none focus:border-[#0a50ff] dark:focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-[#0d1b35] dark:text-slate-200 mb-1">Observações ou Finalidade (Opcional)</label>
                <textarea
                  value={resNotes}
                  onChange={(e) => setResNotes(e.target.value)}
                  placeholder="Ex: Aniversário em família, uso do freezer."
                  rows={2}
                  className="w-full px-3.5 py-2.5 bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 rounded-xl text-xs text-[#0d1b35] dark:text-white placeholder-slate-400 focus:outline-none focus:border-[#0a50ff] dark:focus:border-cyan-500"
                />
              </div>
              
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedAmenity(null)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#0a50ff] hover:bg-[#0842cc] text-white text-xs font-bold transition shadow-md shadow-blue-500/20 active:scale-98"
                >
                  Confirmar Reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Cadastro de Novo Espaço (Admin) */}
      {isAddAmenityModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-[#0d1b35] dark:text-white flex items-center gap-2 font-['Red_Hat_Display']">
                <Sparkles className="w-5 h-5 text-[#0a50ff] dark:text-cyan-400" />
                <span>Cadastrar Novo Espaço Comum</span>
              </h3>
              <button
                onClick={() => setIsAddAmenityModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-[#0d1b35] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddAmenity} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#0d1b35] dark:text-slate-200 mb-1">Nome do Espaço</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Deck da Piscina, Espaço Zen"
                  value={newAmenityName}
                  onChange={(e) => setNewAmenityName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 rounded-xl text-xs text-[#0d1b35] dark:text-white focus:outline-none focus:border-[#0a50ff]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#0d1b35] dark:text-slate-200 mb-1">Descrição & Regras</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Área para confraternizações ao ar livre."
                  value={newAmenityDesc}
                  onChange={(e) => setNewAmenityDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 rounded-xl text-xs text-[#0d1b35] dark:text-white focus:outline-none focus:border-[#0a50ff]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0d1b35] dark:text-slate-200 mb-1">Lotação (Pessoas)</label>
                  <input
                    type="number"
                    min="1"
                    value={newAmenityCapacity}
                    onChange={(e) => setNewAmenityCapacity(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 rounded-xl text-xs text-[#0d1b35] dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0d1b35] dark:text-slate-200 mb-1">Taxa de Uso (R$)</label>
                  <input
                    type="number"
                    min="0"
                    step="5"
                    value={newAmenityFee}
                    onChange={(e) => setNewAmenityFee(Number(e.target.value))}
                    className="w-full px-3.5 py-2 bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 rounded-xl text-xs text-[#0d1b35] dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#0d1b35] dark:text-slate-200 mb-1">Abertura</label>
                  <input
                    type="time"
                    value={newAmenityOpen}
                    onChange={(e) => setNewAmenityOpen(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 rounded-xl text-xs text-[#0d1b35] dark:text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#0d1b35] dark:text-slate-200 mb-1">Fechamento</label>
                  <input
                    type="time"
                    value={newAmenityClose}
                    onChange={(e) => setNewAmenityClose(e.target.value)}
                    className="w-full px-3.5 py-2 bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 rounded-xl text-xs text-[#0d1b35] dark:text-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="approvalReq"
                  checked={newAmenityApproval}
                  onChange={(e) => setNewAmenityApproval(e.target.checked)}
                  className="rounded text-[#0a50ff]"
                />
                <label htmlFor="approvalReq" className="text-xs text-[#0d1b35] dark:text-slate-200 cursor-pointer">
                  Exige aprovação prévia do síndico
                </label>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddAmenityModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#0a50ff] hover:bg-[#0842cc] text-white text-xs font-bold transition shadow-md shadow-blue-500/20"
                >
                  Salvar Espaço
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
