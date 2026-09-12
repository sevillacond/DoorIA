import React, { useState, useEffect } from 'react';
import { Settings, Plus, Camera, Radio, Wifi, Edit, Trash2, ShieldCheck, Database, HardDrive, RefreshCcw, X, Phone, Radar } from 'lucide-react';
import type { CameraDevice, IoTDevice } from '../types.ts';
import { CameraDiscoveryModule } from './CameraDiscoveryModule.tsx';

export const DeviceManagementModule: React.FC = () => {
  const [cameras, setCameras] = useState<CameraDevice[]>([]);
  const [iotDevices, setIotDevices] = useState<IoTDevice[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
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
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <HardDrive className="w-6 h-6 text-cyan-400" />
            Gestão de Dispositivos, Câmeras & IoT
          </h2>
          <p className="text-sm text-slate-400">
            Discovery automático de rede, parametrização conforme fabricante (Intelbras, Hikvision, Dahua) e integração com go2rtc.
          </p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition border border-slate-700 shadow"
        >
          <Plus className="w-4 h-4 text-cyan-400" />
          Adicionar Manualmente
        </button>
      </div>

      {/* Módulo de Discovery & Parametrização por Fabricante */}
      <CameraDiscoveryModule onCameraImported={fetchData} />

      <div className="pt-2">
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <span>Dispositivos em Produção no Condomínio</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Lista de Câmeras */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Camera className="w-5 h-5 text-indigo-400" />
              Câmeras de CFTV (ONVIF/RTSP)
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700">
              {cameras.length} Registradas
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {loading ? (
              <div className="text-center text-slate-500 text-sm py-10">Carregando...</div>
            ) : cameras.map(cam => (
              <div key={cam.id} className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl hover:border-slate-700 transition group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${cam.status === 'online' ? 'bg-emerald-400' : 'bg-red-400'} shadow-[0_0_8px_rgba(0,0,0,0.5)]`} />
                    <div>
                      <h4 className="font-bold text-sm text-white">{cam.name}</h4>
                      {cam.manufacturer && (
                        <span className="text-[10px] font-semibold text-cyan-400">
                          {cam.manufacturer} {cam.ip ? `(${cam.ip})` : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button 
                      onClick={() => handleDeleteCamera(cam.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800"
                      title="Remover câmera do CFTV"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div><strong className="text-slate-300">Local:</strong> {cam.location}</div>
                  <div><strong className="text-slate-300">Perfil:</strong> {cam.profile}</div>
                  <div className="col-span-2 truncate font-mono text-[10px]"><strong className="text-slate-300 font-sans">RTSP:</strong> {cam.rtspUrl}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Lista de IoT / Relés */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="w-5 h-5 text-emerald-400" />
              Dispositivos IoT & Relés Zigbee
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700">
              {iotDevices.length} Registrados
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {loading ? (
              <div className="text-center text-slate-500 text-sm py-10">Carregando...</div>
            ) : iotDevices.map(dev => (
              <div key={dev.id} className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl hover:border-slate-700 transition group">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${dev.online ? 'bg-emerald-400' : 'bg-red-400'} shadow-[0_0_8px_rgba(0,0,0,0.5)]`} />
                    <h4 className="font-bold text-sm text-white">{dev.name}</h4>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800"><Edit className="w-4 h-4" /></button>
                    <button className="p-1.5 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400">
                  <div><strong className="text-slate-300">Tipo:</strong> <span className="capitalize">{dev.type.replace('_', ' ')}</span></div>
                  <div><strong className="text-slate-300">Protocolo:</strong> {dev.protocol === 'zigbee_3_0' ? 'Zigbee 3.0' : dev.protocol}</div>
                  <div><strong className="text-slate-300">Local:</strong> {dev.location}</div>
                  <div><strong className="text-slate-300">Estado:</strong> <span className="uppercase text-[10px] px-1.5 py-0.5 rounded bg-slate-800">{dev.state}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>


        {/* Lista de Totens SIP */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col h-[500px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Phone className="w-5 h-5 text-amber-400" />
              Totens IP / Interfones SIP
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700">
              1 Registrado
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            <div className="p-4 bg-slate-950 border border-slate-800/80 rounded-xl hover:border-slate-700 transition group">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(0,0,0,0.5)]" />
                  <h4 className="font-bold text-sm text-white">Totem Portaria Externa</h4>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                  <button className="p-1.5 text-slate-400 hover:text-cyan-400 rounded-lg hover:bg-slate-800"><Settings className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 mb-3">
                <div><strong className="text-slate-300">Modelo:</strong> Intelbras XPE 3115-IP</div>
                <div><strong className="text-slate-300">IP LAN:</strong> 192.168.1.150</div>
                <div><strong className="text-slate-300">Ramal SIP:</strong> 8000</div>
                <div><strong className="text-slate-300">Codec:</strong> G.711U / H.264</div>
              </div>
              
              <div className="pt-2 border-t border-slate-800">
                <h5 className="text-[10px] font-bold text-slate-500 uppercase mb-1.5">Parametrização de Relés (DTMF)</h5>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[10px] font-mono text-cyan-400">*07 = Portão Pedestre</span>
                  <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[10px] font-mono text-cyan-400">*08 = Portão Garagem</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* Modal de Adicionar Dispositivo */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
              <h3 className="font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                Cadastrar Nova Câmera (ONVIF)
              </h3>
              <button 
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddCamera} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Nome de Exibição</label>
                <input 
                  type="text" 
                  required
                  value={newCamName}
                  onChange={e => setNewCamName(e.target.value)}
                  placeholder="Ex: Câmera Portão Social"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">Localização / Setor</label>
                <input 
                  type="text" 
                  value={newCamLocation}
                  onChange={e => setNewCamLocation(e.target.value)}
                  placeholder="Ex: Acesso Pedestre"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Fabricante</label>
                  <select 
                    value={newCamBrand}
                    onChange={e => setNewCamBrand(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Intelbras">Intelbras</option>
                    <option value="Hikvision">Hikvision</option>
                    <option value="Outro (ONVIF)">Outro (ONVIF)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-1.5">Endereço IP / Host</label>
                  <input 
                    type="text" 
                    required
                    value={newCamIp}
                    onChange={e => setNewCamIp(e.target.value)}
                    placeholder="192.168.1.x"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-end gap-2 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-300 hover:bg-slate-800 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 text-sm font-bold bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl transition"
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
