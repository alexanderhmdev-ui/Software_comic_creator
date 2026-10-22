export function vistaConfiguracion() {
  const envoltura = document.createElement('div');
  const parrafo = document.createElement('p'); parrafo.textContent = 'Esta sección queda preparada para opciones avanzadas de calidad de video, accesibilidad y preferencias.';
  const etiquetas = document.createElement('p'); etiquetas.className = 'subtle'; etiquetas.textContent = 'Configuración inicial: 960 × 540 px, 16:9, exportación WebM.';
  envoltura.append(parrafo, etiquetas); return envoltura;
}
