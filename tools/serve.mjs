import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../public/',import.meta.url));
const port=Number(process.env.PORT || 8140);
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml'};
http.createServer((req,res)=>{
  let pathname;
  try { pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  const filename=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if (!filename.startsWith(root) || path.relative(root,filename).split(path.sep).some(p=>p.startsWith('.'))) {res.writeHead(403).end();return;}
  fs.readFile(filename,(err,data)=>{if(err){res.writeHead(404).end('Not found');return;}res.writeHead(200,{'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(data);});
}).listen(port,'127.0.0.1',()=>console.log(`数学展开：http://127.0.0.1:${port}/`));
