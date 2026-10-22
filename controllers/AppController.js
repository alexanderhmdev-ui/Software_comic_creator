import { ProyectoController } from './ProyectoController.js';
import { RecursosController } from './RecursosController.js';
import { EscenasController } from './EscenasController.js';
import { TimelineController } from './TimelineController.js';
import { EditorController } from './EditorController.js';
import { ExportacionController } from './ExportacionController.js';
import { EditorView } from '../vendor/views/EditorView.js';
import { RecursosView } from '../vendor/views/RecursosView.js';
import { EscenasView } from '../vendor/views/EscenasView.js';
import { TimelineView } from '../vendor/views/TimelineView.js';
import { vistaConfiguracion } from '../vendor/views/ConfiguracionView.js';
import { mensajeGuardado } from '../vendor/views/GuardadoView.js';
import { MotorAudio } from '../services/MotorAudio.js';
import { ReproductorService } from '../services/ReproductorService.js';
import { abrirArchivoProyecto, crearArchivoProyecto, guardarBlob, guardarConHandle, nombreProyectoArchivo } from '../services/ArchivoProyectoService.js';

export class AppController {
  constructor() {
    this.proyectos = new ProyectoController();
    this.recursos = new RecursosController(this.proyectos);
    this.escenas = new EscenasController(this.proyectos);
    this.timeline = new TimelineController(this.proyectos);
    this.audio = new MotorAudio();
    this.reproductor = new ReproductorService(this.audio);
    this.exportacion = new ExportacionController(this.proyectos);
    this.editorView = new EditorView(document.getElementById('lienzo'));
    this.editor = new EditorController(this.proyectos, this.editorView, () => this.render());
    this.tabActual = 'escenarios';
    this.recursosView = new RecursosView(document.getElementById('recursosListado'),
      recurso => this.proteger(() => { this.recursos.agregar(recurso); this.render(); this.notificar('Recurso agregado a la escena.'); }),
      recurso => this.previsualizarAudio(recurso),
      recurso => this.proteger(() => {
        if (!confirm(`¿Eliminar "${recurso.nombre}"? También se quitará de las escenas donde se use.`)) return;
        if (recurso.categoria === 'audio') this.audio.detenerPrevio();
        this.recursos.eliminar(recurso.id);
        this.editor.limpiarSeleccion();
        this.render();
        this.notificar('Recurso eliminado.');
      }));
    this.escenasView = new EscenasView(document.getElementById('escenasListado'), {
      seleccionar: id => this.proteger(() => this.seleccionarEscena(id)),
      duplicar: id => this.proteger(() => { this.escenas.duplicar(id); this.render(); }),
      eliminar: id => this.proteger(() => { this.escenas.eliminar(id); this.editor.limpiarSeleccion(); this.render(); }),
      mover: (id, dir) => this.proteger(() => { this.escenas.mover(id, dir); this.render(); })
    });
    this.timelineView = new TimelineView(document.getElementById('timeline'), id => this.seleccionarEscena(id));
    this.enlazar(); this.render();
  }
  get p() { return this.proyectos.proyecto; }
  notificar(mensaje, error = false) { const m = document.getElementById('mensaje'); m.textContent = mensaje; m.classList.toggle('mensaje-error', error); }
  async proteger(accion) { try { await accion(); } catch (error) { console.error(error); this.notificar(error.message || 'Ha ocurrido un error.', true); } }
  enlazar() {
    const $ = id => document.getElementById(id);
    $('nombreProyecto').addEventListener('change', e => { this.proyectos.renombrar(e.target.value); this.render(); });
    $('pestanasRecursos').addEventListener('click', e => {
      const btn = e.target.closest('[data-tab]'); if (!btn) return;
      this.tabActual = btn.dataset.tab;
      document.querySelectorAll('[data-tab]').forEach(item => item.classList.toggle('active', item === btn));
      this.recursosView.render(this.p, this.tabActual);
    });
    $('importarBtn').addEventListener('click', () => {
      const input = $('importarInput'); input.accept = this.tabActual === 'audio' ? 'audio/*' : 'image/png,image/jpeg,image/webp,image/gif'; input.click();
    });
    $('importarInput').addEventListener('change', e => this.proteger(async () => {
      const cantidad = await this.recursos.importar([...e.target.files], this.tabActual);
      e.target.value = ''; this.render(); this.notificar(`${cantidad} recurso(s) importado(s).`);
    }));
    $('agregarEscenaBtn').addEventListener('click', () => { this.escenas.agregar(); this.editor.limpiarSeleccion(); this.render(); });
    $('guardarBtn').addEventListener('click', () => this.proteger(() => this.guardar(false)));
    $('guardarComoBtn').addEventListener('click', () => this.proteger(() => this.guardar(true)));
    $('abrirBtn').addEventListener('click', () => $('abrirInput').click());
    $('abrirInput').addEventListener('change', e => this.proteger(async () => {
      const archivo = e.target.files?.[0]; if (!archivo) return;
      if (this.proyectos.modificado && !confirm('Se reemplazará el trabajo actual sin guardar. ¿Continuar?')) return;
      this.reproductor.detener(); this.audio.detenerPrevio();
      const p = await abrirArchivoProyecto(archivo);
      this.proyectos.reemplazar(p); this.editor.limpiarSeleccion(); this.render(); this.notificar(mensajeGuardado('abrir')); e.target.value = '';
    }));
    $('nuevoBtn').addEventListener('click', () => {
      if (this.proyectos.modificado && !confirm('Tienes cambios sin guardar. ¿Crear un proyecto nuevo?')) return;
      this.reproductor.detener(); this.audio.detenerPrevio(); this.proyectos.nuevo(); this.editor.limpiarSeleccion(); this.render(); this.notificar(mensajeGuardado('nuevo'));
    });
    $('previsualizarBtn').addEventListener('click', () => this.proteger(async () => {
      await this.editorView.render(this.p, this.p.escenas[0]);
      this.reproductor.iniciar(this.p, (escena, segundos) => {
        this.editorView.pintar(this.p, escena);
        $('escenaActivaNombre').textContent = `Reproduciendo: ${escena.nombre} (${segundos.toFixed(1)} s)`;
      }, () => this.finalizarReproduccion());
      $('previsualizarBtn').disabled = true; $('detenerBtn').disabled = false;
    }));
    $('detenerBtn').addEventListener('click', () => this.finalizarReproduccion());
    $('exportarBtn').addEventListener('click', () => this.proteger(async () => {
      this.finalizarReproduccion(); $('exportarBtn').disabled = true;
      this.notificar('Exportando video en tiempo real. Mantén esta pestaña visible.');
      try { await this.exportacion.exportar(n => this.notificar(`Exportando video… ${n}%`)); this.notificar('Video generado. Selecciona dónde guardarlo.'); }
      finally { $('exportarBtn').disabled = false; this.render(); }
    }));
    $('configurarBtn').addEventListener('click', () => this.abrirModal('Configuración', vistaConfiguracion()));
    $('modalCerrar').addEventListener('click', () => this.cerrarModal());
    $('modalBackdrop').addEventListener('click', e => { if (e.target.id === 'modalBackdrop') this.cerrarModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') this.cerrarModal(); });
    window.addEventListener('beforeunload', e => { if (this.proyectos.modificado) { e.preventDefault(); e.returnValue = ''; } });
  }
  seleccionarEscena(id) { this.reproductor.detener(); this.audio.detenerEscena(); this.escenas.seleccionar(id); this.editor.limpiarSeleccion(); this.render(); }
  finalizarReproduccion() { this.reproductor.detener(); document.getElementById('previsualizarBtn').disabled = false; document.getElementById('detenerBtn').disabled = true; this.render(); }
  async guardar(como) {
    const paquete = await crearArchivoProyecto(this.p);
    let guardado = false;
    if (!como && this.proyectos.handle) guardado = await guardarConHandle(paquete, this.proyectos.handle);
    if (!guardado) {
      const handle = await guardarBlob(paquete, nombreProyectoArchivo(this.p, 'comicproj'))
      if (handle) { this.proyectos.handle = handle; guardado = true; }
      else if (!window.showSaveFilePicker) guardado = true;
    }
    if (guardado) { this.proyectos.modificado = false; this.notificar(mensajeGuardado('guardar')); }
  }
  async previsualizarAudio(recurso) { await this.proteger(async () => { const suena = await this.audio.alternarPrevio(recurso); this.notificar(suena ? `Escuchando: ${recurso.nombre}` : 'Vista previa detenida.'); }); }
  abrirModal(titulo, contenido) { document.getElementById('modalTitulo').textContent = titulo; document.getElementById('modalContenido').replaceChildren(contenido); document.getElementById('modalBackdrop').classList.remove('oculto'); }
  cerrarModal() { document.getElementById('modalBackdrop').classList.add('oculto'); }
  renderPropiedades() {
    const contenedor = document.getElementById('propiedadesContenido'); contenedor.replaceChildren();
    const escena = this.proyectos.actual();
    const tituloEscena = document.createElement('label'); tituloEscena.textContent = 'Nombre de escena';
    const inputNombre = document.createElement('input'); inputNombre.value = escena.nombre; inputNombre.maxLength = 80;
    inputNombre.addEventListener('change', () => { escena.nombre = inputNombre.value || 'Escena'; this.proyectos.marcar(); this.render(); });
    const labelDuracion = document.createElement('label'); labelDuracion.textContent = 'Duración (segundos)';
    const inputDuracion = document.createElement('input'); inputDuracion.type = 'number'; inputDuracion.min = '1'; inputDuracion.max = '120'; inputDuracion.value = escena.duracion;
    inputDuracion.addEventListener('change', () => this.proteger(() => { this.timeline.cambiarDuracion(inputDuracion.value); this.render(); }));
    contenedor.append(tituloEscena,inputNombre,labelDuracion,inputDuracion);
    const elemento = this.editor.elemento();
    const subtitulo = document.createElement('h3'); subtitulo.textContent = elemento ? 'Elemento seleccionado' : 'Elementos'; contenedor.append(subtitulo);
    if (!elemento) {
      const ayuda = document.createElement('p'); ayuda.className = 'nota'; ayuda.textContent = 'Selecciona un personaje o un globo en el lienzo para editarlo.'; contenedor.append(ayuda);
    } else {
      const controlesTamano = document.createElement('div'); controlesTamano.className = 'controles-tamano';
      const achicar = document.createElement('button'); achicar.type = 'button'; achicar.className = 'secundario'; achicar.textContent = '− Achicar'; achicar.title = 'Hacer más pequeño';
      achicar.addEventListener('click', () => this.editor.redimensionar(0.9));
      const agrandar = document.createElement('button'); agrandar.type = 'button'; agrandar.className = 'secundario'; agrandar.textContent = '+ Agrandar'; agrandar.title = 'Hacer más grande';
      agrandar.addEventListener('click', () => this.editor.redimensionar(1.1));
      controlesTamano.append(achicar, agrandar); contenedor.append(controlesTamano);
      for (const [campo, etiqueta] of [['x','X'],['y','Y'],['ancho','Ancho'],['alto','Alto']]) {
        const label = document.createElement('label'); label.textContent = etiqueta;
        const input = document.createElement('input'); input.type = 'number'; input.value = elemento[campo];
        input.addEventListener('change', () => this.editor.actualizar({[campo]: input.value}));
        contenedor.append(label, input);
      }
      if (elemento.tipo === 'globos') {
        const label = document.createElement('label'); label.textContent = 'Texto del globo';
        const textarea = document.createElement('textarea'); textarea.maxLength = 400; textarea.value = elemento.texto || '';
        textarea.addEventListener('input', () => { elemento.texto = textarea.value; this.proyectos.marcar(); this.editorView.pintar(this.p, escena, elemento.id); });
        contenedor.append(label, textarea);
      }
      const borrar = document.createElement('button'); borrar.textContent = 'Eliminar elemento'; borrar.className = 'peligro boton-ancho'; borrar.addEventListener('click', () => this.editor.eliminar()); contenedor.append(borrar);
    }
    const audioTitulo = document.createElement('h3'); audioTitulo.textContent = 'Audios en esta escena'; contenedor.append(audioTitulo);
    if (!escena.pistas.length) {
      const p = document.createElement('p'); p.className = 'nota'; p.textContent = 'Sin pistas. Añade audio desde Recursos.'; contenedor.append(p);
    }
    escena.pistas.forEach((pista, i) => {
      const recurso = this.p.recursos.find(r => r.id === pista.recursoId);
      const fila = document.createElement('div'); fila.className = 'audio-en-escena';
      const texto = document.createElement('span'); texto.textContent = recurso?.nombre || 'Audio no encontrado';
      const borrar = document.createElement('button'); borrar.textContent = '×'; borrar.title = 'Quitar pista'; borrar.addEventListener('click', () => { escena.pistas.splice(i, 1); this.proyectos.marcar(); this.render(); });
      fila.append(texto, borrar); contenedor.append(fila);
    });
  }
  render() {
    document.getElementById('nombreProyecto').value = this.p.nombre;
    document.getElementById('escenaActivaNombre').textContent = this.proyectos.actual().nombre;
    this.recursosView.render(this.p, this.tabActual);
    this.escenasView.render(this.p); this.timelineView.render(this.p); this.renderPropiedades();
    this.editorView.render(this.p, this.proyectos.actual(), this.editor.seleccionId);
  }
}
