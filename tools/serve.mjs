import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../public/',import.meta.url));
const port=Number(process.env.PORT || 8140);
const mime={'.html':'text/html; charset=utf-8','.js':'application/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.mp3':'audio/mpeg'};
http.createServer((req,res)=>{
  let pathname;
  try { pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  const filename=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if (!filename.startsWith(root) || path.relative(root,filename).split(path.sep).some(p=>p.startsWith('.'))) {res.writeHead(403).end();return;}
  fs.readFile(filename,(err,data)=>{
    if(err){res.writeHead(404).end('Not found');return;}
    const headers={'Content-Type':mime[path.extname(filename)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes'};
    let start=0,end=data.length-1,status=200;
    if(req.headers.range){
      const match=/^bytes=(\d*)-(\d*)$/.exec(req.headers.range);
      if(!match||(!match[1]&&!match[2])){res.writeHead(416,{'Content-Range':`bytes */${data.length}`}).end();return;}
      if(!match[1])start=Math.max(0,data.length-Number(match[2]));
      else{start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
      if(start>end||start>=data.length){res.writeHead(416,{'Content-Range':`bytes */${data.length}`}).end();return;}
      status=206;headers['Content-Range']=`bytes ${start}-${end}/${data.length}`;
    }
    headers['Content-Length']=end-start+1;
    res.writeHead(status,headers);res.end(req.method==='HEAD'?undefined:data.subarray(start,end+1));
  });
}).listen(port,'127.0.0.1',()=>console.log(`数学展开：http://127.0.0.1:${port}/`));
