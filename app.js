const KEY='wk-transport-planner-v3';
const DEFAULT={config:{capacity:52,minOcc:85,maxOcc:100,cost:1797.34,distance:68.8,ttw:0.78471,wtt:0.18538,windows:2,periodWeeks:18,beforePerWeek:3,weekLabel:'S34–S51',routeName:'TR1870FT67 - Nichibras/Hober > Forvia Goiana'},packaging:window.INIT_PACKAGING||[],plan:window.DEMO_PLAN||[],dailyReceipts:[],weeklyHistory:[],history:[]};
let db=loadDB();let currentBook=null,currentRows=[],mapping={};let editingPack=-1;let angle=-36,drag=false,lastX=0,lastY=0;
function clone(x){return JSON.parse(JSON.stringify(x))}function loadDB(){try{let x=JSON.parse(localStorage.getItem(KEY));if(x){if(!x.dailyReceipts)x.dailyReceipts=[];if(!x.weeklyHistory)x.weeklyHistory=[];if(!x.config.routeName)x.config.routeName='TR1870FT67 - Nichibras/Hober > Forvia Goiana';return x}return clone(DEFAULT)}catch(e){return clone(DEFAULT)}}function persist(){localStorage.setItem(KEY,JSON.stringify(db))}
function fmt(v,d=0){return Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:d,maximumFractionDigits:d})}function money(v){return Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}function pct(v){return fmt(v*100,1)+'%'}function esc(s){return String(s??'').replace(/[&<>\"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[m]))}
const titles={dashboard:['Dashboard executivo','Visão consolidada da necessidade de transporte WK'],loading3d:['Carregamento 3D','Visualização prevista da ocupação por janela e veículo'],planning:['Planejamento semanal','Importe Planned Receipts e Firmed Receipts'],receivingWindows:['Janelas de Recebimento','Detalhamento diário por data e Part Number'],weeklyHistory:['Histórico Semanal','Comparativo de capacidade, carretas, ocupação, saving e CO₂'],packaging:['Base de Embalagens','Cadastro editável de materiais e lotes'],impacts:['Impactos da otimização','Saving, viagens e CO₂ evitado'],config:['Configurações','Parâmetros operacionais do cálculo']};
document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>{document.querySelectorAll('.nav button').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));document.getElementById(b.dataset.page).classList.add('active');pageTitle.textContent=titles[b.dataset.page][0];pageSub.textContent=titles[b.dataset.page][1];render()});
function packIndex(){const m={};db.packaging.forEach(p=>{if(p.material)m[String(p.material).trim().toUpperCase()]=p});return m}
function usedQty(r){let p=+r.planned||0,f=+r.firmed||0,m=document.getElementById('qtyMode')?.value||'sum';return m==='planned'?p:m==='firmed'?f:m==='max'?Math.max(p,f):p+f}
function lineCalc(r){let pk=packIndex()[String(r.material||'').trim().toUpperCase()],qty=usedQty(r),ipp=pk?+pk.itemsPerPallet||0:0;return{qty,pk,ipp,pallets:ipp>0?Math.ceil(qty/ipp):0,status:!pk?'SEM EMBALAGEM':ipp<=0?'LOTE INVÁLIDO':'OK'}}
function optimizeVehicles(pallets){const c=db.config,cap=c.capacity,n=Math.ceil(Math.max(0,pallets)/cap);if(!pallets)return[];let out=[],base=Math.floor(pallets/n),extra=pallets%n;for(let i=0;i<n;i++){let load=base+(i<extra?1:0);out.push({pallets:load,occ:load/cap})}return out}
function totals(){let lines=db.plan.map((r,i)=>({...lineCalc(r),row:r,index:i})),pieces=lines.reduce((a,x)=>a+x.qty,0),pallets=lines.reduce((a,x)=>a+x.pallets,0),w=Math.max(1,db.config.windows),windowPallets=Array(w).fill(0);for(let i=0;i<pallets;i++)windowPallets[i%w]++;let vehicles=[];windowPallets.forEach((p,wi)=>optimizeVehicles(p).forEach((v,vi)=>vehicles.push({...v,window:wi+1,vehicle:vi+1})));let perWeek=vehicles.length,before=db.config.beforePerWeek,avoidedWeek=Math.max(0,before-perWeek),weeks=db.config.periodWeeks,avoided=avoidedWeek*weeks,saving=avoided*db.config.cost,km=avoided*db.config.distance,ttw=km*db.config.ttw,wtw=km*(db.config.ttw+db.config.wtt),avg=vehicles.length?vehicles.reduce((a,v)=>a+v.occ,0)/vehicles.length:0;return{lines,pieces,pallets,windowPallets,vehicles,perWeek,avoidedWeek,avoided,saving,km,ttw,wtw,avg,red:before?avoidedWeek/before:0,crit:lines.filter(x=>x.status!=='OK')}}
function kpi(label,value,note){return `<div class="card"><div class="kpi-label">${label}</div><div class="kpi-value">${value}</div><div class="kpi-note">${note}</div></div>`}
function occStatus(o){return o>db.config.maxOcc/100?['ACIMA DE 100%','bad']:o<db.config.minOcc/100?['ABAIXO DE 85%','warn']:['OK','ok']}
function renderDashboard(){let t=totals();kpiGrid.innerHTML=[kpi('Peças',fmt(t.pieces),'Quantidade calculada'),kpi('Pallets',fmt(t.pallets),'Pela base de embalagens'),kpi('Carretas/semana',fmt(t.perWeek),'Plano otimizado'),kpi('Ocupação média',pct(t.avg),'Alvo 85%–100%'),kpi('Saving',money(t.saving),db.config.weekLabel),kpi('CO₂ TTW evitado',fmt(t.ttw/1000,2)+' t','Estimativa')].join('');windowCards.innerHTML=t.windowPallets.map((p,i)=>`<div class="pill">Janela ${i+1}: ${p} pallets</div>`).join('')||'<div class="smalltxt">Sem planejamento.</div>';planSummary.innerHTML=`O plano possui <b>${fmt(t.pallets)} pallets</b> e requer <b>${t.perWeek} carreta(s) por semana</b> em <b>${db.config.windows} janela(s)</b>. Economia potencial no período: <b>${money(t.saving)}</b>.`;criticalSummary.innerHTML=t.crit.length?`<span class="badge bad">${t.crit.length} material(is) crítico(s)</span><div class="smalltxt" style="margin-top:8px">Cadastre ou corrija embalagem/lote antes da contratação.</div>`:'<span class="badge ok">Todos os materiais com embalagem válida</span>';drawOccChart(t)}
function renderPlanning(){let t=totals();planMeta.textContent=`${db.plan.length} linhas • ${fmt(t.pieces)} peças • ${fmt(t.pallets)} pallets`;planRows.innerHTML=t.lines.map(x=>{let s=occStatus(x.status==='OK'?0.9:0);return `<tr><td>${esc(x.row.material)}</td><td>${esc(x.pk?.description||x.row.description||'')}</td><td class="num">${fmt(x.row.planned)}</td><td class="num">${fmt(x.row.firmed)}</td><td class="num">${fmt(x.qty)}</td><td class="num">${fmt(x.ipp)}</td><td class="num">${fmt(x.pallets)}</td><td><span class="badge ${x.status==='OK'?'ok':'bad'}">${x.status}</span></td></tr>`}).join('')}
function receivingQty(r,mode){if(mode==='current')mode=document.getElementById('qtyMode')?.value||'sum';let p=+r.planned||0,f=+r.firmed||0;if(mode==='firmed')return f>0?f:p;if(mode==='planned')return p;if(mode==='max')return Math.max(p,f);return p+f}
function receivingWindowsData(){let mode=document.getElementById('windowReceiptMode')?.value||'current',packs=packIndex(),map=new Map();(db.dailyReceipts||[]).forEach(r=>{let qty=receivingQty(r,mode);if(!qty)return;let pk=packs[String(r.material||'').trim().toUpperCase()],ipp=pk?+pk.itemsPerPallet||0:0,pallets=ipp?Math.ceil(qty/ipp):0;let w=map.get(r.date)||{date:r.date,items:[],pieces:0,pallets:0};w.items.push({...r,qty,pk,ipp,pallets,status:pk&&ipp?'OK':'SEM EMBALAGEM'});w.pieces+=qty;w.pallets+=pallets;map.set(r.date,w)});return [...map.values()].sort((a,b)=>a.date.localeCompare(b.date)).map((w,i)=>{let vehicles=w.pallets?Math.ceil(w.pallets/db.config.capacity):0,occ=vehicles?w.pallets/(vehicles*db.config.capacity):0,st=occStatus(occ);return {...w,window:i+1,vehicles,occ,status:st[0],statusClass:st[1]}})}
function renderReceivingWindows(){let cards=document.getElementById('receivingWindowCards'),kg=document.getElementById('windowKpis');if(!cards||!kg)return;let ws=receivingWindowsData(),pieces=ws.reduce((a,w)=>a+w.pieces,0),pallets=ws.reduce((a,w)=>a+w.pallets,0),vehicles=ws.reduce((a,w)=>a+w.vehicles,0),avg=vehicles?pallets/(vehicles*db.config.capacity):0,pn=new Set((db.dailyReceipts||[]).map(x=>String(x.material).toUpperCase())).size;kg.innerHTML=[kpi('Janelas por data',fmt(ws.length),'Datas com entrega'),kpi('Part Numbers',fmt(pn),'No período'),kpi('Peças',fmt(pieces),'Total'),kpi('Pallets',fmt(pallets),'Calculado'),kpi('Carretas',fmt(vehicles),'Necessidade'),kpi('Ocupação média',pct(avg),'Meta 85%–100%')].join('');if(!ws.length){cards.innerHTML='<div class="notice">Nenhuma janela diária encontrada. Reimporte o planejamento e selecione novamente o período.</div>';return}cards.innerHTML=ws.map(w=>{let d=new Date(w.date+'T00:00:00'),dateTxt=d.toLocaleDateString('pt-BR'),week='S'+isoWeek(d),unique=new Set(w.items.map(x=>String(x.material).toUpperCase())).size;return `<details class="receiving-window" open><summary><div class="rw-main"><b>Janela ${w.window} — ${dateTxt}</b><span class="pill">${week}</span></div><div class="rw-metrics"><span><b>${fmt(unique)}</b> PN</span><span><b>${fmt(w.pieces)}</b> peças</span><span><b>${fmt(w.pallets)}</b> pallets</span><span><b>${fmt(w.vehicles)}</b> carreta(s)</span><span class="badge ${w.statusClass}">${w.status} • ${pct(w.occ)}</span></div></summary><div class="rw-body"><div class="table-wrap"><table><thead><tr><th>Part Number</th><th>Descrição</th><th>Planned</th><th>Firmed</th><th>Qtd. entrega</th><th>Itens/Pallet</th><th>Pallets</th><th>Status</th></tr></thead><tbody>${w.items.map(r=>`<tr><td><b>${esc(r.material)}</b></td><td>${esc(r.pk?.description||r.description||'')}</td><td class="num">${fmt(r.planned)}</td><td class="num">${fmt(r.firmed)}</td><td class="num"><b>${fmt(r.qty)}</b></td><td class="num">${r.ipp?fmt(r.ipp):'—'}</td><td class="num"><b>${r.status==='OK'?fmt(r.pallets):'—'}</b></td><td><span class="badge ${r.status==='OK'?'ok':'bad'}">${r.status}</span></td></tr>`).join('')}</tbody><tfoot><tr><th colspan="4">Total da janela</th><th class="num">${fmt(w.pieces)}</th><th></th><th class="num">${fmt(w.pallets)}</th><th>${fmt(unique)} PN</th></tr></tfoot></table></div><div class="rw-summary"><span>Data: <b>${dateTxt}</b></span><span>Semana: <b>${week}</b></span><span>Ocupação: <b>${pct(w.occ)}</b></span><span>Capacidade: <b>${fmt(w.pallets)} / ${fmt(w.vehicles*db.config.capacity)} pallets</b></span></div></div></details>`}).join('')}
function expandAllWindows(open){document.querySelectorAll('.receiving-window').forEach(x=>x.open=open)}

