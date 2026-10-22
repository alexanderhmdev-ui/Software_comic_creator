export class MotorAudio {
  constructor() { this.prev = null; this.active = []; }
  detenerPrevio() { if (this.prev) { this.prev.pause(); this.prev.currentTime = 0; this.prev = null; } }
  async alternarPrevio(recurso) {
    if (this.prev?.dataset.recurso === recurso.id) { this.detenerPrevio(); return false; }
    this.detenerPrevio();
    const audio = new Audio(recurso.dataURL);
    audio.dataset.recurso = recurso.id;
    audio.onended = () => { if (this.prev === audio) this.prev = null; };
    this.prev = audio;
    await audio.play(); return true;
  }
  detenerEscena() { for (const a of this.active) { a.pause(); a.currentTime = 0; } this.active = []; }
  reproducirEscena(escena, proyecto) {
    this.detenerPrevio(); this.detenerEscena();
    escena.pistas.forEach(pista => {
      const recurso = proyecto.recursos.find(r => r.id === pista.recursoId && r.categoria === 'audio');
      if (!recurso) return;
      const a = new Audio(recurso.dataURL); a.volume = Math.min(1, Math.max(0, pista.volumen ?? 0.8));
      a.play().catch(() => {}); this.active.push(a);
    });
  }
}
