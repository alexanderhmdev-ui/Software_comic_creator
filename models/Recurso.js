const tiposPermitidos = {
  escenarios: ['image/png','image/jpeg','image/webp','image/gif'],
  personajes: ['image/png','image/jpeg','image/webp','image/gif'],
  globos: ['image/png','image/jpeg','image/webp','image/gif'],
  audio: ['audio/mpeg','audio/mp3','audio/wav','audio/ogg','audio/webm','audio/mp4','audio/x-wav']
};
export function validarArchivo(file, categoria) {
  if (!tiposPermitidos[categoria]?.includes(file.type)) throw new Error(`Tipo no admitido: ${file.name}`);
  if (file.size === 0 || file.size > 20 * 1024 * 1024) throw new Error(`Archivo vacío o mayor a 20 MB: ${file.name}`);
  return true;
}
export function crearRecurso(file, categoria, dataURL) {
  return { id: crypto.randomUUID(), categoria, nombre: file.name, mime: file.type, dataURL };
}
export function extensionMime(mime) {
  return ({'image/png':'png','image/jpeg':'jpg','image/webp':'webp','image/gif':'gif','audio/mpeg':'mp3','audio/mp3':'mp3','audio/wav':'wav','audio/x-wav':'wav','audio/ogg':'ogg','audio/webm':'webm','audio/mp4':'m4a'})[mime] || 'bin';
}
