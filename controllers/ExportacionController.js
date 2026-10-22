import { exportarVideo } from '../services/ExportadorVideoService.js';
import { guardarBlob, nombreProyectoArchivo } from '../services/ArchivoProyectoService.js';
export class ExportacionController {
  constructor(proyectoCtl) { this.control = proyectoCtl; }
  async exportar(progreso) {
    const p = this.control.proyecto;
    const video = await exportarVideo(p, progreso);
    await guardarBlob(video, nombreProyectoArchivo(p,'webm'));
  }
}
