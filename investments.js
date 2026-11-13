import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

// MODIFICA QUI I NOMI DEI TUOI FONDI. Ogni nome deve essere unico e stabile.
// Puoi aggiungerne altri, separati da virgola. Non rinominare fondi con dati già salvati
// senza prima migrare i relativi record, altrimenti lo storico non sarà più visibile.
const FONDI = [Sicav];

const $ = id => document.getElementById(id);
const cfg = window.APP_CONFIG || {};
const euro = cents => new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(cents / 100);
const monthNow = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; };
const asCents = value => Math.round(Number(value) * 100);
let client, userId = null, snapshots = [], loadSequence = 0;

function message(text, isError=false) {
  const el = $('status'); if (el) {el.textContent=text; el.className=isError?'error':'success';}
}
function makeNode(tag, text, className='') {
  const el=document.createElement(tag); el.textContent=text; if(className)el.className=className;return el;
}
function selectedFund() {return $('fundSelect').value;}
async function refresh() {
  const seq=++loadSequence;
  if(!client || !userId || !selectedFund()) {snapshots=[];render();return;}
  const fund=selectedFund();
  const {data,error}=await client.from('investment_snapshots')
    .select('id,month,value_cents,invested_cents')
    .eq('user_id',userId).eq('fund_name',fund).order('month',{ascending:true});
  if(seq!==loadSequence)return;
  if(error){snapshots=[];render();message('Investimenti: '+error.message,true);return;}
  snapshots=data||[];render();
}
function render() {
  const latest=snapshots.at(-1);
  $('fundCurrentValue').textContent=latest?euro(latest.value_cents):'€ 0,00';
  $('fundLastMonth').textContent=latest?'Rilevazione '+latest.month:'Nessuna rilevazione';
  const profit=$('fundProfit');
  if(latest && latest.invested_cents!==null){const delta=latest.value_cents-latest.invested_cents;profit.textContent=`${delta>=0?'+':''}${euro(delta)} rispetto al capitale versato`;profit.style.color=delta>=0?'#b6ffdb':'#ffd1d1';}
  else profit.textContent='Inserisci il capitale versato per calcolare il guadagno';
  const history=$('investmentHistory');history.replaceChildren();
  if(!snapshots.length)history.append(makeNode('p','Nessuna rilevazione mensile.','muted'));
  for(const s of [...snapshots].reverse()) {
    const row=makeNode('div','','row');
    const info=makeNode('div',s.month+' • '+euro(s.value_cents),'desc');info.style.flex='1';
    if(s.invested_cents!==null)info.append(makeNode('small',' | risultato: '+euro(s.value_cents-s.invested_cents)));
    const edit=makeNode('button','Modifica','secondary');edit.type='button';
    edit.onclick=()=>{$('investmentMonth').value=s.month;$('investmentValue').value=(s.value_cents/100).toFixed(2);$('investmentCapital').value=s.invested_cents===null?'':(s.invested_cents/100).toFixed(2);$('investmentForm').scrollIntoView({behavior:'smooth'});};
    const del=makeNode('button','Elimina','danger');del.type='button';
    del.onclick=async()=>{if(!confirm('Eliminare la rilevazione di '+s.month+'?'))return;const {error}=await client.from('investment_snapshots').delete().eq('id',s.id).eq('user_id',userId);if(error)message(error.message,true);else await refresh();};
    row.append(info,edit,del);history.append(row);
  }
  drawChart();
}
function drawChart() {
  const canvas=$('investmentChart'), ctx=canvas.getContext('2d');
  const width=Math.max(280,canvas.getBoundingClientRect().width||600), height=240, scale=window.devicePixelRatio||1;
  canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);ctx.setTransform(scale,0,0,scale,0,0);ctx.clearRect(0,0,width,height);
  $('investmentChartEmpty').classList.toggle('hide',snapshots.length>0);
  if(!snapshots.length)return;
  const left=66,right=14,top=20,bottom=37,plotW=width-left-right,plotH=height-top-bottom;
  const values=snapshots.map(s=>s.value_cents/100);
  let lo=Math.min(...values),hi=Math.max(...values);const pad=Math.max((hi-lo)*0.15,Math.max(hi*0.02,1));lo=Math.max(0,lo-pad);hi+=pad;
  const x=i=>left+(snapshots.length===1?plotW/2:i*plotW/(snapshots.length-1));
  const y=v=>top+(hi-v)/(hi-lo)*plotH;
  ctx.font='11px system-ui';ctx.textAlign='right';ctx.strokeStyle='#e1e8f0';ctx.fillStyle='#65758a';ctx.lineWidth=1;
  for(let i=0;i<=4;i++){const v=lo+(hi-lo)*i/4,py=y(v);ctx.beginPath();ctx.moveTo(left,py);ctx.lineTo(width-right,py);ctx.stroke();ctx.fillText(new Intl.NumberFormat('it-IT',{maximumFractionDigits:0}).format(v),left-7,py+4);}
  ctx.strokeStyle='#137c54';ctx.lineWidth=3;ctx.beginPath();values.forEach((v,i)=>i?ctx.lineTo(x(i),y(v)):ctx.moveTo(x(i),y(v)));ctx.stroke();
  ctx.fillStyle='#137c54';values.forEach((v,i)=>{ctx.beginPath();ctx.arc(x(i),y(v),4,0,Math.PI*2);ctx.fill();});
  ctx.fillStyle='#65758a';ctx.textAlign='center';const step=Math.max(1,Math.ceil(snapshots.length/5));snapshots.forEach((s,i)=>{if(i%step===0||i===snapshots.length-1)ctx.fillText(s.month.slice(2),x(i),height-12);});
}
async function init() {
  if(!cfg.supabaseUrl?.startsWith('https://') || !cfg.supabaseAnonKey)return;
  client=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);
  const select=$('fundSelect');
  for(const name of FONDI){const option=document.createElement('option');option.value=name;option.textContent=name;select.append(option);}
  select.onchange=()=>{ $('investmentForm').reset();$('investmentMonth').value=monthNow();refresh(); };
  $('investmentMonth').value=monthNow();
  $('investmentForm').onsubmit=async e=>{
    e.preventDefault();if(!userId)return message('Effettua prima l’accesso.',true);
    const value=asCents($('investmentValue').value),raw=$('investmentCapital').value.trim(),capital=raw===''?null:asCents(raw);
    if(!Number.isSafeInteger(value)||value<0||(capital!==null&&(!Number.isSafeInteger(capital)||capital<0)))return message('Importo non valido.',true);
    const month=$('investmentMonth').value;
    if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month))return message('Mese non valido.',true);
    const btn=$('saveInvestment');btn.disabled=true;
    try {
      const {error}=await client.from('investment_snapshots').upsert({user_id:userId,fund_name:selectedFund(),month,value_cents:value,invested_cents:capital},{onConflict:'user_id,fund_name,month'});
      if(error)return message('Errore salvataggio investimenti: '+error.message,true);
      message('Valore mensile salvato.');await refresh();
    }finally{btn.disabled=false;}
  };
  client.auth.onAuthStateChange((event,session)=>{
    setTimeout(()=>{const next=session?.user?.id||null;if(next!==userId){userId=next;refresh();}},0);
  });
  const {data:{session}}=await client.auth.getSession();userId=session?.user?.id||null;await refresh();
  window.addEventListener('resize',drawChart);
}
init().catch(err=>message('Investimenti: '+err.message,true));
