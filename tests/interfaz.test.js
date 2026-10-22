import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AppController } from '../controllers/AppController.js';

// DOM mínimo para comprobar el arranque y los eventos sin un navegador.
class Nodo {
  constructor() {
    this.children = []; this.eventos = {}; this.dataset = {}; this.style = {};
    this.classList = { toggle() {}, add() {}, remove() {} };
    this.width = 960; this.height = 540;
  }
  addEventListener(tipo, accion) { this.eventos[tipo] = accion; }
  append(...nodos) { this.children.push(...nodos); }
  replaceChildren(...nodos) { this.children = nodos; }
  click() { this.pulsado = true; return this.eventos.click?.({ target: this }); }
  remove() {}
  getContext() { return { clearRect() {}, fillRect() {}, fillText() {} }; }
}

test('el editor inicia, cambia de pestaña, importa y enlaza las acciones del proyecto', async t => {
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const nodos = new Map([...html.matchAll(/id="([^"]+)"/g)].map(([, id]) => [id, new Nodo()]));
  const tabs = ['escenarios', 'personajes', 'globos', 'audio'].map(categoria => {
    const nodo = new Nodo(); nodo.dataset.tab = categoria; return nodo;
  });
  const documento = {
    getElementById: id => nodos.get(id), createElement: () => new Nodo(),
    querySelectorAll: () => tabs, addEventListener() {}, body: new Nodo()
  };
  t.mock.method(globalThis, 'setTimeout', () => 0);
  const originales = ['document', 'window', 'FileReader', 'Image', 'confirm'].map(clave => [clave, Object.getOwnPropertyDescriptor(globalThis, clave)]);
  t.after(() => originales.forEach(([clave, descriptor]) => {
    if (descriptor) Object.defineProperty(globalThis, clave, descriptor);
    else delete globalThis[clave];
  }));
  globalThis.document = documento;
  globalThis.window = { addEventListener() {} };
  globalThis.confirm = () => false;
  globalThis.Image = class {
    set src(valor) { this.onload(); }
  };
  globalThis.FileReader = class {
    readAsDataURL() { this.result = 'data:image/png;base64,YQ=='; this.onload(); }
  };
  const app = new AppController();
  assert.equal(nodos.get('escenasListado').children.length, 1);
  assert.equal(nodos.get('timeline').children.length, 1);
  assert.match(nodos.get('recursosListado').children[0].textContent, /Importa archivos/);

  for (const tab of tabs) {
    nodos.get('pestanasRecursos').eventos.click({ target: { closest: () => tab } });
    assert.equal(app.tabActual, tab.dataset.tab);
  }
  nodos.get('pestanasRecursos').eventos.click({ target: { closest: () => tabs[1] } });
  nodos.get('importarBtn').click();
  assert.equal(nodos.get('importarInput').pulsado, true);
  assert.match(nodos.get('importarInput').accept, /image\/png/);
  await nodos.get('importarInput').eventos.change({ target: {
    files: [{ name: 'personaje.png', type: 'image/png', size: 1 }], value: 'personaje.png'
  } });
  assert.equal(app.p.recursos.length, 1);
  assert.equal(app.p.recursos[0].categoria, 'personajes');
  assert.equal(nodos.get('recursosListado').children[0].children[0].src, 'data:image/png;base64,YQ==');

  nodos.get('abrirBtn').click();
  assert.equal(nodos.get('abrirInput').pulsado, true);
  const proyectoConCambios = app.p;
  nodos.get('nuevoBtn').click();
  assert.equal(app.p, proyectoConCambios, 'cancelar Nuevo conserva el trabajo');
  globalThis.confirm = () => true;
  nodos.get('nuevoBtn').click();
  assert.notEqual(app.p, proyectoConCambios);

  const modos = [];
  app.guardar = async como => modos.push(como);
  await nodos.get('guardarBtn').click();
  await nodos.get('guardarComoBtn').click();
  assert.deepEqual(modos, [false, true]);
});
