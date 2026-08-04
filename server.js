const express = require('express');
const path    = require('path');
const fs      = require('fs');
const https   = require('https');
const app     = express();
const PORT    = process.env.PORT || 3000;

app.use(express.json({limit:'10mb'}));
app.use(express.static(path.join(__dirname)));

// ── Endpoint seguro da chave IA ──────────────────
// A chave fica APENAS no Render como variável de ambiente
// Nunca vai para o GitHub
app.get('/api/key', (req,res)=>{
  const key = process.env.ANTHROPIC_KEY || '';
  if(!key) return res.json({ok:false, msg:'Chave não configurada no servidor'});
  res.json({ok:true, key});
});

// ── Proxy seguro para Anthropic API ──────────────
// O HTML chama /api/claude e o servidor faz a chamada real
// A chave NUNCA aparece no navegador do cliente
app.post('/api/claude', async (req,res)=>{
  const key = process.env.ANTHROPIC_KEY || '';
  if(!key) return res.status(500).json({error:'Chave de IA não configurada no servidor'});

  const body = JSON.stringify(req.body);
  const options = {
    hostname: 'api.anthropic.com',
    path: '/v1/messages',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Length': Buffer.byteLength(body)
    }
  };

  const apiReq = https.request(options, apiRes => {
    let data = '';
    apiRes.on('data', chunk => data += chunk);
    apiRes.on('end', () => {
      try {
        res.status(apiRes.statusCode).json(JSON.parse(data));
      } catch(e) {
        res.status(500).json({error: 'Erro ao processar resposta da IA'});
      }
    });
  });

  apiReq.on('error', e => {
    res.status(500).json({error: e.message});
  });

  apiReq.write(body);
  apiReq.end();
});

// ── Sincronização ─────────────────────────────────
const DATA_FILE = path.join('/tmp', 'crm_data.json');

app.get('/sync', (req,res)=>{
  try{
    if(fs.existsSync(DATA_FILE)) return res.json({ok:true, data:JSON.parse(fs.readFileSync(DATA_FILE,'utf8'))});
  }catch(e){}
  res.json({ok:false, empty:true});
});

app.post('/sync', (req,res)=>{
  try{
    fs.writeFileSync(DATA_FILE, JSON.stringify(req.body), 'utf8');
    res.json({ok:true});
  }catch(e){
    res.status(500).json({ok:false});
  }
});

app.get('*', (req,res) => res.sendFile(path.join(__dirname,'index.html')));
app.listen(PORT, () => console.log('CRM Alianca porta '+PORT));
