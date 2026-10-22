import { ajustarElemento } from '../models/Elemento.js';
export class EditorController {
  constructor(proyectoCtl, vista, onChange) {
    this.control = proyectoCtl; this.vista = vista; this.onChange = onChange; this.seleccionId = null; this.arrastre = null;
    vista.canvas.addEventListener('pointerdown', e => this.empezarArrastre(e));
    vista.canvas.addEventListener('pointermove', e => this.mover(e));
    vista.canvas.addEventListener('pointerup', () => this.terminarArrastre());
    vista.canvas.addEventListener('pointercancel', () => this.terminarArrastre());
  }
  elemento() { return this.control.actual().elementos.find(e => e.id === this.seleccionId); }
  empezarArrastre(evento) {
    const {x,y} = this.vista.posicion(evento);
    const elemento = [...this.control.actual().elementos].reverse().find(e => x >= e.x && x <= e.x + e.ancho && y >= e.y && y <= e.y + e.alto);
    this.seleccionId = elemento?.id || null;
    this.arrastre = elemento ? { dx: x - elemento.x, dy: y - elemento.y } : null;
    if (this.arrastre) this.vista.canvas.setPointerCapture(evento.pointerId);
    this.onChange();
  }
  mover(evento) {
    if (!this.arrastre) return;
    const {x,y} = this.vista.posicion(evento); const e = this.elemento(); if (!e) return;
    ajustarElemento(e,{x: Math.round(x - this.arrastre.dx), y: Math.round(y - this.arrastre.dy)});
    this.control.marcar(); this.vista.pintar(this.control.proyecto, this.control.actual(), this.seleccionId);
  }
  terminarArrastre() { if (this.arrastre) this.onChange(); this.arrastre = null; }
  actualizar(cambios) { const e = this.elemento(); if (e) { ajustarElemento(e,cambios); this.control.marcar(); this.onChange(); } }
  redimensionar(factor) {
    const e = this.elemento();
    if (!e) return;
    const anchoAnterior = e.ancho;
    const altoAnterior = e.alto;
    const ancho = Math.max(20, Math.round(anchoAnterior * factor));
    const alto = Math.max(20, Math.round(altoAnterior * factor));
    ajustarElemento(e, {
      ancho,
      alto,
      x: Math.round(e.x - (ancho - anchoAnterior) / 2),
      y: Math.round(e.y - (alto - altoAnterior) / 2)
    });
    this.control.marcar();
    this.onChange();
  }
  eliminar() { const escena = this.control.actual(); escena.elementos = escena.elementos.filter(e => e.id !== this.seleccionId); this.seleccionId = null; this.control.marcar(); this.onChange(); }
  limpiarSeleccion() { this.seleccionId = null; }
}
