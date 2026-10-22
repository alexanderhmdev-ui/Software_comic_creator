const cache = new Map();
export async function cargarImagenes(proyecto) {
  const imagenes = proyecto.recursos.filter(r => r.categoria !== 'audio');
  await Promise.all(imagenes.map(recurso => new Promise(resolve => {
    const guardada = cache.get(recurso.id);
    if (guardada?.src === recurso.dataURL) return resolve();
    const imagen = new Image();
    imagen.onload = () => { cache.set(recurso.id, { src: recurso.dataURL, imagen }); resolve(); };
    imagen.onerror = resolve;
    imagen.src = recurso.dataURL;
  })));
}
export function pintarEscena(canvas, proyecto, escena, seleccionId = null) {
  const ctx = canvas.getContext('2d');
  const { width: ancho, height: alto } = canvas;
  ctx.clearRect(0, 0, ancho, alto);
  ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, ancho, alto);
  const fondo = proyecto.recursos.find(r => r.id === escena.fondoId);
  const imagenFondo = fondo && cache.get(fondo.id)?.imagen;
  if (imagenFondo) ctx.drawImage(imagenFondo, 0, 0, ancho, alto);
  if (!fondo) {
    ctx.fillStyle = '#71809a'; ctx.font = '24px Arial'; ctx.textAlign = 'center';
    ctx.fillText('Importa un escenario para comenzar', ancho / 2, alto / 2);
  }
  for (const elemento of escena.elementos) {
    const recurso = proyecto.recursos.find(r => r.id === elemento.recursoId);
    const imagen = recurso && cache.get(recurso.id)?.imagen;
    if (!imagen) continue;
    ctx.drawImage(imagen, elemento.x, elemento.y, elemento.ancho, elemento.alto);
    if (elemento.tipo === 'globos' && elemento.texto) dibujarTexto(ctx, elemento);
    if (elemento.id === seleccionId) {
      ctx.save(); ctx.strokeStyle = '#2069dc'; ctx.lineWidth = 3;
      ctx.setLineDash([9, 5]); ctx.strokeRect(elemento.x, elemento.y, elemento.ancho, elemento.alto); ctx.restore();
    }
  }
}
function dibujarTexto(ctx, elemento) {
  const maxWidth = Math.max(30, elemento.ancho - 36);
  const palabras = elemento.texto.split(/\s+/);
  ctx.save(); ctx.font = '20px Arial'; ctx.fillStyle = '#1b2540'; ctx.textAlign = 'center';
  const lineas = []; let linea = '';
  for (const palabra of palabras) {
    const tentativa = linea ? `${linea} ${palabra}` : palabra;
    if (ctx.measureText(tentativa).width > maxWidth && linea) { lineas.push(linea); linea = palabra; }
    else linea = tentativa;
  }
  if (linea) lineas.push(linea);
  lineas.slice(0, 7).forEach((l,i) => ctx.fillText(l, elemento.x + elemento.ancho / 2, elemento.y + 38 + i * 24));
  ctx.restore();
}
