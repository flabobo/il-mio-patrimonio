import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const $=id=>document.getElementById(id), cfg=window.APP_CONFIG||{};
const ready=cfg.supabaseUrl?.startsWith('https://')&&cfg.supabaseAnonKey&&!cfg.supabaseAnonKey.startsWith('INSERISCI');
const money=n=>new Intl.NumberFormat('it-IT',{style:'currency',currency:'EUR'}).format(n);
const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`};
const cents=n=>Math.round(Number(n)*100);
let supabase, user, account, movements=[], editing=null, horizonAll=false, recoveryMode=false;
function status(s,bad=false){$('status').textContent=s;$('status').className=bad?'error':'success'}
function show(id){['setup','auth','recovery','app'].forEach(k=>$(k).classList.toggle('hide',k!==id));$('logout').classList.toggle('hide',id!=='app')}
$('movementDate').value=today();$('openingDate').value=today();$('horizon').value=(()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+2).padStart(2,'0')}-01`})();
if(!ready){show('setup')}else{supabase=createClient(cfg.supabaseUrl,cfg.supabaseAnonKey);init()}
async function init(){
  // Subscribe before getSession: Supabase may emit PASSWORD_RECOVERY while processing the URL.
  supabase.auth.onAuthStateChange((event,session)=>{
    if(event==='PASSWORD_RECOVERY'){
      recoveryMode=true;
      setTimeout(()=>{show('recovery');status('Inserisci una nuova password.');},0);
      return;
    }
    setTimeout(()=>{if(!recoveryMode)sessionChanged(session);},0);
  });
  const {data:{session},error}=await supabase.auth.getSession();
  if(error)status(error.message,true);
  if(!recoveryMode)await sessionChanged(session);
}
$('recoveryForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const password=$('newPassword').value;
  if(password!==$('confirmPassword').value)return status('Le password non coincidono.',true);
  if(password.length<8)return status('La password deve contenere almeno 8 caratteri.',true);
  const button=$('changePassword');button.disabled=true;
  try{
    const {error}=await supabase.auth.updateUser({password});
    if(error)return status('Impossibile cambiare password: '+error.message,true);
    await supabase.auth.signOut();
    recoveryMode=false;user=null;account=null;movements=[];
    $('recoveryForm').reset();show('auth');
    status('Password aggiornata. Ora accedi con la nuova password.');
  }finally{button.disabled=false;}
});
async function sessionChanged(session){if(recoveryMode)return;if(!session){user=null;show('auth');return}if(user===session.user.id)return;user=session.user.id;show('app');await load()}
$('authForm').addEventListener('submit',async e=>{e.preventDefault();status('Accesso...');const {error}=await supabase.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});status(error?error.message:'Accesso riuscito',!!error)});
$('register').onclick=async()=>{const {error,data}=await supabase.auth.signUp({email:$('email').value.trim(),password:$('password').value});status(error?error.message:data.session?'Account creato':'Controlla la tua email per confermare la registrazione',!!error)};
$('logout').onclick=async()=>{await supabase.auth.signOut();user=null;account=null;movements=[];show('auth')};
async function load(){status('Caricamento...');let a=await supabase.from('accounts').select('*').eq('user_id',user).limit(1).maybeSingle();if(a.error)return status(a.error.message,true);account=a.data;if(!account){const r=await supabase.from('accounts').insert({user_id:user,name:'Conto corrente',opening_cents:0,opening_date:today()}).select().single();if(r.error)return status(r.error.message,true);account=r.data}const m=await supabase.from('movements').select('*').eq('account_id',account.id).order('date',{ascending:false});if(m.error)return status(m.error.message,true);movements=m.data;$('opening').value=(account.opening_cents/100).toFixed(2);$('openingDate').value=account.opening_date;render();status('Dati sincronizzati')}
function calc(){const confirmed=movements.filter(m=>m.status==='confirmed').reduce((s,m)=>s+(m.kind==='income'?m.amount_cents:-m.amount_cents),0);const current=account.opening_cents+confirmed;const cutoff=horizonAll?'9999-12-31':$('horizon').value;const pending=movements.filter(m=>m.status==='planned'&&m.date<=cutoff).reduce((s,m)=>s+(m.kind==='income'?m.amount_cents:-m.amount_cents),0);return {current,projected:current+pending,pending}}
function render(){if(!account)return;const b=calc();$('current').textContent=money(b.current/100);$('projected').textContent=money(b.projected/100);$('difference').textContent=(b.pending>=0?'+':'')+money(b.pending/100)+' da operazioni previste';$('forecastLabel').textContent=horizonAll?'Tutte le operazioni programmate':'Fino al '+$('horizon').value;const list=$('movements');list.replaceChildren();const filter=$('view').value;const data=movements.filter(m=>filter==='all'||m.status===filter);if(!data.length){const p=document.createElement('p');p.className='muted';p.textContent='Nessun movimento';list.append(p)}for(const m of data){const row=document.createElement('div');row.className='row';const info=document.createElement('div');info.style.flex='1';const name=document.createElement('div');name.className='desc';name.textContent=m.description;const sub=document.createElement('small');sub.textContent=`${m.date} • ${m.category} • ${m.status==='confirmed'?'Confermato':'Programmato'}`;info.append(name,sub);const side=document.createElement('div');side.style.textAlign='right';const amt=document.createElement('div');amt.className='amount '+(m.kind==='income'?'positive':'negative');amt.textContent=(m.kind==='income'?'+':'−')+money(m.amount_cents/100);const actions=document.createElement('div');actions.className='actions';function btn(label,fn,klass='secondary'){const b=document.createElement('button');b.textContent=label;b.className=klass;b.onclick=fn;actions.append(b)}if(m.status==='planned')btn('Conferma',()=>confirmMovement(m));btn('Modifica',()=>editMovement(m));btn('Elimina',()=>deleteMovement(m),'danger');side.append(amt,actions);row.append(info,side);list.append(row)}}
$('horizon').onchange=()=>{horizonAll=false;render()};$('allFuture').onclick=()=>{horizonAll=true;render()};$('view').onchange=render;
$('balanceForm').onsubmit=async e=>{e.preventDefault();if(!confirm('Modificare il saldo iniziale? Assicurati che i movimenti registrati siano successivi alla data di riferimento.'))return;const v=cents($('opening').value);if(!Number.isSafeInteger(v))return status('Importo non valido',true);const r=await supabase.from('accounts').update({opening_cents:v,opening_date:$('openingDate').value}).eq('id',account.id).eq('user_id',user);if(r.error)return status(r.error.message,true);await load()};
$('movementForm').onsubmit=async e=>{e.preventDefault();const amount=cents($('amount').value);if(!Number.isSafeInteger(amount)||amount<=0)return status('Importo non valido',true);const payload={description:$('description').value.trim(),amount_cents:amount,date:$('movementDate').value,kind:$('type').value,category:$('category').value,status:$('state').value};if(!payload.description||!payload.date)return status('Compila tutti i campi',true);if(payload.status==='confirmed'&&payload.date>today())return status('Non puoi confermare un movimento con data futura',true);const r=editing?await supabase.from('movements').update(payload).eq('id',editing).eq('account_id',account.id):await supabase.from('movements').insert({...payload,account_id:account.id,user_id:user});if(r.error)return status(r.error.message,true);resetForm();await load()};
function resetForm(){editing=null;$('movementForm').reset();$('movementDate').value=today();$('formTitle').textContent='Nuovo movimento';$('saveMovement').textContent='Salva movimento';$('cancelEdit').classList.add('hide')}
function editMovement(m){editing=m.id;$('description').value=m.description;$('amount').value=(m.amount_cents/100).toFixed(2);$('movementDate').value=m.date;$('type').value=m.kind;$('category').value=m.category;$('state').value=m.status;$('formTitle').textContent='Modifica movimento';$('saveMovement').textContent='Salva modifiche';$('cancelEdit').classList.remove('hide');$('movementForm').scrollIntoView({behavior:'smooth'})}
$('cancelEdit').onclick=resetForm;
async function confirmMovement(m){if(m.date>today())return status('La data è futura: modifica prima la data effettiva',true);if(!confirm(`Confermare ${m.description} (${money(m.amount_cents/100)}) come ${m.kind==='expense'?'pagato':'incassato'}?`))return;const r=await supabase.from('movements').update({status:'confirmed'}).eq('id',m.id).eq('account_id',account.id);if(r.error)return status(r.error.message,true);await load()}
async function deleteMovement(m){if(!confirm(`Eliminare definitivamente "${m.description}"?`))return;const r=await supabase.from('movements').delete().eq('id',m.id).eq('account_id',account.id);if(r.error)return status(r.error.message,true);await load()}
$('export').onclick=()=>{const rows=[['data','descrizione','categoria','tipo','stato','importo_eur'],...movements.map(m=>[m.date,m.description,m.category,m.kind,m.status,(m.amount_cents/100).toFixed(2)])];const csv='\ufeff'+rows.map(r=>r.map(v=>'"'+String(v).replaceAll('"','""')+'"').join(';')).join('\r\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));a.download='movimenti-patrimonio.csv';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
if('serviceWorker'in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
