import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, resolve, sep } from 'node:path';

const raiz = resolve(import.meta.dirname);
const tipos = {'html':'text/html; charset=utf-8','.js':'text/javacript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.ico':'image/x-icon'};

createServer(async (req, res) =>{
  const url = new URL(req.url, 'http://localhost:8080')
  let archivo;
  try { archivo = decodeURIComponent(url.pathname) === '/' ? 'index.html' : decodeURIComponent(url.pathname).slice(1); }
  catch { res.writeHead(400); end('Ruta no valida'); return; }
  const ruta = normalize(join(raiz, archivo));
  if (ruta !== raiz && !ruta.startsWith(raiz + sep)) {res.writeHead(403);res.end('Prohibio');return;}

  try{
    if(!((await stat(ruta)).isFile())) throw Error('No es un archivo');
    const datos = await readFile(ruta);
    res.writeHead(200,{'Content-Type' : tipos[extname(ruta)] || 'application/octet-stream', 'X-Content-Type-Options':'noosniff'}); res.end(datos);
  }catch {res.writeHead(404);res.end('No encontrado');}
}).listen(8080, '127.0.0.1', () => console.log('Comic:: http://localhost:8080'));