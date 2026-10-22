import { duracionTotal, ubicarEscena } from '../models/LineaTiempo.js';
import { cargarImagenes, pintarEscena } from './RenderCanvas.js';

function formatoWebm() {
  if (!window.MediaRecorder) throw new Error('El navegador no admite MediaRecorder.');
  for (const mime of ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']) {
    if (MediaRecorder.isTypeSupported(mime)) return mime;
  }
  throw new Error('Este navegador no admite exportación WebM. Usa Chrome o Edge actualizado.');
}
async function prepararAudio(project, ctx, destino) {
  const decodificados = new Map();
  for (const recurso of project.recursos.filter(r => r.categoria === 'audio')) {
    const binario = Uint8Array.from(atob(recurso.dataURL.split(',')[1]), c => c.charCodeAt(0));
    try { decodificados.set(recurso.id, await ctx.decodeAudioData(binario.buffer)); }
    catch { /* No incluir pistas que el navegador no logra decodificar. */ }
  }
  let offset = 0; const fuentes = [];
  for (const escena of project.escenas) {
    for (const pista of escena.pistas) {
      const buffer = decodificados.get(pista.recursoId);
      if (!buffer) continue;
      const fuente = ctx.createBufferSource(); fuente.buffer = buffer;
      const gain = ctx.createGain(); gain.gain.value = Math.min(1, Math.max(0, pista.volumen ?? 0.8));
      fuente.connect(gain).connect(destino);
      fuentes.push({ fuente, inicio: offset + Math.max(0, pista.inicio || 0), duracion: Math.max(0.1, escena.duracion - (pista.inicio || 0)) });
    }
    offset += Math.max(1, escena.duracion || 1);
  }
  return fuentes;
}
export async function exportarVideo(proyecto, onProgress = () => {}) {
  if (!HTMLCanvasElement.prototype.captureStream) throw new Error('Tu navegador no permite capturar Canvas.');
  const tipo = formatoWebm();
  await cargarImagenes(proyecto);
  const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 540;
  const flujo = canvas.captureStream(30);
  const ctxAudio = new (window.AudioContext || window.webkitAudioContext)();
  const destino = ctxAudio.createMediaStreamDestination();
  for (const pista of destino.stream.getAudioTracks()) flujo.addTrack(pista);
  const fuentes = await prepararAudio(proyecto, ctxAudio, destino);
  const partes = []; const duracion = duracionTotal(proyecto.escenas);
  let raf;
  let grabador;
  try {
    grabador = new MediaRecorder(flujo, { mimeType: tipo, videoBitsPerSecond: 2800000 });
    const terminado = new Promise((resolve, reject) => {
      grabador.ondataavailable = e => { if (e.data.size) partes.push(e.data); };
      grabador.onerror = e => reject(e.error || new Error('Error al grabar video.'));
      grabador.onstop = () => resolve(new Blob(partes, { type: tipo }));
    });
    pintarEscena(canvas, proyecto, proyecto.escenas[0]);
    await ctxAudio.resume();
    const inicioAudio = ctxAudio.currentTime + 0.15;
    grabador.start(500);
    const inicioVideo = performance.now() + 150;
    fuentes.forEach(({ fuente, inicio, duracion }) => {
      if (inicio < duracionTotal(proyecto.escenas) && duracion > 0) fuente.start(inicioAudio + inicio, 0, Math.min(duracion, fuente.buffer.duration));
    });
    await new Promise(resolve => {
      const cuadro = ahora => {
        const t = Math.max(0, (ahora - inicioVideo) / 1000);
        const { escena } = ubicarEscena(proyecto.escenas, Math.min(t, duracion - 0.001));
        pintarEscena(canvas, proyecto, escena);
        onProgress(Math.min(100, Math.round(t / duracion * 100)));
        if (t >= duracion) resolve(); else raf = requestAnimationFrame(cuadro);
      };
      raf = requestAnimationFrame(cuadro);
    });
    grabador.stop();
    const resultado = await terminado;
    onProgress(100);
    return resultado;
  } finally {
    if (raf !== undefined) cancelAnimationFrame(raf);
    if (grabador?.state === 'recording') grabador.stop();
    fuentes.forEach(({ fuente }) => { try { fuente.stop(); } catch {} });
    flujo.getTracks().forEach(pista => pista.stop());
    await ctxAudio.close();
  }
}
