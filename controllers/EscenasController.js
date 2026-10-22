import { crearEscena, duplicarEscena } from '../models/Escena.js';
export class EscenasController {
  constructor(proyectoCtl) { this.control = proyectoCtl; }
  agregar() { const p = this.control.proyecto; const e = crearEscena(p.escenas.length + 1); p.escenas.push(e); p.escenaActualId = e.id; this.control.marcar(); return e; }
  seleccionar(id) { const p = this.control.proyecto; if (p.escenas.some(e => e.id === id)) p.escenaActualId = id; }
  duplicar(id) { const p = this.control.proyecto, indice = p.escenas.findIndex(e => e.id === id); if (indice < 0) return; const e = duplicarEscena(p.escenas[indice]); p.escenas.splice(indice+1,0,e); p.escenaActualId = e.id; this.control.marcar(); }
  eliminar(id) { const p = this.control.proyecto; if (p.escenas.length === 1) throw new Error('Debe existir al menos una escena.'); p.escenas = p.escenas.filter(e => e.id !== id); if (p.escenaActualId === id) p.escenaActualId = p.escenas[0].id; this.control.marcar(); }
  mover(id, offset) { const p = this.control.proyecto, i = p.escenas.findIndex(e => e.id === id), j = i + offset; if (i < 0 || j < 0 || j >= p.escenas.length) return; [p.escenas[i],p.escenas[j]] = [p.escenas[j],p.escenas[i]]; this.control.marcar(); }
}
