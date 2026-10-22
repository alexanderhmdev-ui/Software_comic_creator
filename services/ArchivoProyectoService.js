import { validarProyecto } from '../models/Proyecto.js';
import { extensionMime } from '../models/Recurso.js';

function biblioteca() {
  if (!window.JSZip) throw new Error('Falta JSZip: comprueba vendor/jszip.min.js.');
  return window.JSZip;
}
const nombreSeguro = texto => (texto || 'Mi_Historia').replace(/[\\/:*?"<>|\x00-\x1f]/g, '_').trim().slice(0, 80);
function desdeDataURL(dataURL) {
  const base64 = dataURL.split(',')[1];
  if (!base64) throw new Error('Recurso multimedia incompleto.');
  return Uint8Array.from(atob(base64), c => c.charCodeAt(0));
}
function aDataURL(bytes, mime) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = reject;
    lector.readAsDataURL(new Blob([bytes], { type: mime }));
  });
}
export async function crearArchivoProyecto(proyecto) {
  validarProyecto(proyecto);
  const zip = new (biblioteca())();
  const metadatos = structuredClone(proyecto);
  for (const recurso of metadatos.recursos) {
    const original = proyecto.recursos.find(r => r.id === recurso.id);
    if (!original?.dataURL) throw new Error(`Faltan datos de ${recurso.nombre}`);
    const ruta = `recursos/${recurso.categoria}/${recurso.id}.${extensionMime(recurso.mime)}`;
    recurso.ruta = ruta;
    delete recurso.dataURL;
    zip.file(ruta, desdeDataURL(original.dataURL));
  }
  zip.file('project.json', JSON.stringify(metadatos, null, 2));
  return zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 3 } });
}
export async function abrirArchivoProyecto(archivo) {
  if (!archivo || archivo.size > 220 * 1024 * 1024) throw new Error('Archivo no válido o demasiado grande (máximo 220 MB).');
  const zip = await biblioteca().loadAsync(archivo, { checkCRC32: true });
  const descriptor = zip.file('project.json');
  if (!descriptor) throw new Error('El paquete no incluye project.json.');
  const proyecto = validarProyecto(JSON.parse(await descriptor.async('string')));
  for (const recurso of proyecto.recursos) {
    if (!/^recursos\/(escenarios|personajes|globos|audio)\/[\w.-]+$/.test(recurso.ruta || '')) {
      throw new Error(`Ruta de recurso inválida: ${recurso.nombre}`);
    }
    const contenido = zip.file(recurso.ruta);
    if (!contenido) throw new Error(`Recurso faltante: ${recurso.nombre}`);
    const bytes = await contenido.async('uint8array');
    if (bytes.length > 20 * 1024 * 1024) throw new Error(`Recurso demasiado grande: ${recurso.nombre}`);
    recurso.dataURL = await aDataURL(bytes, recurso.mime);
    delete recurso.ruta;
  }
  return proyecto;
}
export async function guardarBlob(blob, nombre, opciones = {}) {
  const archivo = nombreSeguro(nombre);
  if (window.showSaveFilePicker && opciones.picker !== false) {
    try {
      const extension = archivo.split('.').at(-1);
      const tipo = extension === 'comicproj' ? 'application/zip' : 'video/webm';
      const handle = await window.showSaveFilePicker({ suggestedName: archivo, types: [{ description: 'Archivo de Comic Creator', accept: { [tipo]: [`.${extension}`] } }] });
      const escritor = await handle.createWritable(); await escritor.write(blob); await escritor.close();
      return handle;
    } catch (error) { if (error.name === 'AbortError') return null; throw error; }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = archivo; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  return null;
}
export async function guardarConHandle(blob, handle) {
  if (!handle) return false;
  const escritor = await handle.createWritable(); await escritor.write(blob); await escritor.close();
  return true;
}
export function nombreProyectoArchivo(proyecto, ext) {
  return `${nombreSeguro(proyecto.nombre || 'Mi_Historia').replace(/\.(comicproj|webm)$/i, '')}.${ext}`;
}