function weekNumberFromLabel(label){
  let m=String(label||'').match(/S?W?(\d{1,2})/i);return m?+m[1]:null;
}
function currentPlanningWeek(){
  let labels=[];
  if(db.selectedPeriods){
    [db.selectedPeriods.planned?.label,db.selectedPeriods.firmed?.label].filter(Boolean).forEach(x=>labels.push(x));
  }
  let wk=labels.length?weekNumberFromLabel(labels[0]):weekNumberFromLabel(db.config.weekLabel);
  return wk||new Date().getWeek?.()||null;
}
function weekDateRangeFromDaily(){
  let dates=(db.dailyReceipts||[]).map(x=>x.date).filter(Boolean).sort();
  if(!dates.length)return '';
  let a=new Date(dates[0]+'T00:00:00'),b=new Date(dates[dates.length-1]+'T00:00:00');
  return `${a.toLocaleDateString('pt-BR')}–${b.toLocaleDateString('pt-BR')}`;
}
function saveWeeklyPlanning(){
  let t=totals(),week=currentPlanningWeek();
  if(!week){let x=prompt('Informe o número da semana (ex.: 35):');week=+x||null}
  if(!week){alert('Não foi possível identificar a semana.');return}
  let route=db.config.routeName||'Rota não definida',period=weekDateRangeFromDaily()||db.config.weekLabel||('W'+week);
  let rec={
    id:Date.now(),route,week,weekLabel:'W'+week,period,dateSaved:new Date().toLocaleString('pt-BR'),
    pieces:t.pieces,pallets:t.pallets,vehicles:t.perWeek,occ:t.avg,
    capacity:t.perWeek*db.config.capacity,capacityNominal:db.config.capacity,
    costPerVehicle:db.config.cost,distance:db.config.distance,ttwFactor:db.config.ttw
  };
  let same=db.weeklyHistory.findIndex(x=>x.route===route&&+x.week===+week);
  if(same>=0){
    if(!confirm(`Já existe um planejamento salvo para ${route} - W${week}. Substituir pelo cenário atual?`))return;
    db.weeklyHistory[same]=rec;
  }else db.weeklyHistory.push(rec);
  db.weeklyHistory.sort((a,b)=>a.route.localeCompare(b.route)||a.week-b.week);
  persist();renderWeeklyHistory();alert(`Planejamento W${week} salvo no histórico.`);
}
function weeklyFiltered(){
  let all=(db.weeklyHistory||[]).slice().sort((a,b)=>a.route.localeCompare(b.route)||a.week-b.week);
  let route=document.getElementById('histRouteFilter')?.value||'ALL';
  if(route!=='ALL')all=all.filter(x=>x.route===route);
  let start=+document.getElementById('histStartWeek')?.value||null,end=+document.getElementById('histEndWeek')?.value||null;
  if(start)all=all.filter(x=>+x.week>=start);if(end)all=all.filter(x=>+x.week<=end);
  return all;
}
function renderHistoryFilters(){
  let routeSel=document.getElementById('histRouteFilter'),startSel=document.getElementById('histStartWeek'),endSel=document.getElementById('histEndWeek');
  if(!routeSel||!startSel||!endSel)return;
  let routes=[...new Set((db.weeklyHistory||[]).map(x=>x.route))].sort(),weeks=[...new Set((db.weeklyHistory||[]).map(x=>+x.week))].sort((a,b)=>a-b);
  let oldR=routeSel.value||'ALL',oldS=startSel.value,oldE=endSel.value;
  routeSel.innerHTML='<option value="ALL">Todas as rotas</option>'+routes.map(r=>`<option value="${esc(r)}">${esc(r)}</option>`).join('');
  if([...routeSel.options].some(o=>o.value===oldR))routeSel.value=oldR;
  startSel.innerHTML='<option value="">Primeira disponível</option>'+weeks.map(w=>`<option value="${w}">W${w}</option>`).join('');
  endSel.innerHTML='<option value="">Última disponível</option>'+weeks.map(w=>`<option value="${w}">W${w}</option>`).join('');
  if(oldS&&[...startSel.options].some(o=>o.value===oldS))startSel.value=oldS;
  if(oldE&&[...endSel.options].some(o=>o.value===oldE))endSel.value=oldE;
}
function historyComparisons(rows){
  let mode=document.getElementById('histCompareMode')?.value||'previous',byRoute=new Map(),out=[];
  rows.forEach(r=>{
    let arr=byRoute.get(r.route)||[],ref=null;
    if(mode==='first')ref=arr[0]||null; else ref=arr[arr.length-1]||null;
    let delta=ref?r.vehicles-ref.vehicles:0;
    let savingDelta=ref?(-delta)*(r.costPerVehicle||db.config.cost):0;
    let avoidedKm=ref?(-delta)*(r.distance||db.config.distance):0;
    let co2Delta=avoidedKm*(r.ttwFactor||db.config.ttw);
    let cumulative=(arr.length?arr[arr.length-1]._cumSaving:0)+savingDelta;
    let x={...r,_ref:ref,_delta:delta,_savingDelta:savingDelta,_co2Delta:co2Delta,_cumSaving:cumulative};
    arr.push(x);byRoute.set(r.route,arr);out.push(x);
  });
  return out;
}
function renderWeeklyHistory(){
  if(!document.getElementById('historyKpis'))return;
  renderHistoryFilters();
  let rows=historyComparisons(weeklyFiltered()),kg=document.getElementById('historyKpis');
  let totalSaving=rows.reduce((a,x)=>a+x._savingDelta,0),totalCo2=rows.reduce((a,x)=>a+x._co2Delta,0),avgOcc=rows.length?rows.reduce((a,x)=>a+x.occ,0)/rows.length:0;
  let first=rows[0],last=rows[rows.length-1],netDelta=(first&&last)?last.vehicles-first.vehicles:0;
  kg.innerHTML=[
    kpi('Semanas analisadas',fmt(rows.length),'No filtro atual'),
    kpi('Carretas última semana',last?fmt(last.vehicles):'—',last?last.weekLabel:'Sem dados'),
    kpi('Variação líquida',rows.length>1?`${netDelta>0?'+':''}${fmt(netDelta)}`:'—','Última vs primeira'),
    kpi('Ocupação média',pct(avgOcc),'Período selecionado'),
    kpi('Saving incremental',money(totalSaving),'Comparativo semanal'),
    kpi('CO₂ evitado incremental',fmt(totalCo2/1000,2)+' t','TTW estimado')
  ].join('');
  let tbody=document.getElementById('weeklyHistoryRows');
  tbody.innerHTML=rows.length?rows.map(x=>{
    let dcl=x._delta<0?'ok':x._delta>0?'bad':'warn',deltaTxt=(x._delta>0?'+':'')+fmt(x._delta),capPct=x.capacity?x.pallets/x.capacity:0;
    return `<tr><td>${esc(x.route)}</td><td><b>${x.weekLabel}</b></td><td>${esc(x.period||'')}</td><td class="num">${fmt(x.pieces)}</td><td class="num">${fmt(x.pallets)}</td><td class="num"><b>${fmt(x.vehicles)}</b></td><td><span class="badge ${dcl}">${deltaTxt}</span></td><td class="num">${pct(x.occ)}</td><td class="num">${fmt(x.pallets)} / ${fmt(x.capacity)} (${pct(capPct)})</td><td class="num">${money(x._savingDelta)}</td><td class="num">${money(x._cumSaving)}</td><td class="num">${fmt(x._co2Delta/1000,3)} t</td><td><button class="btn small danger" onclick="deleteWeeklyPlanning(${x.id})">Excluir</button></td></tr>`;
  }).join(''):'<tr><td colspan="13"><div class="smalltxt">Nenhuma semana salva. Processe um planejamento e clique em “Salvar semana atual”.</div></td></tr>';
  let summary=document.getElementById('historyPeriodSummary');
  if(rows.length){
    let minW=Math.min(...rows.map(x=>x.week)),maxW=Math.max(...rows.map(x=>x.week));
    let minV=Math.min(...rows.map(x=>x.vehicles)),maxV=Math.max(...rows.map(x=>x.vehicles));
    summary.innerHTML=`Período <b>W${minW}–W${maxW}</b>: foram analisadas <b>${rows.length} semanas</b>. A necessidade variou entre <b>${minV}</b> e <b>${maxV}</b> carretas/semana. Comparando a primeira com a última semana do filtro, a variação líquida foi de <b>${netDelta>0?'+':''}${netDelta} carreta(s)</b>. O saving incremental acumulado no comparativo selecionado é de <b>${money(totalSaving)}</b>, com <b>${fmt(totalCo2/1000,2)} t CO₂e TTW</b> evitadas quando há redução de viagens.`;
  }else summary.innerHTML='Salve pelo menos uma semana de planejamento para iniciar o histórico.';
  drawHistoryVehicles(rows);drawHistoryOccupancy(rows);drawHistorySaving(rows);
}
function deleteWeeklyPlanning(id){
  if(confirm('Excluir este planejamento semanal do histórico?')){db.weeklyHistory=db.weeklyHistory.filter(x=>x.id!==id);persist();renderWeeklyHistory()}
}
function exportWeeklyHistory(){
  if(!(db.weeklyHistory||[]).length){alert('Não há histórico para exportar.');return}
  if(typeof XLSX==='undefined'){alert('Biblioteca Excel indisponível.');return}
  let rows=historyComparisons(weeklyFiltered()).map(x=>({
    'Rota':x.route,'Semana':x.weekLabel,'Período':x.period,'Peças':x.pieces,'Pallets':x.pallets,'Carretas':x.vehicles,
    'Variação Carretas':x._delta,'Ocupação':x.occ,'Capacidade pallets':x.capacity,'Saving incremental':x._savingDelta,
    'Saving acumulado':x._cumSaving,'CO2 TTW evitado kg':x._co2Delta
  }));
  let ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Histórico Semanal');XLSX.writeFile(wb,'WK_Historico_Semanal.xlsx');
}
function drawHistoryVehicles(rows){
  let s=document.getElementById('histVehiclesChart');if(!s)return;s.innerHTML='';if(!rows.length)return;
  let max=Math.max(1,...rows.map(x=>x.vehicles))*1.25,w=560/Math.max(1,rows.length);
  rows.forEach((r,i)=>{let h=170*r.vehicles/max,x=70+i*w,y=215-h;s.appendChild(svgEl('rect',{x,y,width:Math.max(20,w-14),height:h,rx:6,fill:'#1f5f93'}));st(s,x+(w-14)/2,y-7,fmt(r.vehicles),11,'middle','#15345d','700');st(s,x+(w-14)/2,238,r.weekLabel,10)});
  st(s,350,25,'Carretas programadas por semana',13,'middle','#15345d','700');
}
function drawHistoryOccupancy(rows){
  let s=document.getElementById('histOccChart');if(!s)return;s.innerHTML='';if(!rows.length)return;
  let base=215,w=560/Math.max(1,rows.length),mx=1.05;
  [db.config.minOcc/100,db.config.maxOcc/100].forEach(v=>{let y=base-v/mx*170;s.appendChild(svgEl('line',{x1:65,y1:y,x2:650,y2:y,stroke:v>=1?'#b42318':'#9a6700','stroke-dasharray':'5 5'}));st(s,60,y+4,Math.round(v*100)+'%',10,'end')});
  rows.forEach((r,i)=>{let h=Math.min(mx,r.occ)/mx*170,x=70+i*w,y=base-h,col=r.occ>=db.config.minOcc/100&&r.occ<=1?'#4f9b53':'#e0a92f';s.appendChild(svgEl('rect',{x,y,width:Math.max(20,w-14),height:h,rx:6,fill:col}));st(s,x+(w-14)/2,y-7,pct(r.occ),10);st(s,x+(w-14)/2,238,r.weekLabel,10)});
}
function drawHistorySaving(rows){
  let s=document.getElementById('histSavingChart');if(!s)return;s.innerHTML='';if(!rows.length)return;
  let vals=rows.map(x=>x._cumSaving),min=Math.min(0,...vals),max=Math.max(1,...vals),range=max-min||1;
  let pts=rows.map((r,i)=>({x:60+i*580/Math.max(1,rows.length-1),y:215-((r._cumSaving-min)/range)*165,v:r._cumSaving,w:r.weekLabel}));
  if(pts.length>1)s.appendChild(svgEl('polyline',{points:pts.map(p=>p.x+','+p.y).join(' '),fill:'none',stroke:'#1f5f93','stroke-width':4}));
  pts.forEach((p,i)=>{s.appendChild(svgEl('circle',{cx:p.x,cy:p.y,r:4,fill:'#1f5f93'}));st(s,p.x,238,p.w,10);if(i===pts.length-1)st(s,p.x,p.y-10,money(p.v),11,'middle','#15345d','700')});
}

