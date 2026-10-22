import { crearProyecto, obtenerEscenaActual } from '../models/Proyecto.js';
export class ProyectoController {
  constructor() { this.proyecto = crearProyecto(); this.handle = null; this.modificado = false; }
  actual() { return obtenerEscenaActual(this.proyecto); }
  marcar() { this.modificado = true; }
  reemplazar(proyecto) { this.proyecto = proyecto; this.handle = null; this.modificado = false; }
  nuevo() { this.reemplazar(crearProyecto()); }
  renombrar(nombre) { this.proyecto.nombre = String(nombre).slice(0,90) || 'Mi proyecto'; this.marcar(); }
}
