import test from 'node:test';
import assert from 'node:assert/strict';
import { analizarGlobo, quitarBlancoExterior } from '../services/AnalizadorGlobo.js';

function imagen(ancho, alto, pintar) {
  const datos = new Uint8ClampedArray(ancho * alto * 4);
  for (let y = 0; y < alto; y++) {
    for (let x = 0; x < ancho; x++) datos.set(pintar(x, y), (y * ancho + x) * 4);
  }
  return datos;
}
const blanco = [255, 255, 255, 255];
const negro = [20, 20, 20, 255];
const transparente = [0, 0, 0, 0];
const alfa = (datos, ancho, x, y) => datos[(y * ancho + x) * 4 + 3];

test('un globo JPEG cerrado pierde el exterior y conserva su relleno y contorno', () => {
  const ancho = 100;
  const alto = 70;
  const datos = imagen(ancho, alto, (x, y) => {
    if (x >= 20 && x <= 79 && y >= 15 && y <= 54 && (x <= 21 || x >= 78 || y <= 16 || y >= 53)) return negro;
    return [246, 244, 242, 255]; // Blanco con pequeñas variaciones propias de JPEG.
  });
  const originales = datos.slice();
  const analisis = analizarGlobo(datos, ancho, alto);
  assert.equal(analisis.quitarExterior, true);
  assert.deepEqual(analisis.recorte, { x: 20, y: 15, ancho: 60, alto: 40 });
  const limpia = quitarBlancoExterior(datos, ancho, alto);
  assert.equal(alfa(limpia, ancho, 0, 0), 0);
  assert.equal(alfa(limpia, ancho, 50, 35), 255);
  assert.equal(alfa(limpia, ancho, 20, 30), 255);
  assert.deepEqual(datos, originales, 'el recurso original no cambia');
  assert.ok(analisis.areaTexto.x > 22 && analisis.areaTexto.y > 17);
});

test('el relleno blanco sin contorno sobre un PNG transparente permanece opaco', () => {
  const ancho = 100;
  const alto = 80;
  const dentro = (x, y) => ((x - 50) / 30) ** 2 + ((y - 35) / 20) ** 2 <= 1;
  const datos = imagen(ancho, alto, (x, y) => dentro(x, y) ? blanco : transparente);
  const analisis = analizarGlobo(datos, ancho, alto);
  assert.equal(analisis.quitarExterior, false);
  assert.deepEqual(analisis.recorte, { x: 20, y: 15, ancho: 61, alto: 41 });
  const limpia = quitarBlancoExterior(datos, ancho, alto);
  assert.equal(alfa(limpia, ancho, 50, 35), 255);
  assert.equal(alfa(limpia, ancho, 0, 0), 0);
  const caja = analisis.areaTexto;
  for (const x of [caja.x, caja.x + caja.ancho]) {
    for (const y of [caja.y, caja.y + caja.alto]) assert.ok(dentro(x, y), 'las esquinas caben en el óvalo');
  }
});

test('un contorno abierto conserva el fondo al no tener un interior fiable', () => {
  const ancho = 80;
  const alto = 60;
  const datos = imagen(ancho, alto, (x, y) => {
    const borde = x >= 10 && x <= 69 && y >= 10 && y <= 49 && (x === 10 || x === 69 || y === 10 || y === 49);
    return borde && !(x === 10 && y === 30) ? negro : blanco;
  });
  const analisis = analizarGlobo(datos, ancho, alto);
  assert.equal(analisis.quitarExterior, false);
  assert.deepEqual(analisis.recorte, { x: 0, y: 0, ancho, alto });
});

test('la caja inscrita evita la cola y no se fragmenta por texto impreso', () => {
  const ancho = 100;
  const alto = 100;
  const datos = imagen(ancho, alto, (x, y) => {
    const cuerpo = x >= 15 && x <= 84 && y >= 10 && y <= 59;
    const cola = y >= 60 && y <= 85 && x >= 40 && x <= 47;
    if (!cuerpo && !cola) return transparente;
    if (x >= 35 && x <= 64 && y >= 25 && y <= 34) return negro;
    return blanco;
  });
  const { areaTexto } = analizarGlobo(datos, ancho, alto);
  assert.ok(areaTexto.ancho > 60, 'rellenar el hueco impreso conserva una caja amplia');
  assert.ok(areaTexto.y + areaTexto.alto < 60, 'la caja permanece en el cuerpo');
  assert.ok(areaTexto.x > 15 && areaTexto.y > 10, 'el texto tiene margen');
});

test('imágenes blancas, transparentes y mínimas producen zonas finitas sin quitar todo', () => {
  for (const [ancho, alto] of [[64, 40], [1, 1]]) {
    for (const color of [blanco, transparente]) {
      const datos = imagen(ancho, alto, () => color);
      const resultado = analizarGlobo(datos, ancho, alto);
      assert.equal(resultado.quitarExterior, false);
      assert.deepEqual(resultado.recorte, { x: 0, y: 0, ancho, alto });
      for (const valor of Object.values(resultado.areaTexto)) assert.ok(Number.isFinite(valor));
      assert.ok(resultado.areaTexto.ancho > 0 && resultado.areaTexto.alto > 0);
    }
  }
});

test('la limpieza respeta colores y píxeles transparentes como barrera', () => {
  const datos = imagen(30, 30, (x, y) => {
    if (x === 0 || y === 0 || x === 29 || y === 29) return blanco;
    if (x >= 8 && x <= 21 && y >= 8 && y <= 21) return blanco;
    return transparente;
  });
  const limpia = quitarBlancoExterior(datos, 30, 30);
  assert.equal(alfa(limpia, 30, 0, 0), 0);
  assert.equal(alfa(limpia, 30, 15, 15), 255, 'no atraviesa la franja transparente');
  const azules = imagen(10, 10, () => [220, 240, 255, 255]);
  assert.deepEqual(quitarBlancoExterior(azules, 10, 10), azules);
});
