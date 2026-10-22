// El análisis trabaja con una muestra pequeña; sus coordenadas se expresan en
// píxeles de esa muestra. Nunca modifica los datos del recurso del estudiante.
const ALFA_VISIBLE = 24;

function validarDatos(datos, ancho, alto) {
  if (!Number.isInteger(ancho) || !Number.isInteger(alto) || ancho < 1 || alto < 1 || datos.length < ancho * alto * 4) {
    throw new TypeError('La imagen del globo debe tener dimensiones y píxeles válidos.');
  }
}

function mapaClaro(datos, cantidad) {
  const claro = new Uint8Array(cantidad);
  for (let i = 0; i < cantidad; i++) {
    const p = i * 4;
    const menor = Math.min(datos[p], datos[p + 1], datos[p + 2]);
    const mayor = Math.max(datos[p], datos[p + 1], datos[p + 2]);
    claro[i] = datos[p + 3] > ALFA_VISIBLE && menor >= 230 && mayor - menor <= 25 ? 1 : 0;
  }
  return claro;
}

function vecinos(indice, ancho, alto, visitar) {
  const x = indice % ancho;
  if (x > 0) visitar(indice - 1);
  if (x + 1 < ancho) visitar(indice + 1);
  if (indice >= ancho) visitar(indice - ancho);
  if (indice + ancho < ancho * alto) visitar(indice + ancho);
}

function marcarExterior(claro, ancho, alto) {
  const exterior = new Uint8Array(claro.length);
  const pendientes = new Int32Array(claro.length);
  let inicio = 0;
  let fin = 0;
  const visitar = indice => {
    if (claro[indice] && !exterior[indice]) {
      exterior[indice] = 1;
      pendientes[fin++] = indice;
    }
  };
  for (let x = 0; x < ancho; x++) {
    visitar(x);
    visitar((alto - 1) * ancho + x);
  }
  for (let y = 0; y < alto; y++) {
    visitar(y * ancho);
    visitar(y * ancho + ancho - 1);
  }
  // Los píxeles transparentes no son pasos válidos: así no se atraviesa
  // el fondo transparente de un PNG para alcanzar su relleno blanco.
  while (inicio < fin) vecinos(pendientes[inicio++], ancho, alto, visitar);
  return { exterior, cantidad: fin };
}

function mayorInterior(claro, exterior, ancho, alto) {
  const vistos = exterior.slice();
  const pendientes = new Int32Array(claro.length);
  let mayor = null;
  for (let semilla = 0; semilla < claro.length; semilla++) {
    if (!claro[semilla] || vistos[semilla]) continue;
    let inicio = 0;
    let fin = 1;
    let minX = ancho;
    let minY = alto;
    let maxX = -1;
    let maxY = -1;
    let tocaBorde = false;
    pendientes[0] = semilla;
    vistos[semilla] = 1;
    const visitar = indice => {
      if (claro[indice] && !vistos[indice]) {
        vistos[indice] = 1;
        pendientes[fin++] = indice;
      }
    };
    while (inicio < fin) {
      const indice = pendientes[inicio++];
      const x = indice % ancho;
      const y = Math.floor(indice / ancho);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      if (x === 0 || y === 0 || x === ancho - 1 || y === alto - 1) tocaBorde = true;
      vecinos(indice, ancho, alto, visitar);
    }
    // Descartar puntos claros pequeños (p. ej. huecos de letras) como si fueran
    // el cuerpo del globo. Un contorno abierto queda unido al exterior.
    const suficiente = fin >= Math.max(16, claro.length * 0.003) && maxX - minX >= 3 && maxY - minY >= 3;
    if (!tocaBorde && suficiente && (!mayor || fin > mayor.cantidad)) {
      mayor = {
        cantidad: fin,
        indices: pendientes.slice(0, fin),
        caja: { x: minX, y: minY, ancho: maxX - minX + 1, alto: maxY - minY + 1 }
      };
    }
  }
  return mayor;
}

