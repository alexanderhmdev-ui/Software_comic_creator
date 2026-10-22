export class EscenasView {
  constructor(contenedor, opciones) { this.el = contenedor; this.opciones = opciones; }
  render(proyecto) {
    this.el.replaceChildren();
    proyecto.escenas.forEach((escena, i) => {
      const card = document.createElement('div'); card.className = 'escena-card' + (escena.id === proyecto.escenaActualId ? ' activa' : '');
      const titulo = document.createElement('button'); titulo.className = 'escena-titulo'; titulo.textContent = `${i + 1}. ${escena.nombre}`;
      titulo.addEventListener('click', () => this.opciones.seleccionar(escena.id));
      const tiempo = document.createElement('small'); tiempo.textContent = `${escena.duracion} s`;
      const herramientas = document.createElement('div'); herramientas.className = 'escena-controles';
      for (const [texto, tituloBoton, accion] of [['⧉','Duplicar escena',() => this.opciones.duplicar(escena.id)],['↑','Subir escena',() => this.opciones.mover(escena.id,-1)],['↓','Bajar escena',() => this.opciones.mover(escena.id,1)],['×','Eliminar escena',() => this.opciones.eliminar(escena.id)]]) {
        const btn = document.createElement('button'); btn.textContent = texto; btn.title = tituloBoton; btn.addEventListener('click', accion); herramientas.append(btn);
      }
      card.append(titulo, tiempo, herramientas); this.el.append(card);
    });
  }
}
