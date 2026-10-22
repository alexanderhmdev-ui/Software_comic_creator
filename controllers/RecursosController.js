import { importarRecursos } from '../services/ImportadorRecursos.js';
import { crearElemento } from '../models/Elemento.js';
export class RecursosController {
  constructor(proyectoCtl) { this.control = proyectoCtl; }
  async importar(archivos, categoria) {
    const elementos = await importarRecursos(archivos, categoria);
    this.control.proyecto.recursos.push(...elementos); if (elementos.length) this.control.marcar();
    return elementos.length;
  }
  agregar(recurso) {
    const escena = this.control.actual();
    if (recurso.categoria === 'escenarios') escena.fondoId = recurso.id;
    else if (recurso.categoria === 'audio') escena.pistas.push({ recursoId: recurso.id, inicio: 0, volumen: 0.8 });
    else escena.elementos.push(crearElemento(recurso));
    this.control.marcar();
    return escena.elementos.at(-1);
  }
  eliminar(recursoId) {
    const p = this.control.proyecto;
    const recurso = p.recursos.find(item => item.id === recursoId);
    if (!recurso) return false;
    p.recursos = p.recursos.filter(item => item.id !== recursoId);
    for (const escena of p.escenas) {
      if (escena.fondoId === recursoId) escena.fondoId = null;
      escena.elementos = escena.elementos.filter(elemento => elemento.recursoId !== recursoId);
      escena.pistas = escena.pistas.filter(pista => pista.recursoId !== recursoId);
    }
    this.control.marcar();
    return true;
  }
}
