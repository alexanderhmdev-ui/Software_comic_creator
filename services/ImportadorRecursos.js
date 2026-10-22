import { crearRecurso, validarArchivo } from '../models/Recurso.js';
export function leerDataURL(archivo) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onload = () => resolve(lector.result);
    lector.onerror = () => reject(new Error(`No se pudo leer: ${archivo.name}`));
    lector.readAsDataURL(archivo);
  });
}
export async function importarRecursos(archivos, categoria) {
  const importados = [];
  for (const archivo of archivos) {
    validarArchivo(archivo, categoria);
    importados.push(crearRecurso(archivo, categoria, await leerDataURL(archivo)));
  }
  return importados;
}
