import test from 'node:test';
import assert from 'node:assert/strict';
import { ajustarTextoGlobo } from '../services/TextoGlobo.js';

function contexto() {
  return {
    font: '12px Arial',
    measureText(texto) {
      return { width: Array.from(texto).length * Number.parseFloat(this.font) * 0.6 };
    }
  };
}

function comprobarLimites(ctx, resultado, area) {
  ctx.font = `${resultado.fuente}px Arial`;
  assert.ok(resultado.fuente > 0 && resultado.fuente <= 20);
  for (const linea of resultado.lineas) {
    assert.ok(ctx.measureText(linea).width <= area.ancho, `Línea fuera del área: ${linea}`);
  }
  assert.ok(resultado.lineas.length * resultado.interlineado <= area.alto);
  const centroUltima = resultado.y + (resultado.lineas.length - 1) * resultado.interlineado;
  assert.ok(resultado.y - resultado.interlineado / 2 >= area.y - 1e-9);
  assert.ok(centroUltima + resultado.interlineado / 2 <= area.y + area.alto + 1e-9);
  assert.equal(resultado.x, area.x + area.ancho / 2);
  assert.ok(Math.abs((resultado.y + centroUltima) / 2 - (area.y + area.alto / 2)) < 1e-9);
}

test('centra un mensaje breve y conserva la fuente original del contexto', () => {
  const ctx = contexto();
  const area = { x: 40, y: 15, ancho: 200, alto: 70 };
  const resultado = ajustarTextoGlobo(ctx, 'Hola, Ana', area);
  assert.deepEqual(resultado.lineas, ['Hola, Ana']);
  assert.equal(resultado.fuente, 20);
  assert.equal(resultado.y, 50);
  assert.equal(ctx.font, '12px Arial');
  comprobarLimites(ctx, resultado, area);
});

test('parte una palabra sin espacios y no pierde caracteres Unicode', () => {
  const ctx = contexto();
  const area = { x: 0, y: 0, ancho: 75, alto: 80 };
  const texto = 'dijgkfjgksljglskgjkfsgilgksj😀ñ漢字😀abcdefghijklmn';
  const resultado = ajustarTextoGlobo(ctx, texto, area);
  assert.ok(resultado.lineas.length > 1);
  assert.equal(resultado.lineas.join(''), texto);
  assert.ok(resultado.lineas.every(linea => !/^[\uDC00-\uDFFF]|[\uD800-\uDBFF]$/u.test(linea)));
  comprobarLimites(ctx, resultado, area);
});

test('encaja todos los 400 caracteres de un mensaje sin truncar líneas', () => {
  const ctx = contexto();
  const area = { x: 100, y: 60, ancho: 140, alto: 70 };
  const texto = 'Esta es una conversación larga, con palabras. '.repeat(10).slice(0, 400);
  const resultado = ajustarTextoGlobo(ctx, texto, area);
  assert.equal(resultado.lineas.join(''), texto);
  assert.ok(resultado.fuente < 20);
  comprobarLimites(ctx, resultado, area);
});

test('respeta párrafos vacíos y saltos de línea finales con CRLF o LF', () => {
  const ctx = contexto();
  const area = { x: 5, y: 10, ancho: 250, alto: 160 };
  const resultado = ajustarTextoGlobo(ctx, 'Hola\r\n\r\n¿Todo bien?\n', area);
  assert.deepEqual(resultado.lineas, ['Hola', '', '¿Todo bien?', '']);
  comprobarLimites(ctx, resultado, area);
});

test('reduce por debajo de 1 px en un área pequeña y conserva el texto entero', () => {
  const ctx = contexto();
  const area = { x: 0, y: 0, ancho: 4, alto: 3 };
  const texto = 'a'.repeat(400);
  const resultado = ajustarTextoGlobo(ctx, texto, area);
  assert.equal(resultado.lineas.join(''), texto);
  assert.ok(resultado.fuente < 1);
  comprobarLimites(ctx, resultado, area);
});

test('un área sin tamaño señala que no puede dibujarse sin perder su contenido', () => {
  const ctx = contexto();
  const resultado = ajustarTextoGlobo(ctx, 'Hola\nMundo', { x: 5, y: 8, ancho: 0, alto: 30 });
  assert.deepEqual(resultado.lineas, ['Hola', 'Mundo']);
  assert.equal(resultado.fuente, 0);
  assert.equal(resultado.interlineado, 0);
  assert.equal(ctx.font, '12px Arial');
});

test('conserva espacios consecutivos y cada palabra al ajustar muchas líneas', () => {
  const ctx = contexto();
  const texto = 'Uno  dos   tres cuatro cinco seis siete ocho nueve diez';
  const area = { x: 25, y: 45, ancho: 64, alto: 150 };
  const resultado = ajustarTextoGlobo(ctx, texto, area);
  assert.equal(resultado.lineas.join(''), texto);
  comprobarLimites(ctx, resultado, area);
});
