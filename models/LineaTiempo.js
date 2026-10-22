export function duracionTotal(escenas) { return escenas.reduce((total, e) => total + Math.max(1, Number(e.duracion) || 1), 0); }
export function ubicarEscena(escenas, segundo) {
  let inicio = 0;
  for (const escena of escenas) {
    const fin = inicio + Math.max(1, Number(escena.duracion) || 1);
    if (segundo < fin) return { escena, inicio, segundoLocal: Math.max(0, segundo - inicio) };
    inicio = fin;
  }
  return { escena: escenas.at(-1), inicio, segundoLocal: 0 };
}
export function tiempoTexto(segundos) {
  segundos = Math.max(0, Math.floor(segundos));
  return `${Math.floor(segundos / 60)}:${String(segundos % 60).padStart(2,'0')}`;
}
