import { crearEscena } from './Escena.js';

export function crearProyecto(nombre = 'Mi primer cómic') {
  const primera = crearEscena(1);
  return { version: 1, id: crypto.randomUUID(), nombre, escenas: [primera], recursos: [], escenaActualId: primera.id };
}

export function validarProyecto(obj) {
  if (!obj || obj.version !== 1 || typeof obj.nombre !== 'string' || !Array.isArray(obj.escenas) || !Array.isArray(obj.recursos)) {
    throw new Error('El proyecto no tiene una estructura compatible.');
  }
  if (!obj.escenas.length || obj.escenas.length > 500 || obj.recursos.length > 1000) {
    throw new Error('El proyecto no tiene una cantidad válida de escenas o recursos.');
  }
  for (const escena of obj.escenas) {
    if (!escena.id || !Array.isArray(escena.elementos) || !Array.isArray(escena.pistas)) {
      throw new Error('Una escena contiene datos incompletos.');
    }
  }
  return obj;
}

export function obtenerEscenaActual(proyecto) {
  return proyecto.escenas.find(e => e.id === proyecto.escenaActualId) || proyecto.escenas[0];
}
