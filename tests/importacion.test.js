import test from 'node:test';
import assert from 'node:assert/strict';
import { validarArchivo, extensionMime } from '../models/Recurso.js';
test('permite imagen PNG en escenarios', () => {
  assert.doesNotThrow(() => validarArchivo({ type: 'image/png', name: 'fondo.png', size: 12345 }, 'escenarios'));
});
test('rechaza extensiones disfrazadas y archivos mayores a 20 MB', () => {
  assert.throws(() => validarArchivo({ type: 'text/html', name: 'fondo.html', size: 100 }, 'escenarios'));
  assert.throws(() => validarArchivo({ type: 'audio/mpeg', name: 'audio.mp3', size: 30 * 1024 * 1024 }, 'audio'));
});
test('reconoce extensión por MIME', () => assert.equal(extensionMime('audio/mpeg'), 'mp3'));
