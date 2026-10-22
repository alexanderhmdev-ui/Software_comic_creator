export function mensajeGuardado(tipo) {
  return tipo === 'nuevo' ? 'Proyecto nuevo creado.' : tipo === 'abrir' ? 'Proyecto recuperado con sus recursos.' : 'Proyecto empaquetado como .comicproj.';
}
