import { duracionTotal, tiempoTexto } from '../../models/LineaTiempo.js';
export class TimelineView {
  constructor(contenedor, alElegir) { this.el = contenedor; this.alElegir = alElegir; }
  render(proyecto) {
    this.el.replaceChildren();
    const total = duracionTotal(proyecto.escenas);
    document.getElementById('tiempoTotal').textContent = `Total: ${tiempoTexto(total)}`;
    proyecto.escenas.forEach((escena, indice) => {
      const bloque = document.createElement('button'); bloque.className = 'timeline-bloque' + (escena.id === proyecto.escenaActualId ? ' marcado' : '');
      bloque.style.flexGrow = String(escena.duracion); bloque.textContent = `E${indice + 1} · ${escena.duracion}s`;
      bloque.title = escena.nombre; bloque.addEventListener('click', () => this.alElegir(escena.id)); this.el.append(bloque);
    });
  }
}