function renderPackaging(){let q=(packSearch?.value||'').toLowerCase(),rows=db.packaging.filter(p=>!q||[p.material,p.description,p.supplier].some(v=>String(v||'').toLowerCase().includes(q)));packCount.textContent=db.packaging.length;packRows.innerHTML=rows.map(p=>{let i=db.packaging.indexOf(p);return `<tr><td>${esc(p.supplier)}</td><td><b>${esc(p.material)}</b></td><td>${esc(p.description)}</td><td class="num">${fmt(p.itemsPerBox)}</td><td class="num">${fmt(p.boxesPerPallet)}</td><td class="num"><b>${fmt(p.itemsPerPallet)}</b></td><td><button class="btn" onclick="openPackModal(${i})">Editar</button></td></tr>`}).join('')}
function renderConfig(){let fields=[['capacity','Capacidade da carreta (pallets)'],['minOcc','Ocupação mínima (%)'],['maxOcc','Ocupação máxima (%)'],['cost','Custo por viagem (R$)'],['distance','Distância da rota (km)'],['ttw','Fator TTW kg CO₂e/km'],['wtt','Fator WTT kg CO₂e/km'],['windows','Janelas por semana'],['periodWeeks','Semanas no período'],['beforePerWeek','Veículos antes/semana'],['weekLabel','Identificação do período'],['routeName','Nome da rota']];configFields.innerHTML=fields.map(([k,l])=>`<div class="field"><label>${l}</label><input id="cfg_${k}" ${(k==='weekLabel'||k==='routeName')?'type="text"':'type="number" step="0.00001"'} value="${esc(db.config[k])}"></div>`).join('')}
function saveConfig(){Object.keys(db.config).forEach(k=>{let e=document.getElementById('cfg_'+k);if(e)db.config[k]=(k==='weekLabel'||k==='routeName')?e.value:+e.value});persist();render()}
function renderImpacts(){let t=totals();impactKpis.innerHTML=[kpi('Viagens evitadas',fmt(t.avoided),`${fmt(t.avoidedWeek)} por semana`),kpi('Redução',pct(t.red),'vs cenário anterior'),kpi('Saving',money(t.saving),db.config.weekLabel),kpi('Km evitados',fmt(t.km)+' km','No período'),kpi('CO₂ TTW',fmt(t.ttw/1000,2)+' t','Evitado'),kpi('CO₂ WTW',fmt(t.wtw/1000,2)+' t','Evitado')].join('');impactText.innerHTML=`A redução de <b>${db.config.beforePerWeek}</b> para <b>${t.perWeek}</b> veículo(s) semanais evita <b>${t.avoided}</b> viagens no período, aproximadamente <b>${fmt(t.km)} km</b> e <b>${fmt(t.ttw/1000,2)} t CO₂e TTW</b>.`;historyRows.innerHTML=(db.history||[]).map(h=>`<tr><td>${h.date}</td><td>${h.period}</td><td>${h.pallets}</td><td>${h.vehicles}</td><td>${h.occ}</td><td>${h.saving}</td><td>${h.co2}</td></tr>`).join('');drawImpactChart(t)}
function saveScenario(){let t=totals();db.history.unshift({date:new Date().toLocaleString('pt-BR'),period:db.config.weekLabel,pallets:t.pallets,vehicles:t.perWeek,occ:pct(t.avg),saving:money(t.saving),co2:fmt(t.ttw/1000,2)+' t'});persist();render()}
function drawOccChart(t){barChart('occChart',t.vehicles.map(v=>`J${v.window}-C${v.vehicle}`),t.vehicles.map(v=>v.occ*100),100,true)}function drawImpactChart(t){barChart('impactChart',['Antes','Depois'],[db.config.beforePerWeek,t.perWeek],Math.max(db.config.beforePerWeek,t.perWeek,1)*1.25,false)}function barChart(id,labels,vals,max,percent){let s=document.getElementById(id);if(!s)return;s.innerHTML='';let W=700,H=260,mx=max||Math.max(1,...vals)*1.2,w=560/Math.max(1,vals.length);vals.forEach((v,i)=>{let h=165*v/mx,x=70+i*w,y=210-h,c=percent?(v<db.config.minOcc?'#e6b800':v>db.config.maxOcc?'#c0504d':'#70ad47'):(i?'#7da6c7':'#1f4e79');let r=document.createElementNS('http://www.w3.org/2000/svg','rect');Object.entries({x,y,width:Math.max(22,w-16),height:h,rx:7,fill:c}).forEach(([k,a])=>r.setAttribute(k,a));s.appendChild(r);svgText(s,x+(w-16)/2,y-8,percent?fmt(v,1)+'%':fmt(v),12);svgText(s,x+(w-16)/2,234,labels[i],10)})}function svgText(s,x,y,v,size){let e=document.createElementNS('http://www.w3.org/2000/svg','text');e.setAttribute('x',x);e.setAttribute('y',y);e.setAttribute('font-size',size);e.setAttribute('text-anchor','middle');e.setAttribute('fill','#4b5563');e.textContent=v;s.appendChild(e)}
function renderLoadSelectors(){let t=totals(),wins=[...new Set(t.vehicles.map(v=>v.window))];loadWindow.innerHTML=wins.map(w=>`<option value="${w}">Janela ${w}</option>`).join('');refreshLoadVehicles(false)}function refreshLoadVehicles(draw=true){let t=totals(),w=+loadWindow.value||1,vs=t.vehicles.filter(v=>v.window===w);let prev=+loadVehicle.value||1;loadVehicle.innerHTML=vs.map(v=>`<option value="${v.vehicle}">Carreta ${v.vehicle}</option>`).join('');if(vs.some(v=>v.vehicle===prev))loadVehicle.value=prev;if(draw)render3DLoad()}
function render3DLoad(){let t=totals(),w=+loadWindow.value||1,vn=+loadVehicle.value||1,v=t.vehicles.find(x=>x.window===w&&x.vehicle===vn)||{pallets:0,occ:0,window:w,vehicle:vn},st=occStatus(v.occ);loadKpis.innerHTML=[kpi('Janela',v.window,'Selecionada'),kpi('Carreta',v.vehicle,'Selecionada'),kpi('Pallets',v.pallets+' / '+db.config.capacity,'Carregamento previsto'),kpi('Ocupação',pct(v.occ),'Taxa calculada'),kpi('Status',st[0],'Meta 85%–100%'),kpi('Posições livres',Math.max(0,db.config.capacity-v.pallets),'Capacidade residual')].join('');loadDetail.innerHTML=`<b>Janela ${v.window} • Carreta ${v.vehicle}</b><br>${v.pallets} pallets previstos, ocupação de ${pct(v.occ)}. <span class="badge ${st[1]}">${st[0]}</span>`;drawTruck(v.pallets);drawLayers(v.pallets)}
function drawLayers(count){let html='';for(let layer=0;layer<2;layer++){html+=`<b>Camada ${layer+1}</b><div class="layer-map">`;for(let i=0;i<26;i++){let pos=layer*26+i;html+=`<i class="layer-cell ${pos<count?'':'empty'}"></i>`}html+='</div>'}layerMaps.innerHTML=html}
function drawTruck(count){let c=loadCanvas,ctx=c.getContext('2d'),W=c.width,H=c.height;ctx.clearRect(0,0,W,H);ctx.save();ctx.translate(W/2,H/2+40);ctx.rotate(angle*Math.PI/180);let sx=24,sy=36,g=5,cols=13,rows=2;for(let layer=0;layer<2;layer++){let ox=-cols*(sx+g)/2,oy=-rows*(sy+g)/2-layer*95;for(let r=0;r<rows;r++)for(let col=0;col<cols;col++){let idx=layer*26+r*cols+col,x=ox+col*(sx+g),y=oy+r*(sy+g);ctx.fillStyle=idx<count?'#c58e55':'#f7f8fa';ctx.strokeStyle=idx<count?'#805629':'#94a3b8';ctx.setLineDash(idx<count?[]:[4,3]);ctx.fillRect(x,y,sx,sy);ctx.strokeRect(x,y,sx,sy)}ctx.setLineDash([]);ctx.strokeStyle='#64748b';ctx.lineWidth=3;ctx.strokeRect(ox-12,oy-12,cols*(sx+g)+18,rows*(sy+g)+18)}ctx.restore()}
function rotateLoad(d){angle+=d;render3DLoad()}function resetLoadView(){angle=-36;render3DLoad()}loadCanvas?.addEventListener('mousedown',e=>{drag=true;lastX=e.clientX});window.addEventListener('mouseup',()=>drag=false);window.addEventListener('mousemove',e=>{if(!drag)return;angle+=(e.clientX-lastX)*.25;lastX=e.clientX;render3DLoad()});
function openPackModal(i=-1){editingPack=i;let p=i>=0?db.packaging[i]:{supplier:'',supplierCode:'',material:'',description:'',itemsPerBox:0,boxesPerPallet:0,itemsPerPallet:0,unit:'PC'};packModalTitle.textContent=i>=0?'Editar material':'Novo material';let fs=[['supplier','Fornecedor'],['supplierCode','Código fornecedor'],['material','Material'],['description','Descrição'],['itemsPerBox','Itens por caixa'],['boxesPerPallet','Caixas por pallet'],['itemsPerPallet','Itens por pallet (lote)'],['unit','Unidade']];packForm.innerHTML=fs.map(([k,l])=>`<div class="field"><label>${l}</label><input id="pf_${k}" ${k.startsWith('items')||k.startsWith('boxes')?'type="number"':''} value="${esc(p[k])}"></div>`).join('');packModal.classList.add('show')}function closePackModal(){packModal.classList.remove('show')}function savePackRecord(){let obj={};['supplier','supplierCode','material','description','itemsPerBox','boxesPerPallet','itemsPerPallet','unit'].forEach(k=>{let v=document.getElementById('pf_'+k).value;obj[k]=['itemsPerBox','boxesPerPallet','itemsPerPallet'].includes(k)?+v:v});if(!obj.itemsPerPallet)obj.itemsPerPallet=obj.itemsPerBox*obj.boxesPerPallet;if(editingPack>=0)db.packaging[editingPack]=obj;else db.packaging.unshift(obj);persist();closePackModal();render()}
function importPackaging(e){readWorkbook(e.target.files[0],rows=>{let cols=Object.keys(rows[0]||{}),m=autoMap(cols);db.packaging=rows.map(r=>({supplier:r[m.supplier]||'',supplierCode:'',material:r[m.material]||'',description:r[m.description]||'',itemsPerBox:num(r[m.itemsPerBox]),boxesPerPallet:num(r[m.boxesPerPallet]),itemsPerPallet:num(r[m.itemsPerPallet])||num(r[m.itemsPerBox])*num(r[m.boxesPerPallet]),unit:'PC'})).filter(x=>x.material);persist();render()})}
function readPlanningFile(e){let f=e.target.files[0];if(!f)return;let reader=new FileReader();reader.onload=x=>{currentBook=XLSX.read(x.target.result,{type:'array',cellDates:true});sheetSelect.innerHTML=currentBook.SheetNames.map(n=>`<option>${n}</option>`).join('');changePlanSheet();mapModal.classList.add('show')};reader.readAsArrayBuffer(f)}
function parseDateHeader(v){
  if(v instanceof Date&&!isNaN(v))return new Date(v.getFullYear(),v.getMonth(),v.getDate());
  let s=String(v||'').trim(),m=s.match(/^(\d{1,2})[.\/-](\d{1,2})[.\/-](\d{4})$/);
  if(m)return new Date(+m[3],+m[2]-1,+m[1]);
  let d=new Date(s);return isNaN(d)?null:new Date(d.getFullYear(),d.getMonth(),d.getDate());
}
function isoDate(d){if(!d)return'';return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function isoWeek(d){let x=new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate()));x.setUTCDate(x.getUTCDate()+4-(x.getUTCDay()||7));let y=new Date(Date.UTC(x.getUTCFullYear(),0,1));return Math.ceil((((x-y)/86400000)+1)/7)}
function dateRangeLabel(a,b){if(!a||!b)return'';let da=new Date(a+'T00:00:00'),dbb=new Date(b+'T00:00:00'),wa=isoWeek(da),wb=isoWeek(dbb);return wa===wb?`S${wa}`:`S${wa}–S${wb}`}
function rangeSum(row,dateCols,start,end){if(!start||!end)return 0;let a=new Date(start+'T00:00:00'),b=new Date(end+'T23:59:59');return dateCols.reduce((sum,o)=>sum+(o.date>=a&&o.date<=b?num(row[o.col]):0),0)}
function changePlanSheet(){
  let ws=currentBook.Sheets[sheetSelect.value],rows=XLSX.utils.sheet_to_json(ws,{defval:'',raw:false,dateNF:'dd.mm.yyyy'});currentRows=rows;
  let cols=Object.keys(rows[0]||{}),auto=autoMap(cols),dateCols=cols.map(c=>({col:c,date:parseDateHeader(c)})).filter(x=>x.date).sort((a,b)=>a.date-b.date);
  let textCol=cols.find(c=>['texto','text','mrp element','elemento mrp'].includes(String(c).toLowerCase().trim()))||cols.find(c=>String(c).toLowerCase().includes('texto'));
  let sapMode=!!(textCol&&dateCols.length);window.__planningImport={sapMode,dateCols,textCol};
  if(sapMode){
    let first=isoDate(dateCols[0].date),last=isoDate(dateCols[dateCols.length-1].date);
    mappingFields.innerHTML=`
      <div class="field"><label>Material</label><select id="map_material">${cols.map(c=>`<option ${c===auto.material?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Descrição</label><select id="map_description"><option value="">— não usar —</option>${cols.map(c=>`<option ${c===auto.description?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Coluna do tipo de recebimento</label><select id="map_receiptType">${cols.map(c=>`<option ${c===textCol?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
      <div class="field"><label>Formato detectado</label><input value="Receipts por data (SAP)" disabled></div>
      <div class="period-box"><b>Planned Receipts</b><div class="period-grid">
        <div class="field"><label>Data inicial</label><input id="plannedStart" type="date" value="${first}" onchange="updatePeriodInfo()"></div>
        <div class="field"><label>Data final</label><input id="plannedEnd" type="date" value="${last}" onchange="updatePeriodInfo()"></div>
      </div><div class="smalltxt" id="plannedPeriodInfo"></div></div>
      <div class="period-box"><b>Firmed Receipts</b><div class="period-grid">
        <div class="field"><label>Data inicial</label><input id="firmedStart" type="date" value="${first}" onchange="updatePeriodInfo()"></div>
        <div class="field"><label>Data final</label><input id="firmedEnd" type="date" value="${last}" onchange="updatePeriodInfo()"></div>
      </div><div class="smalltxt" id="firmedPeriodInfo"></div></div>`;
    setTimeout(updatePeriodInfo,0);
  }else{
    mappingFields.innerHTML=[['material','Material'],['description','Descrição'],['planned','Planned Receipts'],['firmed','Firmed Receipts']].map(([k,l])=>`<div class="field"><label>${l}</label><select id="map_${k}"><option value="">— não usar —</option>${cols.map(c=>`<option ${c===auto[k]?'selected':''}>${esc(c)}</option>`).join('')}</select></div>`).join('');
  }
  previewTable.innerHTML='<tr>'+cols.slice(0,10).map(c=>`<th>${esc(c)}</th>`).join('')+'</tr>'+rows.slice(0,7).map(r=>'<tr>'+cols.slice(0,10).map(c=>`<td>${esc(r[c])}</td>`).join('')+'</tr>').join('');
}
function updatePeriodInfo(){
  let ps=document.getElementById('plannedStart')?.value,pe=document.getElementById('plannedEnd')?.value,fs=document.getElementById('firmedStart')?.value,fe=document.getElementById('firmedEnd')?.value;
  let pi=document.getElementById('plannedPeriodInfo'),fi=document.getElementById('firmedPeriodInfo');
  if(pi)pi.textContent=ps&&pe?`Período selecionado: ${new Date(ps+'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(pe+'T00:00:00').toLocaleDateString('pt-BR')} • ${dateRangeLabel(ps,pe)}`:'Selecione o período.';
  if(fi)fi.textContent=fs&&fe?`Período selecionado: ${new Date(fs+'T00:00:00').toLocaleDateString('pt-BR')} a ${new Date(fe+'T00:00:00').toLocaleDateString('pt-BR')} • ${dateRangeLabel(fs,fe)}`:'Selecione o período.';
}
function applyMapping(){
  let imp=window.__planningImport||{};
  if(imp.sapMode){
    let material=document.getElementById('map_material').value,description=document.getElementById('map_description').value,typeCol=document.getElementById('map_receiptType').value;
    let ps=document.getElementById('plannedStart').value,pe=document.getElementById('plannedEnd').value,fs=document.getElementById('firmedStart').value,fe=document.getElementById('firmedEnd').value;
    if(!material||!typeCol){alert('Mapeie Material e Tipo de recebimento.');return}
    if((ps&&!pe)||(!ps&&pe)||(fs&&!fe)||(!fs&&fe)){alert('Informe data inicial e final para cada período utilizado.');return}
    if(ps&&pe&&ps>pe){alert('No Planned Receipts, a data inicial deve ser anterior à final.');return}
    if(fs&&fe&&fs>fe){alert('No Firmed Receipts, a data inicial deve ser anterior à final.');return}
    let agg=new Map(),daily=new Map();
    let psDate=ps?new Date(ps+'T00:00:00'):null,peDate=pe?new Date(pe+'T23:59:59'):null,fsDate=fs?new Date(fs+'T00:00:00'):null,feDate=fe?new Date(fe+'T23:59:59'):null;
    currentRows.forEach(r=>{
      let mat=String(r[material]||'').trim();if(!mat)return;
      let typ=String(r[typeCol]||'').trim().toLowerCase(),isP=typ.includes('planned receipt'),isF=typ.includes('firmed receipt');if(!isP&&!isF)return;
      let desc=description?String(r[description]||''):'',key=mat.toUpperCase(),cur=agg.get(key)||{material:mat,description:desc,planned:0,firmed:0};
      imp.dateCols.forEach(dc=>{let inP=isP&&psDate&&peDate&&dc.date>=psDate&&dc.date<=peDate,inF=isF&&fsDate&&feDate&&dc.date>=fsDate&&dc.date<=feDate;if(!inP&&!inF)return;let q=num(r[dc.col]);if(!q)return;let ds=isoDate(dc.date),dk=key+'|'+ds,day=daily.get(dk)||{material:mat,description:desc,date:ds,planned:0,firmed:0};if(inP){day.planned+=q;cur.planned+=q}if(inF){day.firmed+=q;cur.firmed+=q}daily.set(dk,day)});
      agg.set(key,cur);
    });
    db.plan=[...agg.values()].filter(x=>x.planned||x.firmed);
    db.dailyReceipts=[...daily.values()].sort((a,b)=>a.date.localeCompare(b.date)||String(a.material).localeCompare(String(b.material)));
    db.selectedPeriods={planned:{start:ps,end:pe,label:dateRangeLabel(ps,pe)},firmed:{start:fs,end:fe,label:dateRangeLabel(fs,fe)}};
    let labels=[db.selectedPeriods.planned.label,db.selectedPeriods.firmed.label].filter(Boolean);if(labels.length)db.config.weekLabel=[...new Set(labels)].join(' / ');
    persist();closeMapModal();render();return;
  }
  let mm={};['material','description','planned','firmed'].forEach(k=>{let el=document.getElementById('map_'+k);mm[k]=el?el.value:''});
  if(!mm.material){alert('Mapeie a coluna Material.');return}
  db.plan=currentRows.map(r=>({material:r[mm.material]||'',description:mm.description?r[mm.description]||'':'',planned:mm.planned?num(r[mm.planned]):0,firmed:mm.firmed?num(r[mm.firmed]):0})).filter(x=>x.material);db.dailyReceipts=[];
  persist();closeMapModal();render();
}
function closeMapModal(){mapModal.classList.remove('show')}function reprocessPlan(){render()}function loadDemoPlan(){db.plan=clone(window.DEMO_PLAN||[]);persist();render()}
function autoMap(cols){let defs={material:['material','item','part','codigo','número','numero'],description:['desc','descrição','descricao'],planned:['planned receipts','planned'],firmed:['firmed receipts','firmed'],supplier:['fornecedor','supplier'],itemsPerBox:['itens por caixa','items/box','parts/hu','pecas caixa','peças caixa'],boxesPerPallet:['caixas por pallet','box pallet','hu/pallet'],itemsPerPallet:['itens por pallet','total itens pallet','lote','parts/pallet']},o={};Object.keys(defs).forEach(k=>o[k]=cols.find(c=>defs[k].some(t=>String(c).toLowerCase().includes(t)))||cols[0]);return o}function num(v){if(typeof v==='number')return v;return +String(v||0).replace(/\s/g,'').replace(/\./g,'').replace(',','.')||0}function readWorkbook(file,cb){let r=new FileReader();r.onload=e=>{let wb=XLSX.read(e.target.result,{type:'array'}),ws=wb.Sheets[wb.SheetNames[0]];cb(XLSX.utils.sheet_to_json(ws,{defval:''}))};r.readAsArrayBuffer(file)}
function exportBackup(){let b=new Blob([JSON.stringify(db,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='wk_transport_backup.json';a.click()}function exportProcessed(){let t=totals(),rows=t.lines.map(x=>({Material:x.row.material,Descricao:x.pk?.description||x.row.description,Planned:x.row.planned,Firmed:x.row.firmed,Quantidade:x.qty,ItensPallet:x.ipp,Pallets:x.pallets,Status:x.status})),ws=XLSX.utils.json_to_sheet(rows),wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,'Resultado');XLSX.writeFile(wb,'WK_resultado_planejamento.xlsx')}function resetAll(){if(confirm('Restaurar dados iniciais?')){db=clone(DEFAULT);persist();render()}}
function render(){renderDashboard();renderPlanning();renderReceivingWindows();renderWeeklyHistory();renderPackaging();renderConfig();renderImpacts();renderLoadSelectors()}render();
