export class RecursosView {
  constructor(contenedor, onAdd, onPreview, onDelete) { this.el = contenedor; this.onAdd = onAdd; this.onPreview = onPreview; this.onDelete = onDelete; }
  render(proyecto, categoria) {
    this.el.replaceChildren(); this.el.className = categoria === 'audio' ? 'recursos-audio' : 'recursos-grid';
    const recursos = proyecto.recursos.filter(r => r.categoria === categoria);
    if (!recursos.length) { const vacio = document.createElement('p'); vacio.className = 'recursos-vacio'; vacio.textContent = 'Aún no hay recursos. Importa archivos desde tu equipo.'; this.el.append(vacio); return; }
    for (const recurso of recursos) {
      const card = document.createElement('div'); card.className = 'recurso-card';
      if (categoria === 'audio') {
        const play = document.createElement('button'); play.className = 'secundario audio-play'; play.textContent = '▶ / ❚❚'; play.title = 'Escuchar / pausar vista previa';
        play.addEventListener('click', () => this.onPreview(recurso)); card.append(play);
      } else {
        const img = document.createElement('img'); img.src = recurso.dataURL; img.alt = recurso.nombre; img.loading = 'lazy'; card.append(img);
      }
      const name = document.createElement('span'); name.textContent = recurso.nombre; name.title = recurso.nombre; card.append(name);
      const add = document.createElement('button'); add.className = 'boton-agregar'; add.textContent = '＋'; add.title = 'Agregar a la escena'; add.addEventListener('click', () => this.onAdd(recurso)); card.append(add);
      const borrar = document.createElement('button');
      borrar.className = 'boton-eliminar-recurso';
      borrar.textContent = '×';
      borrar.title = 'Eliminar recurso';
      borrar.addEventListener('click', () => this.onDelete(recurso));
      card.append(borrar);
      this.el.append(card);
    }
  }
}
