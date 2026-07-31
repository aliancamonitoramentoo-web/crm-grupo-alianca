const express = require('express');
const path    = require('path');
const fs      = require('fs');
const app     = express();
const PORT    = process.env.PORT || 3000;

app.use(express.json({limit:'10mb'}));
app.use(express.static(path.join(__dirname)));

// Arquivo de dados no servidor
const DATA_FILE = path.join('/tmp', 'crm_data.json');

function lerDados(){
  try{
    if(fs.existsSync(DATA_FILE)){
      return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));
    }
  }catch(e){ console.error('Erro ao ler dados:',e.message); }
  return null;
}

function salvarDados(data){
  try{
    fs.writeFileSync(DATA_FILE, JSON.stringify(data), 'utf8');
    return true;
  }catch(e){ console.error('Erro ao salvar:',e.message); return false; }
}

// ── Sincronização — GET (recebe dados do servidor) ──
app.get('/sync', (req, res) => {
  const dados = lerDados();
  if(!dados) return res.json({ok:false, empty:true});
  res.json({ok:true, data:dados});
});

// ── Sincronização — POST (envia dados para o servidor) ──
app.post('/sync', (req, res) => {
  const payload = req.body;
  if(!payload || !payload.empresas) return res.status(400).json({error:'Dados inválidos'});
  const ok = salvarDados(payload);
  res.json({ok});
});

// Rota principal
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => console.log('CRM Grupo Alianca porta ' + PORT));
