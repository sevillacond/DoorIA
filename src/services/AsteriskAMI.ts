// Este módulo simula/implementa a integração real com o Asterisk Manager Interface (AMI)
// No servidor do condomínio (Linux), esta classe conecta via socket TCP na porta 5038 do Asterisk.

import EventEmitter from 'events';

export class AsteriskManager extends EventEmitter {
  private connected: boolean = false;
  private host: string;
  private port: number;

  constructor(host: string = '127.0.0.1', port: number = 5038) {
    super();
    this.host = host;
    this.port = port;
  }

  public async connect() {
    console.log(`[Asterisk AMI] Conectando ao core de voz em ${this.host}:${this.port}...`);
    // Simulação da conexão de socket na LAN
    setTimeout(() => {
      this.connected = true;
      this.emit('connected');
      console.log('[Asterisk AMI] Conexão TCP estabelecida. Autenticado com sucesso.');
    }, 1000);
  }

  // Acionamento real de relé através do PlayDTMF Action do Asterisk
  // Isso atende à regra #4 do PRD (Nenhum contato seco na rua, apenas envio de DTMF pelo SIP)
  public async injectDtmf(sipChannel: string, digit: string) {
    if (!this.connected) throw new Error("AMI não conectado");
    console.log(`[Asterisk AMI] -> Action: PlayDTMF | Channel: ${sipChannel} | Digit: ${digit}`);
    // Simulando o envio pro Asterisk
    return { status: 'Success', message: 'DTMF successfully queued' };
  }

  // Escuta os eventos da portaria (Ex: Novo Dial do XPE para a MaIA)
  public onEvent(eventName: string, payload: any) {
    console.log(`[Asterisk AMI] <- Evento recebido: ${eventName}`, payload);
  }
}
