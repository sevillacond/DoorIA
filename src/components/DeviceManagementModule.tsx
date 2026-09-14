import React, { useState, useEffect } from 'react';
import { Settings, Plus, Camera, Radio, Wifi, Edit, Trash2, ShieldCheck, Database, HardDrive, RefreshCcw, X, Phone, Radar, Sliders, Zap } from 'lucide-react';
import type { CameraDevice, IoTDevice } from '../types.ts';
import { CameraDiscoveryModule } from './CameraDiscoveryModule.tsx';
import { XpeIntegrationWizardModal } from './XpeIntegrationWizardModal.tsx';

export const DeviceManagementModule: React.FC = () => {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [iotDevices, setIotDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isXpeWizardOpen, setIsXpeWizardOpen] = useState(false);
  const [newCamName, setNewCamName] = useState('');
  const [newCamLocation, setNewCamLocation] = useState('');
  const [newCamBrand, setNewCamBrand] = useState('Intelbras');
  const [newCamIp, setNewCamIp] = useState('');

  const fetchData = async () => {
    try {
      setLoading(true);
      const [camRes, iotRes] = await Promise.all([
        fetch('/api/v1/devices/cameras'),
        fetch('/api/v1/devices/iot')
      ]);
      const camData = await camRes.json();
      const iotData = await iotRes.json();
      setCameras(camData);
      setIotDevices(iotData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeleteCamera = async (id: string) => {
    if (!window.confirm('Deseja desvincular esta câmera do sistema de CFTV?')) return;
    try {
      const res = await fetch(`/api/v1/devices/cameras/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setCameras(prev => prev.filter(c => c.id !== id));
      }
    } catch (e) {
      console.error('Erro ao excluir câmera:', e);
    }
  };

  const handleAddCamera = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCamName || !newCamIp) return;

    try {
      const res = await fetch('/api/v1/devices/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCamName,
          location: newCamLocation,
          profile: newCamBrand === 'Intelbras' ? 'ONVIF_Profile_S' : 'ONVIF_Profile_T',
          rtspUrl: `rtsp://admin:*****@${newCamIp}:554/cam/realmonitor?channel=1&subtype=0`,
          webrtcStreamUrl: `/streams/webrtc/${newCamIp.replace(/\./g, '')}`,
          resolution: '1920x1080',
          status: 'online',
          isXpeIntegrated: false,
          manufacturer: newCamBrand,
          ip: newCamIp
        })
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setNewCamName('');
        setNewCamLocation('');
        setNewCamIp('');
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-[#0d1b35] dark:text-white flex items-center gap-2 font-['Red_Hat_Display']">
            <HardDrive className="w-6 h-6 text-[#0a50ff] dark:text-cyan-400" />
            Gestão de Dispositivos, Câmeras & IoT
          </h2>
          <p className="text-sm text-[#5a6a85] dark:text-slate-400 mt-0.5">
            Discovery automático de rede, parametrização conforme fabricante (Intelbras, Hikvision, Dahua) e integração com go2rtc.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsXpeWizardOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-[#0a50ff] to-[#0099ff] hover:opacity-95 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 transition shadow-md shadow-blue-500/25 cursor-pointer"
          >
            <Radio className="w-4 h-4" />
            <span>Assistente XPE 3115-IP</span>
            <span className="px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider bg-white/20 rounded-md">
              Visual
            </span>
          </button>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 rounded-xl text-xs font-bold flex items-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Adicionar Manualmente
          </button>
        </div>
      </div>

      {/* Módulo de Discovery & Parametrização por Fabricante */}
      <CameraDiscoveryModule onCameraImported={fetchData} />

      <div className="pt-2">
        <h3 className="text-sm font-extrabold text-[#0d1b35] dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2 font-['Red_Hat_Display']">
          <span>Dispositivos em Produção no Condomínio</span>
          <span className="w-2 h-2 rounded-full bg-[#18c7a8] dark:bg-emerald-400"></span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Lista de Câmeras */}
        <div className="bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl p-5 flex flex-col h-[500px] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-extrabold text-[#0d1b35] dark:text-white flex items-center gap-2 font-['Red_Hat_Display']">
              <Camera className="w-5 h-5 text-[#0a50ff] dark:text-cyan-400" />
              Câmeras de CFTV (ONVIF/RTSP)
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#ebf2ff] dark:bg-cyan-950/40 text-xs font-bold text-[#0a50ff] dark:text-cyan-400 border border-[#dde8ff] dark:border-cyan-800/50">
              {cameras.length} Registradas
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {loading ? (
              <div className="text-center text-[#5a6a85] dark:text-slate-400 text-sm py-10">Carregando...</div>
            ) : cameras.map(cam => (
              <div key={cam.id} className="p-4 bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 rounded-xl hover:border-[#0a50ff]/40 dark:hover:border-cyan-500/40 transition group shadow-xs">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${cam.status === 'online' ? 'bg-[#18c7a8] dark:bg-emerald-400' : 'bg-[#fa4b42] dark:bg-red-500'} shadow-xs`} />
                    <div>
                      <h4 className="font-bold text-sm text-[#0d1b35] dark:text-white">{cam.name}</h4>
                      {cam.manufacturer && (
                        <span className="text-[10px] font-bold text-[#0a50ff] dark:text-cyan-400">
                          {cam.manufacturer} {cam.ip ? `(${cam.ip})` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button 
                      onClick={() => handleDeleteCamera(cam.id)}
                      className="p-1.5 text-slate-400 hover:text-[#fa4b42] dark:hover:text-red-400 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                      title="Remover câmera do CFTV"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#5a6a85] dark:text-slate-400">
                  <div><strong className="text-[#0d1b35] dark:text-white">Local:</strong> {cam.location}</div>
                  <div><strong className="text-[#0d1b35] dark:text-white">Perfil:</strong> {cam.profile}</div>
                  <div className="col-span-2 truncate font-mono text-[10px]"><strong className="text-[#0d1b35] dark:text-white font-sans">RTSP:</strong> {cam.rtspUrl}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lista de IoT / Relés */}
        <div className="bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl p-5 flex flex-col h-[500px] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-extrabold text-[#0d1b35] dark:text-white flex items-center gap-2 font-['Red_Hat_Display']">
              <Radio className="w-5 h-5 text-[#18c7a8] dark:text-emerald-400" />
              Dispositivos IoT & Relés Zigbee
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#ebfbf8] dark:bg-emerald-950/40 text-xs font-bold text-[#18c7a8] dark:text-emerald-400 border border-[#18c7a8]/20 dark:border-emerald-800/50">
              {iotDevices.length} Registrados
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {loading ? (
              <div className="text-center text-[#5a6a85] dark:text-slate-400 text-sm py-10">Carregando...</div>
            ) : iotDevices.map(dev => (
              <div key={dev.id} className="p-4 bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 rounded-xl hover:border-[#18c7a8]/40 dark:hover:border-emerald-500/40 transition group shadow-xs">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${dev.online ? 'bg-[#18c7a8] dark:bg-emerald-400' : 'bg-[#fa4b42] dark:bg-red-500'} shadow-xs`} />
                    <h4 className="font-bold text-sm text-[#0d1b35] dark:text-white">{dev.name}</h4>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button className="p-1.5 text-slate-400 hover:text-[#0a50ff] dark:hover:text-cyan-400 rounded-lg hover:bg-white dark:hover:bg-slate-800"><Edit className="w-4 h-4" /></button>
                    <button className="p-1.5 text-slate-400 hover:text-[#fa4b42] dark:hover:text-red-400 rounded-lg hover:bg-white dark:hover:bg-slate-800"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#5a6a85] dark:text-slate-400">
                  <div><strong className="text-[#0d1b35] dark:text-white">Tipo:</strong> <span className="capitalize">{dev.type.replace('_', ' ')}</span></div>
                  <div><strong className="text-[#0d1b35] dark:text-white">Protocolo:</strong> {dev.protocol === 'zigbee_3_0' ? 'Zigbee 3.0' : dev.protocol}</div>
                  <div><strong className="text-[#0d1b35] dark:text-white">Local:</strong> {dev.location}</div>
                  <div><strong className="text-[#0d1b35] dark:text-white">Estado:</strong> <span className="uppercase text-[10px] px-2 py-0.5 rounded font-bold bg-[#ebfbf8] dark:bg-emerald-950 text-[#18c7a8] dark:text-emerald-400">{dev.state}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lista de Totens SIP */}
        <div className="bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl p-5 flex flex-col h-[500px] shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-extrabold text-[#0d1b35] dark:text-white flex items-center gap-2 font-['Red_Hat_Display']">
              <Phone className="w-5 h-5 text-[#ffb21a] dark:text-amber-400" />
              Totens IP / Interfones SIP
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-[#fff8eb] dark:bg-amber-950/40 text-xs font-bold text-[#ffb21a] dark:text-amber-400 border border-[#ffb21a]/30 dark:border-amber-800/50">
              1 Registrado
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            <div className="p-4 bg-[#f8fafc] dark:bg-slate-950 border border-[#dde5f0] dark:border-slate-800 rounded-xl hover:border-[#ffb21a]/40 dark:hover:border-amber-500/40 transition group shadow-xs">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#18c7a8] dark:bg-emerald-400 shadow-xs" />
                  <h4 className="font-bold text-sm text-[#0d1b35] dark:text-white">Totem Portaria Externa</h4>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={() => setIsXpeWizardOpen(true)}
                    className="p-1.5 text-slate-400 hover:text-[#0a50ff] dark:hover:text-cyan-400 rounded-lg hover:bg-white dark:hover:bg-slate-800 transition cursor-pointer"
                    title="Abrir Assistente de Integração do XPE 3115-IP"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-[#5a6a85] dark:text-slate-400 mb-3">
                <div><strong className="text-[#0d1b35] dark:text-white">Modelo:</strong> Intelbras XPE 3115-IP</div>
                <div><strong className="text-[#0d1b35] dark:text-white">IP LAN:</strong> 192.168.1.150</div>
                <div><strong className="text-[#0d1b35] dark:text-white">Ramal SIP:</strong> 8000</div>
                <div><strong className="text-[#0d1b35] dark:text-white">Codec:</strong> G.711U / H.264</div>
              </div>
              
              <div className="pt-2.5 border-t border-[#dde5f0] dark:border-slate-800">
                <h5 className="text-[10px] font-bold text-[#5a6a85] dark:text-slate-500 uppercase mb-1.5">Parametrização de Relés (DTMF)</h5>
                <div className="flex items-center gap-2 mb-3">
                  <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-lg text-[10px] font-mono font-bold text-[#0a50ff] dark:text-cyan-400">*07 = Portão Pedestre</span>
                  <span className="px-2.5 py-1 bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-lg text-[10px] font-mono font-bold text-[#0a50ff] dark:text-cyan-400">*08 = Portão Garagem</span>
                </div>

                <button
                  onClick={() => setIsXpeWizardOpen(true)}
                  className="w-full py-2 px-3 rounded-lg bg-[#0a50ff]/10 hover:bg-[#0a50ff]/20 text-[#0a50ff] dark:text-cyan-400 text-xs font-bold flex items-center justify-center gap-2 transition cursor-pointer border border-[#0a50ff]/20"
                >
                  <Sliders className="w-3.5 h-3.5" />
                  <span>Abrir Assistente Visual XPE 3115-IP</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Assistente Visual de Integração do XPE 3115-IP */}
      <XpeIntegrationWizardModal
        isOpen={isXpeWizardOpen}
        onClose={() => setIsXpeWizardOpen(false)}
        onConfigSaved={fetchData}
      />

      {/* Modal de Adicionar Dispositivo */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0d1b35]/70 dark:bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-[#dde5f0] dark:border-slate-800 flex items-center justify-between bg-[#f8fafc] dark:bg-slate-950">
              <h3 className="font-extrabold text-[#0d1b35] dark:text-white flex items-center gap-2 font-['Red_Hat_Display']">
                <Plus className="w-5 h-5 text-[#0a50ff] dark:text-cyan-400" />
                Cadastrar Nova Câmera (ONVIF)
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-[#0d1b35] dark:hover:text-white p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCamera} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5a6a85] dark:text-slate-400 mb-1.5">Nome de Exibição</label>
                <input 
                  type="text" 
                  required
                  value={newCamName}
                  onChange={e => setNewCamName(e.target.value)}
                  placeholder="Ex: Câmera Portão Social"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-700 rounded-xl text-sm text-[#0d1b35] dark:text-white focus:outline-none focus:border-[#0a50ff] dark:focus:border-cyan-500 focus:ring-1 focus:ring-[#0a50ff] dark:focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5a6a85] dark:text-slate-400 mb-1.5">Localização / Setor</label>
                <input 
                  type="text" 
                  value={newCamLocation}
                  onChange={e => setNewCamLocation(e.target.value)}
                  placeholder="Ex: Acesso Pedestre"
                  className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-700 rounded-xl text-sm text-[#0d1b35] dark:text-white focus:outline-none focus:border-[#0a50ff] dark:focus:border-cyan-500 focus:ring-1 focus:ring-[#0a50ff] dark:focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#5a6a85] dark:text-slate-400 mb-1.5">Fabricante</label>
                  <select 
                    value={newCamBrand}
                    onChange={e => setNewCamBrand(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-700 rounded-xl text-sm text-[#0d1b35] dark:text-white focus:outline-none focus:border-[#0a50ff] dark:focus:border-cyan-500 focus:ring-1 focus:ring-[#0a50ff] dark:focus:ring-cyan-500"
                  >
                    <option value="Intelbras">Intelbras</option>
                    <option value="Hikvision">Hikvision</option>
                    <option value="Outro (ONVIF)">Outro (ONVIF)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#5a6a85] dark:text-slate-400 mb-1.5">Endereço IP / Host</label>
                  <input 
                    type="text" 
                    required
                    value={newCamIp}
                    onChange={e => setNewCamIp(e.target.value)}
                    placeholder="192.168.1.x"
                    className="w-full px-3.5 py-2.5 bg-white dark:bg-slate-900 border border-[#dde5f0] dark:border-slate-700 rounded-xl text-sm text-[#0d1b35] dark:text-white focus:outline-none focus:border-[#0a50ff] dark:focus:border-cyan-500 focus:ring-1 focus:ring-[#0a50ff] dark:focus:ring-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-[#dde5f0] dark:border-slate-800 flex justify-end gap-2.5 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-[#5a6a85] dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-sm font-bold bg-[#0a50ff] hover:bg-[#0842cc] dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white rounded-xl transition shadow-xs cursor-pointer"
                >
                  Salvar Dispositivo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
