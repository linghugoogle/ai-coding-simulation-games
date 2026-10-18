import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname);
const port=Number(process.env.PORT)||4174;
const mime={'.html':'text/html; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,'http://localhost');const pathname=decodeURIComponent(url.pathname);const file=path.resolve(root,'.'+(pathname==='/'?'/index.html':pathname));
  if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end('Forbidden');return;}
  const body=await fs.readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});res.end(body);
 }catch{res.writeHead(404);res.end('File not found');}
}).listen(port,'127.0.0.1',()=>console.log(`街角餐厅：http://127.0.0.1:${port}\n保持此终端打开。停止服务按 Ctrl+C；换端口可设置 PORT。`));
