const INTERLINEADO = 1.2;
const FUENTE_MAXIMA = 20;

// Conserva los espacios y los saltos explícitos; una palabra larga también puede
// partirse entre caracteres Unicode sin cortar un par sustituto (por ejemplo, 😀).
function distribuirLineas(ctx, parrafos, ancho) {
  const lineas = [];
  for (const parrafo of parrafos) {
    const caracteres = Array.from(parrafo);
    if (!caracteres.length) {
      lineas.push('');
      continue;
    }
    let inicio = 0;
    while (inicio < caracteres.length) {
      let fin = inicio;
      let ultimoEspacio = inicio;
      let tentativa = '';
      while (fin < caracteres.length) {
        tentativa += caracteres[fin];
        if (ctx.measureText(tentativa).width > ancho) break;
        if (/\s/u.test(caracteres[fin])) ultimoEspacio = fin + 1;
        fin++;
      }
      if (fin === inicio) fin++;
      else if (fin < caracteres.length && ultimoEspacio > inicio) fin = ultimoEspacio;
      lineas.push(caracteres.slice(inicio, fin).join(''));
      inicio = fin;
    }
  }
  return lineas;
}

/**
 * Calcula texto centrado en un área segura sin dibujarlo ni modificar ctx.font.
 * El render debe usar fuente en píxeles con Arial, textAlign = 'center' y
 * textBaseline = 'middle'; y es el centro de la primera línea.
 * No impone una fuente mínima ni limita la cantidad de líneas o de caracteres.
 * Un área sin dimensiones válidas devuelve fuente 0 para indicar que no se pinta.
 */
export function ajustarTextoGlobo(ctx, texto, area) {
  const parrafos = String(texto ?? '').split(/\r\n|\r|\n/u);
  const { x, y, ancho, alto } = area;
  const centroX = Number.isFinite(x) && Number.isFinite(ancho) ? x + ancho / 2 : 0;
  const centroY = Number.isFinite(y) && Number.isFinite(alto) ? y + alto / 2 : 0;
  if (!(Number.isFinite(ancho) && Number.isFinite(alto) && ancho > 0 && alto > 0)) {
    return { lineas: parrafos, fuente: 0, interlineado: 0, x: centroX, y: centroY };
  }

  const fuenteAnterior = ctx.font;
  try {
    const medir = fuente => {
      ctx.font = `${fuente}px Arial`;
      const lineas = distribuirLineas(ctx, parrafos, ancho);
      const interlineado = fuente * INTERLINEADO;
      return {
        lineas, fuente, interlineado,
        cabe: lineas.length * interlineado <= alto &&
          lineas.every(linea => ctx.measureText(linea).width <= ancho)
      };
    };
    let superior = Math.min(FUENTE_MAXIMA, alto / INTERLINEADO);
    let resultado = medir(superior);
    if (!resultado.cabe) {
      let inferior = 0;
      let mejor = null;
      // La fuente puede bajar de 1 px para conservar todo el contenido incluso
      // cuando el estudiante reduce mucho el tamaño del globo.
      for (let intento = 0; intento < 48; intento++) {
        const fuente = (inferior + superior) / 2;
        const prueba = medir(fuente);
        if (prueba.cabe) {
          inferior = fuente;
          mejor = prueba;
        } else superior = fuente;
      }
      resultado = mejor ?? { lineas: parrafos, fuente: 0, interlineado: 0 };
    }
    return {
      lineas: resultado.lineas,
      fuente: resultado.fuente,
      interlineado: resultado.interlineado,
      x: centroX,
      y: centroY - (resultado.lineas.length - 1) * resultado.interlineado / 2
    };
  } finally {
    ctx.font = fuenteAnterior;
  }
}