function rellenarHuecos(interior, anchoImagen) {
  const caja = interior.caja;
  const mascara = new Uint8Array(caja.ancho * caja.alto);
  for (const indice of interior.indices) {
    const x = indice % anchoImagen - caja.x;
    const y = Math.floor(indice / anchoImagen) - caja.y;
    mascara[y * caja.ancho + x] = 1;
  }
  const exterior = new Uint8Array(mascara.length);
  const pendientes = new Int32Array(mascara.length);
  let inicio = 0;
  let fin = 0;
  const visitar = indice => {
    if (!mascara[indice] && !exterior[indice]) {
      exterior[indice] = 1;
      pendientes[fin++] = indice;
    }
  };
  for (let x = 0; x < caja.ancho; x++) {
    visitar(x); visitar((caja.alto - 1) * caja.ancho + x);
  }
  for (let y = 0; y < caja.alto; y++) {
    visitar(y * caja.ancho); visitar(y * caja.ancho + caja.ancho - 1);
  }
  while (inicio < fin) vecinos(pendientes[inicio++], caja.ancho, caja.alto, visitar);
  // Rellenar únicamente huecos encerrados evita que el texto ya impreso en la
  // imagen fragmente la zona de escritura. No borra ese texto del recurso.
  for (let i = 0; i < mascara.length; i++) if (!exterior[i]) mascara[i] = 1;
  return mascara;
}

function rectanguloInscrito(mascara, ancho, alto) {
  const alturas = new Uint32Array(ancho);
  let mejor = { x: 0, y: 0, ancho: 1, alto: 1 };
  let areaMayor = 0;
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) alturas[x] = mascara[y * ancho + x] ? alturas[x] + 1 : 0;
    const pila = [];
    for (let x = 0; x <= ancho; x++) {
      const altura = x === ancho ? 0 : alturas[x];
      while (pila.length && alturas[pila[pila.length - 1]] > altura) {
        const h = alturas[pila.pop()];
        const inicio = pila.length ? pila[pila.length - 1] + 1 : 0;
        const w = x - inicio;
        const area = h * w;
        if (area > areaMayor) {
          areaMayor = area;
          mejor = { x: inicio, y: y - h + 1, ancho: w, alto: h };
        }
      }
      pila.push(x);
    }
  }
  return mejor;
}

function recortarVisible(datos, ancho, alto, exterior) {
  let minX = ancho;
  let minY = alto;
  let maxX = -1;
  let maxY = -1;
  for (let i = 0; i < ancho * alto; i++) {
    if (datos[i * 4 + 3] <= ALFA_VISIBLE || exterior?.[i]) continue;
    const x = i % ancho;
    const y = Math.floor(i / ancho);
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  // Una imagen vacía conserva dimensiones finitas para que el renderizado
  // pueda seguir calculando escalas sin divisiones entre cero.
  return maxX < minX ? { x: 0, y: 0, ancho, alto } : {
    x: minX, y: minY, ancho: maxX - minX + 1, alto: maxY - minY + 1
  };
}

export function analizarGlobo(datos, ancho, alto) {
  validarDatos(datos, ancho, alto);
  const claro = mapaClaro(datos, ancho * alto);
  const { exterior, cantidad } = marcarExterior(claro, ancho, alto);
  const interior = mayorInterior(claro, exterior, ancho, alto);
  const quitarExterior = Boolean(interior && cantidad);
  const recorte = recortarVisible(datos, ancho, alto, quitarExterior ? exterior : null);
  let areaTexto;
  if (interior) {
    const caja = interior.caja;
    const rectangulo = rectanguloInscrito(rellenarHuecos(interior, ancho), caja.ancho, caja.alto);
    const margenX = rectangulo.ancho * 0.05;
    const margenY = rectangulo.alto * 0.05;
    areaTexto = {
      x: caja.x + rectangulo.x + margenX,
      y: caja.y + rectangulo.y + margenY,
      ancho: rectangulo.ancho - margenX * 2,
      alto: rectangulo.alto - margenY * 2
    };
  } else {
    areaTexto = {
      x: recorte.x + recorte.ancho * 0.22,
      y: recorte.y + recorte.alto * 0.18,
      ancho: recorte.ancho * 0.56,
      alto: recorte.alto * 0.5
    };
  }
  return { recorte, areaTexto, quitarExterior };
}

export function quitarBlancoExterior(datos, ancho, alto) {
  validarDatos(datos, ancho, alto);
  const copia = new Uint8ClampedArray(datos);
  const { exterior } = marcarExterior(mapaClaro(datos, ancho * alto), ancho, alto);
  for (let i = 0; i < exterior.length; i++) if (exterior[i]) copia[i * 4 + 3] = 0;
  return copia;
}
