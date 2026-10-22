import test from 'node:test';
import assert from 'node:assert/strict';
import { duracionTotal, ubicarEscena, tiempoTexto } from '../models/LineaTiempo.js';
test('duración total suma las escenas', () => {
  const escenas = [{id:'uno',duracion:4},{id:'dos',duracion:6}];
  assert.equal(duracionTotal(escenas),10);
  assert.equal(ubicarEscena(escenas,5).escena.id,'dos');
  assert.equal(tiempoTexto(63),'1:03');
});
