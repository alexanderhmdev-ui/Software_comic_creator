export function crearElemento(recurso) {
  return {
    id: crypto.randomUUID(), recursoId: recurso.id, tipo: recurso.categoria,
    x: 360, y: 170, ancho: recurso.categoria === 'globos' ? 270 : 170,
    alto: recurso.categoria === 'globos' ? 145 : 230, texto: ''
  };
}
export function ajustarElemento(elemento, cambios) {
  for (const nombre of ['x','y','ancho','alto']) {
    if (nombre in cambios) {
      const valor = Number(cambios[nombre]);
      if (!Number.isFinite(valor)) throw new Error('Las dimensiones deben ser números válidos.');
      elemento[nombre] = nombre === 'ancho' || nombre === 'alto' ? Math.max(20, valor) : valor;
    }
  }
  if ('texto' in cambios) elemento.texto = String(cambios.texto).slice(0, 400);
  return elemento;
}
