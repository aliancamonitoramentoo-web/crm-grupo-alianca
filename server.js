const express = require('express');
const path    = require('path');
const fs      = require('fs');
const https   = require('https');
const app     = express();
const PORT    = process.env.PORT || 3000;

app.use(express.json({limit:'10mb'}));

// Log de acesso para debug
app.use((req,res,next)=>{
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// Serve arquivos estáticos
app.use(express.static(path.join(__dirname)));

// Endpoint de saúde — testa se o servidor está funcionando
app.get('/ping', (req,res)=>res.json({ok:true, time:new Date().toISOString()}));

// Chave da IA
app.get('/api/key', (req,res)=>{
  const key = process.env.ANTHROPIC_KEY || '';
  if(!key) return res.json({ok:false, msg:'Chave não configurada'});
  res.json({ok:true, key});
});

// Proxy para Anthropic
app.post('/api/claude', (req,res)=>{
  const key = process.env.ANTHROPIC_KEY || '';
  if(!key) return res.status(500).json({error:'ANTHROPIC_KEY não configurada'});

  const body = JSON.stringify(req.body);
  const opts = {
    hostname:'api.anthropic.com', path:'/v1/messages', method:'POST',
    headers:{
      'Content-Type':'application/json',
      'x-api-key':key,
      'anthropic-version':'2023-06-01',
      'Content-Length':Buffer.byteLength(body)
    }
  };
  const r=https.request(opts, ar=>{
    let d='';
    ar.on('data',c=>d+=c);
    ar.on('end',()=>{
      try{ res.status(ar.statusCode).json(JSON.parse(d)); }
      catch(e){ res.status(500).json({error:'Erro ao processar resposta'}); }
    });
  });
  r.on('error',e=>res.status(500).json({error:e.message}));
  r.write(body); r.end();
});

// Sync local
const DATA_FILE = '/tmp/crm_data.json';
app.get('/sync',(req,res)=>{
  try{
    if(fs.existsSync(DATA_FILE)) return res.json({ok:true,data:JSON.parse(fs.readFileSync(DATA_FILE,'utf8'))});
  }catch(e){}
  res.json({ok:false,empty:true});
});
app.post('/sync',(req,res)=>{
  try{ fs.writeFileSync(DATA_FILE,JSON.stringify(req.body),'utf8'); res.json({ok:true}); }
  catch(e){ res.status(500).json({ok:false}); }
});

// Sempre serve o index.html
app.get('*',(req,res)=>{
  const file=path.join(__dirname,'index.html');
  if(!fs.existsSync(file)){
    return res.status(404).send('index.html não encontrado no servidor');
  }
  res.sendFile(file);
});

app.listen(PORT,()=>console.log(`CRM Alianca rodando na porta ${PORT}`));
