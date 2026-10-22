export function crearEscena(numero = 1) {
  return { id: crypto.randomUUID(), nombre: `Escena ${numero}`, duracion: 5, fondoId: null, elementos: [], pistas: [] };
}
export function duplicarEscena(escena) {
  return { ...structuredClone(escena), id: crypto.randomUUID(), nombre: `${escena.nombre} (copia)`, elementos: escena.elementos.map(e => ({ ...e, id: crypto.randomUUID() })) };
}
