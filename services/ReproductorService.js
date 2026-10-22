import { duracionTotal, ubicarEscena } from '../models/LineaTiempo.js';
export class ReproductorService {
  constructor(audio) { this.audio = audio; this.frame = null; this.activa = false; }
  iniciar(proyecto, enCuadro, enFin) {
    this.detener(); this.activa = true;
    const origen = performance.now(); const total = duracionTotal(proyecto.escenas);
    let escenaAnterior = null;
    const ciclo = ahora => {
      if (!this.activa) return;
      const segundo = (ahora - origen) / 1000;
      if (segundo >= total) { this.detener(); enFin?.(); return; }
      const { escena } = ubicarEscena(proyecto.escenas, segundo);
      if (escena?.id !== escenaAnterior) { this.audio.reproducirEscena(escena, proyecto); escenaAnterior = escena?.id; }
      enCuadro(escena, segundo);
      this.frame = requestAnimationFrame(ciclo);
    };
    this.frame = requestAnimationFrame(ciclo);
  }
  detener() { this.activa = false; if (this.frame !== null) cancelAnimationFrame(this.frame); this.frame = null; this.audio.detenerEscena(); }
}
