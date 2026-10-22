import test from 'node:test';
import assert from 'node:assert/strict';
import { crearProyecto, validarProyecto } from '../models/Proyecto.js';
import { crearEscena, duplicarEscena } from '../models/Escena.js';
test('un proyecto inicia con una escena, sin recursos', () => {
  const p = crearProyecto('Historia');
  assert.equal(p.nombre, 'Historia'); assert.equal(p.escenas.length, 1); assert.equal(p.recursos.length, 0);
  assert.deepEqual(validarProyecto(structuredClone(p)), p);
});
test('duplicar una escena crea ids independientes', () => {
  const e = crearEscena(1); e.elementos.push({id: crypto.randomUUID(), x: 10});
  const copia = duplicarEscena(e);
  assert.notEqual(copia.id, e.id); assert.notEqual(copia.elementos[0].id, e.elementos[0].id);
});
