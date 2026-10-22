export class TimelineController {
  constructor(proyectoCtl) { this.control = proyectoCtl; }
  cambiarDuracion(segundos) {
    const numero = Number(segundos);
    if (!Number.isFinite(numero) || numero < 1 || numero > 120) throw new Error('La duración debe ser de 1 a 120 segundos.');
    this.control.actual().duracion = numero; this.control.marcar();
  }
}
