import { analizarGlobo, quitarBlancoExterior } from './AnalizadorGlobo.js';
import { ajustarTextoGlobo } from './TextoGlobo.js';

const cache = new Map();
const cacheTextos = new WeakMap();

function prepararGlobo(imagen) {
  const ancho = imagen.naturalWidth, alto = imagen.naturalHeight;
  if (!(ancho > 0 && alto > 0)) return null;
  const muestra = document.createElement('canvas');
  const escala = Math.min(1, 512 / Math.max(ancho, alto));
  muestra.width = Math.max(1, Math.round(ancho * escala));
  muestra.height = Math.max(1, Math.round(alto * escala));
  const ctx = muestra.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(imagen, 0, 0, muestra.width, muestra.height);
  const analisis = analizarGlobo(ctx.getImageData(0, 0, muestra.width, muestra.height).data, muestra.width, muestra.height);
  let limpia = imagen;
  if (analisis.quitarExterior) {
    // El análisis es pequeño; la copia visible conserva resolución para el video.
    limpia = document.createElement('canvas');
    const escalaLimpieza = Math.min(1, 2048 / Math.max(ancho, alto));
    limpia.width = Math.max(1, Math.round(ancho * escalaLimpieza));
    limpia.height = Math.max(1, Math.round(alto * escalaLimpieza));
    const ctxLimpio = limpia.getContext('2d', { willReadFrequently: true });
    ctxLimpio.drawImage(imagen, 0, 0, limpia.width, limpia.height);
    const pixeles = ctxLimpio.getImageData(0, 0, limpia.width, limpia.height);
    const datosLimpios = quitarBlancoExterior(pixeles.data, limpia.width, limpia.height);
    const area = analisis.areaTexto;
    const escalaX = limpia.width / muestra.width, escalaY = limpia.height / muestra.height;
    let conservaInterior = true;
    // Un borde muy fino puede verse cerrado en la muestra, pero abierto en la
    // imagen grande. En ese caso conservar el fondo evita borrar el relleno.
    for (let y = Math.ceil(area.y * escalaY); y < (area.y + area.alto) * escalaY && conservaInterior; y++) {
      for (let x = Math.ceil(area.x * escalaX); x < (area.x + area.ancho) * escalaX; x++) {
        const alfa = (y * limpia.width + x) * 4 + 3;
        if (pixeles.data[alfa] > 24 && datosLimpios[alfa] <= 24) { conservaInterior = false; break; }
      }
    }
    if (conservaInterior) {
      pixeles.data.set(datosLimpios);
      ctxLimpio.putImageData(pixeles, 0, 0);
    } else {
      limpia = imagen;
      analisis.quitarExterior = false;
      analisis.recorte = { x: 0, y: 0, ancho: muestra.width, alto: muestra.height };
    }
  }
  return {
    ...analisis, limpia,
    anchoMuestra: muestra.width, altoMuestra: muestra.height
  };
}

export async function cargarImagenes(proyecto) {
  const imagenes = proyecto.recursos.filter(r => r.categoria !== 'audio');
  await Promise.all(imagenes.map(recurso => new Promise(resolve => {
    const guardada = cache.get(recurso.id);
    if (guardada?.src === recurso.dataURL) return resolve();
    const imagen = new Image();
    imagen.onload = () => {
      let globo = null;
      // Un recurso extraño no debe impedir abrir el resto del proyecto.
      try { if (recurso.categoria === 'globos') globo = prepararGlobo(imagen); }
      catch (error) { console.warn('No se pudo analizar el globo; se conserva la imagen original.', error); }
      cache.set(recurso.id, { src: recurso.dataURL, imagen, globo });
      resolve();
    };
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
    const guardada = recurso && cache.get(recurso.id);
    const imagen = guardada?.imagen;
    if (!imagen) continue;
    let areaTexto;
    if (elemento.tipo === 'globos' && guardada.globo) {
      const globo = guardada.globo;
      const ajustarFondo = elemento.quitarFondoExterior !== false;
      const recorte = ajustarFondo ? globo.recorte : { x: 0, y: 0, ancho: globo.anchoMuestra, alto: globo.altoMuestra };
      const fuente = ajustarFondo ? globo.limpia : imagen;
      const escalaX = (fuente.naturalWidth || fuente.width) / globo.anchoMuestra;
      const escalaY = (fuente.naturalHeight || fuente.height) / globo.altoMuestra;
      ctx.drawImage(fuente, recorte.x * escalaX, recorte.y * escalaY, recorte.ancho * escalaX, recorte.alto * escalaY,
        elemento.x, elemento.y, elemento.ancho, elemento.alto);
      areaTexto = {
        x: elemento.x + (globo.areaTexto.x - recorte.x) / recorte.ancho * elemento.ancho,
        y: elemento.y + (globo.areaTexto.y - recorte.y) / recorte.alto * elemento.alto,
        ancho: globo.areaTexto.ancho / recorte.ancho * elemento.ancho,
        alto: globo.areaTexto.alto / recorte.alto * elemento.alto
      };
    } else {
      ctx.drawImage(imagen, elemento.x, elemento.y, elemento.ancho, elemento.alto);
    }
    if (elemento.tipo === 'globos' && elemento.texto) dibujarTexto(ctx, elemento, areaTexto);
    if (elemento.id === seleccionId) {
      ctx.save(); ctx.strokeStyle = '#2069dc'; ctx.lineWidth = 3;
      ctx.setLineDash([9, 5]); ctx.strokeRect(elemento.x, elemento.y, elemento.ancho, elemento.alto); ctx.restore();
    }
  }
}
function dibujarTexto(ctx, elemento, area = {
  x: elemento.x + elemento.ancho * .22, y: elemento.y + elemento.alto * .2,
  ancho: elemento.ancho * .56, alto: elemento.alto * .5
}) {
  let textos = cacheTextos.get(ctx);
  if (!textos) { textos = new WeakMap(); cacheTextos.set(ctx, textos); }
  let entrada = textos.get(elemento);
  if (!entrada || entrada.contenido !== elemento.texto || entrada.ancho !== area.ancho || entrada.alto !== area.alto) {
    entrada = {
      contenido: elemento.texto, ancho: area.ancho, alto: area.alto,
      ajuste: ajustarTextoGlobo(ctx, elemento.texto, { x: 0, y: 0, ancho: area.ancho, alto: area.alto })
    };
    textos.set(elemento, entrada);
  }
  // Reutilizar el ajuste durante arrastre, reproducción y exportación de video.
  const texto = entrada.ajuste;
  if (!texto.fuente) return;
  ctx.save();
  ctx.beginPath(); ctx.rect(area.x, area.y, area.ancho, area.alto); ctx.clip();
  ctx.font = `${texto.fuente}px Arial`;
  ctx.fillStyle = '#1b2540'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  texto.lineas.forEach((linea, i) => ctx.fillText(linea, area.x + texto.x, area.y + texto.y + i * texto.interlineado));
  ctx.restore();
}
