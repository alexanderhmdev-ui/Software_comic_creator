import { cargarImagenes, pintarEscena } from '../../services/RenderCanvas.js';
export class EditorView {
  constructor(canvas) { this.canvas = canvas; this.pintado = 0; }
  async render(proyecto, escena, seleccion = null) {
    const turno = ++this.pintado;
    await cargarImagenes(proyecto);
    if (turno === this.pintado) pintarEscena(this.canvas, proyecto, escena, seleccion);
  }
  pintar(proyecto, escena, seleccion = null) { pintarEscena(this.canvas, proyecto, escena, seleccion); }
  posicion(evento) {
    const caja = this.canvas.getBoundingClientRect();
    return { x: (evento.clientX - caja.left) * this.canvas.width / caja.width, y: (evento.clientY - caja.top) * this.canvas.height / caja.height };
  }
}
