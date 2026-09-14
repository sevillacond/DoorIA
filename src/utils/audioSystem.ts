/**
 * Enlace-DoorIA - Sistema de Síntese de Áudio e Telecomunicações
 * Padrão ITU-T / Telebrás para sinalização acústica nacional e DTMF
 */

class AudioSystem {
  private ctx: AudioContext | null = null;
  private ringOscillator: OscillatorNode | null = null;
  private ringGain: GainNode | null = null;
  private isRinging: boolean = false;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Toca Tom de Chamada (Ringback Tone Padrão Brasileiro: 425Hz)
   */
  public startRingTone(): void {
    if (this.isRinging) return;
    const ctx = this.getContext();
    if (!ctx) return;

    this.isRinging = true;

    const playRingCycle = () => {
      if (!this.isRinging) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(425, ctx.currentTime); // 425Hz padrão telecom BR

      gain.gain.setValueAtTime(0, ctx.currentTime);
      // Fade-in e Fade-out de 1 segundo de toque
      gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.2, ctx.currentTime + 0.95);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.0);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 1.0);

      if (this.isRinging) {
        setTimeout(playRingCycle, 4000); // Ciclo Telebrás: 1s som, 4s silêncio
      }
    };

    playRingCycle();
  }

  public stopRingTone(): void {
    this.isRinging = false;
  }

  /**
   * Toca frequência DTMF Dual-Tone exata (Padrão ITU-T Q.23)
   */
  public playDtmf(digit: string): void {
    const ctx = this.getContext();
    if (!ctx) return;

    // Frequências DTMF padrão
    const frequencies: { [key: string]: [number, number] } = {
      '1': [697, 1209],
      '2': [697, 1336],
      '3': [697, 1477],
      '4': [770, 1209],
      '5': [770, 1336],
      '6': [770, 1477],
      '7': [852, 1209],
      '8': [852, 1336],
      '9': [852, 1477],
      '*': [941, 1209],
      '0': [941, 1336],
      '#': [941, 1477],
    };

    const freqs = frequencies[digit] || [941, 1336];

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.frequency.value = freqs[0];
    osc2.frequency.value = freqs[1];

    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start();
    osc2.start();

    osc1.stop(ctx.currentTime + 0.2);
    osc2.stop(ctx.currentTime + 0.2);
  }

  /**
   * Som de acionamento do relé eletromecânico e fechadura eletroímã
   */
  public playRelayClick(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.4, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.09);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.1);

    // Segundo clique (desarme mecânico do solenóide)
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(180, ctx.currentTime);
      osc2.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.07);
      gain2.gain.setValueAtTime(0.3, ctx.currentTime);
      gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start();
      osc2.stop(ctx.currentTime + 0.09);
    }, 120);
  }

  /**
   * Tom de encerramento da chamada (Busy tone / Call terminated)
   */
  public playHangupTone(): void {
    const ctx = this.getContext();
    if (!ctx) return;

    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(425, ctx.currentTime);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.25);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }, i * 500);
    }
  }

  /**
   * URA MaIA Text-To-Speech (Voz Humana e Feminina em Português Brasileiro)
   */
  public speakUra(text: string): void {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    window.speechSynthesis.cancel(); // Interrompe fala anterior se houver

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0; // Cadência mais natural e humanizada
    utterance.pitch = 1.15; // Levemente mais agudo para um tom mais suave/feminino

    // Tenta encontrar uma voz em pt-BR natural, priorizando vozes femininas conhecidas
    const voices = window.speechSynthesis.getVoices();
    const ptVoices = voices.filter((v) => v.lang.startsWith('pt') || v.lang.includes('BR'));
    
    const femaleVoice = ptVoices.find((v) => 
      v.name.includes('Google') || 
      v.name.includes('Francisca') || 
      v.name.includes('Maria') || 
      v.name.includes('Luciana') || 
      v.name.includes('Vitoria') ||
      v.name.includes('Raquel') ||
      v.name.includes('Heloisa') ||
      v.name.includes('Leticia') ||
      v.name.includes('Yara') ||
      v.name.includes('Female') ||
      v.name.includes('Feminina')
    ) || ptVoices[0];

    if (femaleVoice) {
      utterance.voice = femaleVoice;
    }

    window.speechSynthesis.speak(utterance);
  }
}

export const audioSystem = new AudioSystem();
