/* ═══════════════════════════════════════════════════════════════════════
   STUDY TRACKER — Stargazer
   A personal trainer for study habits: log sessions with a stopwatch that
   rewards focus, track daily habits, and get data-driven recommendations
   on when/where/how you study best. All data lives in localStorage on
   this device (STORE_KEY below) — no backend required.
   ═══════════════════════════════════════════════════════════════════════ */
(function(){
'use strict';

const STORE_KEY   = 'sg-study-tracker-v1';
const SW_KEY       = 'sg-study-tracker-sw'; // in-progress stopwatch, survives refresh

/* ── REFERENCE DATA ──────────────────────────────────────────────── */

const TECHNIQUES = ['Active Recall','Pomodoro','Practice Problems','Spaced Repetition','Teaching / Explaining','Reading / Notes','Mock Test','Group Study'];
const LOCATIONS  = ['Home Desk','Library','Café','Outdoors','Classroom','Other'];

const HOUR_BUCKETS = [
  {key:'dawn',      label:'Early Morning', short:'5–8 AM',    axis:'Dawn',  test:h=>h>=5&&h<8},
  {key:'morning',    label:'Morning',       short:'8–11 AM',   axis:'Morn',  test:h=>h>=8&&h<11},
  {key:'midday',    label:'Midday',        short:'11 AM–2 PM',axis:'Mid',   test:h=>h>=11&&h<14},
  {key:'afternoon', label:'Afternoon',     short:'2–5 PM',    axis:'Aft',   test:h=>h>=14&&h<17},
  {key:'evening',   label:'Evening',       short:'5–8 PM',    axis:'Eve',   test:h=>h>=17&&h<20},
  {key:'night',     label:'Night',         short:'8–11 PM',   axis:'Night', test:h=>h>=20&&h<23},
  {key:'late',      label:'Late Night',    short:'11 PM–5 AM',axis:'Late',  test:h=>h>=23||h<5},
];

const DURATION_BUCKETS = [
  {key:'u15',   label:'<15m',    test:m=>m<15},
  {key:'15-30', label:'15–30m',  test:m=>m>=15&&m<30},
  {key:'30-45', label:'30–45m',  test:m=>m>=30&&m<45},
  {key:'45-60', label:'45–60m',  test:m=>m>=45&&m<60},
  {key:'60-90', label:'60–90m',  test:m=>m>=60&&m<90},
  {key:'90p',   label:'90m+',    test:m=>m>=90},
];

const THEMES = [
  {key:'default', name:'Stargazer Classic', unlockStreak:0,  accent:'var(--gr)', accentL:'var(--gr-l)', accent2:'var(--gd)', bg1:null,bg2:null},
  {key:'ocean',   name:'Deep Ocean',        unlockStreak:3,  accent:'#2a5f78',   accentL:'rgba(42,95,120,.14)',  accent2:'#5abfb5', bg1:'#0c2430',bg2:'#0a1c26'},
  {key:'sunset',  name:'Sunset Blaze',      unlockStreak:7,  accent:'#c2410c',   accentL:'rgba(194,65,12,.14)',  accent2:'#e0a52a', bg1:'#2a1408',bg2:'#1f0e05'},
  {key:'galaxy',  name:'Galaxy',            unlockStreak:14, accent:'#7c5cd6',   accentL:'rgba(124,92,214,.16)', accent2:'#e0a52a', bg1:'#160c2e',bg2:'#0f0721'},
  {key:'aurora',  name:'Aurora',            unlockStreak:30, accent:'#0d9488',   accentL:'rgba(13,148,136,.14)', accent2:'#f472b6', bg1:'#052420',bg2:'#031815'},
];

const BADGES = [
  {id:'first_session', icon:'🌱', name:'First Steps',      desc:'Log your first study session.'},
  {id:'streak_3',       icon:'🔥', name:'3-Day Streak',     desc:'Study 3 days in a row.'},
  {id:'streak_7',       icon:'🔥', name:'Week Warrior',     desc:'Study 7 days in a row.'},
  {id:'streak_14',      icon:'⚡', name:'Fortnight Focus',  desc:'Study 14 days in a row.'},
  {id:'streak_30',      icon:'👑', name:'Unstoppable',      desc:'Study 30 days in a row.'},
  {id:'hours_10',       icon:'⏳', name:'10 Hours Logged',  desc:'Accumulate 10 hours of study.'},
  {id:'hours_50',       icon:'📚', name:'50 Hours Logged',  desc:'Accumulate 50 hours of study.'},
  {id:'hours_100',      icon:'🎓', name:'Century Club',     desc:'Accumulate 100 hours of study.'},
  {id:'marathon',       icon:'🏃', name:'Deep Work',        desc:'Complete a single session of 2+ hours.'},
  {id:'early_bird',     icon:'🌅', name:'Early Bird',       desc:'Start a session before 7 AM.'},
  {id:'night_owl',      icon:'🦉', name:'Night Owl',        desc:'Start a session after 10 PM.'},
  {id:'hydro',          icon:'💧', name:'Hydration Hero',   desc:'Hit your water target in a single day.'},
  {id:'balanced',       icon:'⚖️', name:'Balanced Day',     desc:'Exercise, hydrate, and study — all in one day.'},
  {id:'explorer',       icon:'🧭', name:'Topic Explorer',   desc:'Track 5 or more topics.'},
];

/* ── STATE ────────────────────────────────────────────────────────── */

let state = null;

function todayStr(d){ d=d||new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function dateStrToDate(s){ const [y,m,d]=s.split('-').map(Number); return new Date(y,m-1,d); }
function addDays(dateStr,n){ const d=dateStrToDate(dateStr); d.setDate(d.getDate()+n); return todayStr(d); }

function defaultState(){
  return { sessions:[], days:{}, topics:[], xp:0, badges:[], theme:'default', waterTarget:8, longestStreak:0 };
}

function loadState(){
  let s=null;
  try{ s = JSON.parse(localStorage.getItem(STORE_KEY)); }catch(e){}
  if(!s || typeof s!=='object') s = defaultState();
  const d = defaultState();
  for(const k in d){ if(!(k in s)) s[k]=d[k]; }
  return s;
}
function saveState(){ try{ localStorage.setItem(STORE_KEY, JSON.stringify(state)); }catch(e){} }

function getDay(dateStr){
  if(!state.days[dateStr]) state.days[dateStr] = {exercise:false, water:0, topicsStudied:[]};
  return state.days[dateStr];
}

function esc(s){ return String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function fmtMin(min){
  min = Math.round(min);
  if(min<60) return min+'m';
  const h=Math.floor(min/60), m=min%60;
  return m? h+'h '+m+'m' : h+'h';
}
function fmtHrs1(min){ return (min/60).toFixed(1).replace(/\.0$/,'')+'h'; }
function uid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,7); }

/* ── DERIVED STATS ────────────────────────────────────────────────── */

function totalMinutes(){ return state.sessions.reduce((a,s)=>a+s.duration,0); }
function minutesForDate(dateStr){ return state.sessions.filter(s=>s.date===dateStr).reduce((a,s)=>a+s.duration,0); }
function minutesThisWeek(){
  const now=new Date(); const start=new Date(now); start.setDate(now.getDate()-6);
  let total=0;
  for(let d=new Date(start); d<=now; d.setDate(d.getDate()+1)) total+=minutesForDate(todayStr(d));
  return total;
}

function daysWithSessionSet(){ return new Set(state.sessions.map(s=>s.date)); }

function computeStreak(){
  const has = daysWithSessionSet();
  const cursor = new Date();
  if(!has.has(todayStr(cursor))) cursor.setDate(cursor.getDate()-1);
  let streak=0;
  while(has.has(todayStr(cursor))){ streak++; cursor.setDate(cursor.getDate()-1); }
  return streak;
}
function computeLongestStreak(){
  const days = [...daysWithSessionSet()].sort();
  if(!days.length) return 0;
  let best=1, cur=1;
  for(let i=1;i<days.length;i++){
    if(addDays(days[i-1],1)===days[i]) cur++; else cur=1;
    if(cur>best) best=cur;
  }
  return best;
}

/* ── XP / LEVEL ───────────────────────────────────────────────────── */

function cumXp(l){ return 50*(l-1)*l; } // xp required to REACH level l
function levelInfo(xp){
  let l=1;
  while(xp>=cumXp(l+1)) l++;
  const base=cumXp(l), next=cumXp(l+1);
  return {level:l, progress: next>base?(xp-base)/(next-base):1, xp, next, base};
}
function addXp(n){ state.xp = Math.max(0, state.xp+n); }

/* ── THEME ────────────────────────────────────────────────────────── */

function unlockedThemes(){ const s=computeStreak(); return THEMES.filter(t=>t.unlockStreak<=s || t.key===state.theme); }
function applyTheme(){
  const shell = document.querySelector('.trk-shell');
  if(!shell) return;
  const t = THEMES.find(x=>x.key===state.theme) || THEMES[0];
  shell.dataset.theme = t.key;
  shell.style.setProperty('--trk-accent', t.accent);
  shell.style.setProperty('--trk-accent-l', t.accentL);
  shell.style.setProperty('--trk-accent2', t.accent2);
  if(t.bg1){ shell.style.setProperty('--trk-bg1',t.bg1); shell.style.setProperty('--trk-bg2',t.bg2); }
  else { shell.style.removeProperty('--trk-bg1'); shell.style.removeProperty('--trk-bg2'); }
}

/* ── BADGES ───────────────────────────────────────────────────────── */

function badgeEarned(id){
  const streak=computeStreak(), mins=totalMinutes();
  switch(id){
    case 'first_session': return state.sessions.length>=1;
    case 'streak_3':  return streak>=3;
    case 'streak_7':  return streak>=7;
    case 'streak_14': return streak>=14;
    case 'streak_30': return streak>=30;
    case 'hours_10':  return mins>=600;
    case 'hours_50':  return mins>=3000;
    case 'hours_100': return mins>=6000;
    case 'marathon':  return state.sessions.some(s=>s.duration>=120);
    case 'early_bird':return state.sessions.some(s=>s.hour<7);
    case 'night_owl': return state.sessions.some(s=>s.hour>=22);
    case 'hydro':     return Object.values(state.days).some(d=>d.water>=state.waterTarget);
    case 'balanced':  return Object.keys(state.days).some(ds=>{
                          const d=state.days[ds];
                          return d.exercise && d.water>=state.waterTarget && minutesForDate(ds)>0;
                        });
    case 'explorer':  return state.topics.length>=5;
    default: return false;
  }
}
function refreshBadges(){
  const newly=[];
  BADGES.forEach(b=>{
    if(!state.badges.includes(b.id) && badgeEarned(b.id)){
      state.badges.push(b.id);
      newly.push(b);
    }
  });
  if(newly.length){
    addXp(newly.length*25);
    newly.forEach(b=> pushReward('badge', `${b.icon} Badge earned — ${b.name}!`) );
  }
  return newly;
}

/* ── REWARD FEED / TOASTS / CONFETTI ─────────────────────────────── */

let rewardFeed = []; // {tier,msg,ts}
function pushReward(tier,msg){
  rewardFeed.unshift({tier,msg,ts:Date.now()});
  rewardFeed = rewardFeed.slice(0,40);
  renderRewardFeed();
  popReward(tier,msg);
}
let activePops = 0;
function popReward(tier,msg){
  const layer = getPopLayer();
  const pop = document.createElement('div');
  pop.className = 'trk-pop trk-pop-'+tier;
  pop.textContent = msg;
  pop.style.top = `calc(14% + ${activePops*3.2}rem)`;
  layer.appendChild(pop);
  activePops++;
  if(tier!=='small') burstConfetti(tier);
  requestAnimationFrame(()=>pop.classList.add('show'));
  setTimeout(()=>{ pop.classList.remove('show'); setTimeout(()=>{ pop.remove(); activePops=Math.max(0,activePops-1); },380); }, tier==='huge'?3200:tier==='big'?2600:1800);
}
function getPopLayer(){
  let l = document.getElementById('trk-pop-layer');
  if(!l){ l=document.createElement('div'); l.id='trk-pop-layer'; document.body.appendChild(l); }
  return l;
}
function burstConfetti(tier){
  const layer=getPopLayer();
  const n = tier==='huge'?26: tier==='big'?16: 10;
  const bits = ['🎉','✨','⭐','🔥','💫','🏆'];
  for(let i=0;i<n;i++){
    const s=document.createElement('span');
    s.className='trk-confetti';
    s.textContent = bits[Math.floor(Math.random()*bits.length)];
    s.style.left = (46+Math.random()*8)+'vw';
    s.style.setProperty('--dx', (Math.random()*2-1).toFixed(2));
    s.style.setProperty('--rot', (Math.random()*360).toFixed(0)+'deg');
    s.style.animationDelay = (Math.random()*0.15)+'s';
    s.style.fontSize = (14+Math.random()*12)+'px';
    layer.appendChild(s);
    setTimeout(()=>s.remove(), 1700);
  }
}
function showSimpleToast(msg){
  if(window.showToast){ window.showToast(msg, getComputedStyle(document.body).getPropertyValue('--gr')||'#3a6043'); }
}

/* ── STOPWATCH ────────────────────────────────────────────────────── */

const sw = { running:false, startTs:0, elapsedBase:0, tickId:null, lastMarkMin:0 };

function swPersist(){
  if(sw.running) localStorage.setItem(SW_KEY, JSON.stringify({startTs:sw.startTs, elapsedBase:sw.elapsedBase, lastMarkMin:sw.lastMarkMin}));
  else localStorage.removeItem(SW_KEY);
}
function swElapsedMs(){ return sw.running ? (sw.elapsedBase + (Date.now()-sw.startTs)) : sw.elapsedBase; }

function swStart(){
  if(sw.running) return;
  sw.running=true; sw.startTs=Date.now();
  sw.tickId = setInterval(swTick, 500);
  swPersist();
  renderSessionPanel();
}
function swPause(){
  if(!sw.running) return;
  sw.elapsedBase += (Date.now()-sw.startTs);
  sw.running=false;
  clearInterval(sw.tickId);
  swPersist();
  renderSessionPanel();
}
function swReset(){
  sw.running=false; sw.elapsedBase=0; sw.lastMarkMin=0;
  clearInterval(sw.tickId);
  localStorage.removeItem(SW_KEY);
  renderSessionPanel();
}
function swResumeIfActive(){
  let raw;
  try{ raw=JSON.parse(localStorage.getItem(SW_KEY)); }catch(e){}
  if(!raw) return;
  sw.elapsedBase = raw.elapsedBase||0;
  sw.lastMarkMin = raw.lastMarkMin||0;
  sw.running = true;
  sw.startTs = raw.startTs || Date.now();
  sw.tickId = setInterval(swTick,500);
}

function rewardMessageForMark(min){
  if(min%60===0){
    const hrs=min/60;
    const msgs=['🔥 1 hour of deep work — incredible discipline.','🚀 2 hours! You are unstoppable today.','🌟 3 hours! Absolute legend status.','🏆 4 hours — a genuinely elite session.'];
    return {tier:'huge', msg: msgs[Math.min(hrs-1,msgs.length-1)] + (hrs>4?` (${hrs}h and counting!)`:'')};
  }
  if(min%30===0) return {tier:'big', msg:`🎯 ${min} minutes — real momentum building.`};
  return {tier:'small', msg:`⏱️ ${min} minutes down — nice focus.`};
}

function swTick(){
  const totalMin = Math.floor(swElapsedMs()/60000);
  updateStopwatchDisplay();
  // Loop (not a single equality check) so a mark is never silently skipped —
  // e.g. resuming after a refresh already past 10m, or a throttled background tab.
  let nextMark = (Math.floor(sw.lastMarkMin/10)+1)*10;
  let changed = false;
  while(totalMin>=nextMark){
    sw.lastMarkMin = nextMark;
    const r = rewardMessageForMark(nextMark);
    const xp = r.tier==='huge'?60:r.tier==='big'?20:5;
    addXp(xp);
    pushReward(r.tier, r.msg);
    changed = true;
    nextMark += 10;
  }
  if(changed) saveState();
}
function updateStopwatchDisplay(){
  const el = document.getElementById('trk-sw-time');
  if(!el) return;
  const ms = swElapsedMs();
  const totalSec = Math.floor(ms/1000);
  const h=Math.floor(totalSec/3600), m=Math.floor((totalSec%3600)/60), s=totalSec%60;
  el.textContent = (h>0? String(h).padStart(2,'0')+':':'') + String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
  const nextMark = (Math.floor(totalSec/60/10)+1)*10;
  const curMin = totalSec/60;
  const bar = document.getElementById('trk-sw-progress');
  if(bar){
    const prevMark = nextMark-10;
    const pct = Math.max(0,Math.min(1, (curMin-prevMark)/10));
    bar.style.width = (pct*100)+'%';
  }
  const lbl = document.getElementById('trk-sw-next');
  if(lbl) lbl.textContent = `Next reward at ${nextMark}m`;
}

/* ── SESSIONS / FORMS ─────────────────────────────────────────────── */

let pendingSession = null; // session awaiting the finish-form after stopwatch stop

function swStop(){
  if(sw.running) swPause();
  const totalMin = Math.round(swElapsedMs()/60000);
  if(totalMin<1){ swReset(); showSimpleToast('Session too short to log.'); return; }
  const startHour = new Date(Date.now()-swElapsedMs()).getHours();
  pendingSession = { duration: totalMin, hour: startHour, date: todayStr(), fromStopwatch:true };
  swReset();
  renderSessionPanel();
}
function discardPendingSession(){ pendingSession=null; renderSessionPanel(); }

function ensureTopic(name){
  name = name.trim();
  if(!name) return null;
  let t = state.topics.find(x=>x.name.toLowerCase()===name.toLowerCase());
  if(!t){ t={id:uid(), name}; state.topics.push(t); }
  return t;
}

function saveSession(data){
  // data: {date,duration,hour,topicName,technique,location,focus,confidence,notes}
  const topic = ensureTopic(data.topicName || 'General');
  const session = {
    id: uid(), date: data.date, duration: data.duration, hour: data.hour,
    topicId: topic?topic.id:null, technique: data.technique, location: data.location,
    focus: data.focus||0, confidence: data.confidence||0, notes: (data.notes||'').slice(0,500)
  };
  state.sessions.push(session);
  const day = getDay(session.date);
  if(topic && !day.topicsStudied.includes(topic.id)) day.topicsStudied.push(topic.id);
  addXp(session.duration);
  saveState();
  const newBadges = refreshBadges();
  saveState();
  if(!newBadges.length) showSimpleToast(`Session logged — +${session.duration} XP`);
  renderAll();
}

/* ── BUCKET STATS / INSIGHTS ─────────────────────────────────────── */

function bucketStats(buckets, keyFn, sessions){
  sessions = sessions || state.sessions;
  return buckets.map(b=>{
    const rows = sessions.filter(s=>keyFn(s,b));
    const n = rows.length;
    const avgFocus = n? rows.reduce((a,s)=>a+s.focus,0)/n : 0;
    const avgConf  = n? rows.reduce((a,s)=>a+s.confidence,0)/n : 0;
    const totalMin = rows.reduce((a,s)=>a+s.duration,0);
    return {...b, n, avgFocus, avgConf, totalMin};
  });
}
function bestBucket(stats, minN){
  const eligible = stats.filter(s=>s.n>=minN);
  if(!eligible.length) return null;
  return eligible.reduce((a,b)=> b.avgFocus>a.avgFocus? b : a);
}

function topicStats(){
  return state.topics.map(t=>{
    const rows = state.sessions.filter(s=>s.topicId===t.id);
    const n=rows.length;
    const totalMin = rows.reduce((a,s)=>a+s.duration,0);
    const avgConf = n? rows.reduce((a,s)=>a+s.confidence,0)/n : 0;
    const avgFocus = n? rows.reduce((a,s)=>a+s.focus,0)/n : 0;
    return {topic:t, n, totalMin, avgConf, avgFocus};
  }).filter(t=>t.n>0);
}

/* ── CANVAS BAR CHART ─────────────────────────────────────────────── */

function cssVar(name,fallback){
  const v = getComputedStyle(document.querySelector('.trk-shell')||document.body).getPropertyValue(name).trim();
  return v||fallback;
}
function roundRectPath(ctx,x,y,w,h,r){
  h=Math.max(h,0);
  const rr=Math.min(r, w/2, Math.max(h,0.01)/2);
  ctx.beginPath();
  ctx.moveTo(x+rr,y);
  ctx.arcTo(x+w,y,x+w,y+h,rr);
  ctx.arcTo(x+w,y+h,x,y+h,rr);
  ctx.arcTo(x,y+h,x,y,rr);
  ctx.arcTo(x,y,x+w,y,rr);
  ctx.closePath();
}
function drawBarChart(canvas, data, opts){
  if(!canvas) return;
  opts = opts||{};
  const dpr = window.devicePixelRatio||1;
  const w = canvas.clientWidth||canvas.parentElement.clientWidth||300;
  const h = canvas.clientHeight||160;
  canvas.width = w*dpr; canvas.height = h*dpr;
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.clearRect(0,0,w,h);
  const pad = {l:28, r:8, t:10, b:30};
  const max = opts.max || Math.max(1, ...data.map(d=>d.value));
  const gridColor = cssVar('--border','#d8d0c0');
  const textColor = cssVar('--text-3','#5a5046');
  const accent = cssVar('--trk-accent', cssVar('--gr','#3a6043'));
  ctx.strokeStyle = gridColor; ctx.lineWidth=1;
  for(let i=0;i<=3;i++){
    const y = pad.t + (h-pad.t-pad.b)*(i/3);
    ctx.beginPath(); ctx.moveTo(pad.l,y); ctx.lineTo(w-pad.r,y); ctx.stroke();
  }
  const bw = (w-pad.l-pad.r)/Math.max(1,data.length);
  data.forEach((d,i)=>{
    const x = pad.l + i*bw + bw*0.16;
    const barW = bw*0.68;
    const bh = (h-pad.t-pad.b) * (max? d.value/max : 0);
    const y = h-pad.b-bh;
    ctx.fillStyle = d.color || accent;
    roundRectPath(ctx,x,y,barW,bh,3);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.font = "9.5px 'Outfit', sans-serif";
    ctx.textAlign='center';
    ctx.fillText(d.label, x+barW/2, h-pad.b+13);
    if(opts.showValue && d.value>0){
      ctx.fillStyle = cssVar('--text-2','#4a4238');
      ctx.font = "9.5px 'Source Code Pro', monospace";
      ctx.fillText(opts.valueFmt?opts.valueFmt(d.value):Math.round(d.value*10)/10, x+barW/2, y-5);
    }
  });
}

function redrawAllCharts(){
  drawBarChart(document.getElementById('trk-chart-daily'), last14DaysData(), {showValue:false});
  const hourStats = bucketStats(HOUR_BUCKETS, (s,b)=>b.test(s.hour));
  drawBarChart(document.getElementById('trk-chart-hour'), hourStats.map(b=>({label:b.axis,value:b.avgFocus})), {max:5, showValue:true, valueFmt:v=>v.toFixed(1)});
  const durStats = bucketStats(DURATION_BUCKETS, (s,b)=>b.test(s.duration));
  drawBarChart(document.getElementById('trk-chart-duration'), durStats.map(b=>({label:b.label,value:b.avgFocus})), {max:5, showValue:true, valueFmt:v=>v.toFixed(1)});
  const locStats = bucketStats(LOCATIONS.map(l=>({key:l,label:l})), (s,b)=>s.location===b.key);
  drawBarChart(document.getElementById('trk-chart-location'), locStats.filter(b=>b.n>0).map(b=>({label:b.label,value:b.avgFocus})), {max:5, showValue:true, valueFmt:v=>v.toFixed(1)});
  const techStats = bucketStats(TECHNIQUES.map(t=>({key:t,label:t})), (s,b)=>s.technique===b.key);
  drawBarChart(document.getElementById('trk-chart-technique'), techStats.filter(b=>b.n>0).map(b=>({label:b.label.split(' ')[0],value:b.avgFocus})), {max:5, showValue:true, valueFmt:v=>v.toFixed(1)});
}
window.redrawTrackerCharts = redrawAllCharts;

function last14DaysData(){
  const out=[];
  for(let i=13;i>=0;i--){
    const ds = addDays(todayStr(),-i);
    const d = dateStrToDate(ds);
    out.push({label:String(d.getDate()), value: minutesForDate(ds)});
  }
  return out;
}

/* ── INSIGHTS TEXT ───────────────────────────────────────────────── */

function buildInsights(){
  const n = state.sessions.length;
  if(n<5){
    return [`Log a few more sessions (you have ${n}/5) and your personal trainer will start spotting patterns in when, where and how you study best.`];
  }
  const out=[];
  const hourStats = bucketStats(HOUR_BUCKETS,(s,b)=>b.test(s.hour));
  const bestHour = bestBucket(hourStats,2);
  if(bestHour) out.push(`🕐 You focus best during <b>${esc(bestHour.label)}</b> (${esc(bestHour.short)}) — average focus ${bestHour.avgFocus.toFixed(1)}/5. Try scheduling your hardest topic then.`);

  const durStats = bucketStats(DURATION_BUCKETS,(s,b)=>b.test(s.duration));
  const bestDur = bestBucket(durStats,2);
  if(bestDur) out.push(`⏳ Sessions of <b>${esc(bestDur.label)}</b> show your highest average focus (${bestDur.avgFocus.toFixed(1)}/5) — that may be your sweet spot before attention fades.`);

  const locStats = bucketStats(LOCATIONS.map(l=>({key:l,label:l})),(s,b)=>s.location===b.key);
  const bestLoc = bestBucket(locStats,2);
  if(bestLoc) out.push(`📍 You concentrate best at <b>${esc(bestLoc.label)}</b> — lean on that setting for difficult material.`);

  const techStats = bucketStats(TECHNIQUES.map(t=>({key:t,label:t})),(s,b)=>s.technique===b.key);
  const bestTech = bestBucket(techStats,2);
  if(bestTech) out.push(`🧠 <b>${esc(bestTech.label)}</b> correlates with your strongest focus (${bestTech.avgFocus.toFixed(1)}/5) — use it more for tough material.`);

  const tstats = topicStats().filter(t=>t.n>=2).sort((a,b)=>a.avgConf-b.avgConf);
  if(tstats.length>=2){
    const weak = tstats[0], strong = tstats[tstats.length-1];
    if(weak.topic.id!==strong.topic.id){
      out.push(`💪 Strongest topic: <b>${esc(strong.topic.name)}</b> (confidence ${strong.avgConf.toFixed(1)}/5). Needs work: <b>${esc(weak.topic.name)}</b> (confidence ${weak.avgConf.toFixed(1)}/5) — give it extra time this week.`);
    }
  }
  if(!out.length) out.push('Keep logging sessions with focus/confidence ratings — recommendations sharpen with more data across different times, places and techniques.');
  return out;
}

/* ── RENDER: SHELL ────────────────────────────────────────────────── */

function shellHtml(){
  return `
  <div class="trk-shell" data-theme="default">
    <div class="trk-topstats">
      <div class="trk-stat-card"><div class="trk-stat-num" id="trk-stat-streak">0</div><div class="trk-stat-lbl">Day Streak 🔥</div></div>
      <div class="trk-stat-card"><div class="trk-stat-num" id="trk-stat-level">1</div><div class="trk-stat-lbl">Level</div></div>
      <div class="trk-stat-card"><div class="trk-stat-num" id="trk-stat-week">0h</div><div class="trk-stat-lbl">This Week</div></div>
      <div class="trk-stat-card"><div class="trk-stat-num" id="trk-stat-total">0h</div><div class="trk-stat-lbl">All Time</div></div>
    </div>
    <div class="trk-tabs" role="tablist">
      <button class="trk-tab active" data-action="tab" data-tab="dashboard">📋 Dashboard</button>
      <button class="trk-tab" data-action="tab" data-tab="session">⏱️ Study Session</button>
      <button class="trk-tab" data-action="tab" data-tab="log">✏️ Log Entry</button>
      <button class="trk-tab" data-action="tab" data-tab="insights">📊 Insights</button>
      <button class="trk-tab" data-action="tab" data-tab="rewards">🏆 Rewards</button>
      <button class="trk-tab" data-action="tab" data-tab="history">🗂️ History</button>
    </div>
    <div class="trk-panel active" data-panel="dashboard"></div>
    <div class="trk-panel" data-panel="session"></div>
    <div class="trk-panel" data-panel="log"></div>
    <div class="trk-panel" data-panel="insights"></div>
    <div class="trk-panel" data-panel="rewards"></div>
    <div class="trk-panel" data-panel="history"></div>
  </div>`;
}

function renderTopStats(){
  const streak = computeStreak();
  document.getElementById('trk-stat-streak').textContent = streak;
  document.getElementById('trk-stat-level').textContent = levelInfo(state.xp).level;
  document.getElementById('trk-stat-week').textContent = fmtHrs1(minutesThisWeek());
  document.getElementById('trk-stat-total').textContent = fmtHrs1(totalMinutes());
}

/* ── RENDER: DASHBOARD ────────────────────────────────────────────── */

function renderDashboard(){
  const panel = document.querySelector('[data-panel="dashboard"]');
  if(!panel) return;
  const ds = todayStr();
  const day = getDay(ds);
  const todayMin = minutesForDate(ds);
  const insights = buildInsights().slice(0,2);

  panel.innerHTML = `
    <div class="trk-grid-2">
      <div class="trk-card">
        <div class="trk-card-title">Today's Habits</div>
        <div class="trk-habit-row">
          <span class="trk-habit-lbl">🏃 Exercise</span>
          <button class="trk-toggle ${day.exercise?'on':''}" data-action="toggle-exercise">${day.exercise?'Done':'Mark done'}</button>
        </div>
        <div class="trk-habit-row">
          <span class="trk-habit-lbl">💧 Water (${day.water}/${state.waterTarget})</span>
          <div class="trk-water-ctrl">
            <button data-action="water-dec">−</button>
            <div class="trk-water-bar"><div class="trk-water-fill" style="width:${Math.min(100,day.water/state.waterTarget*100)}%"></div></div>
            <button data-action="water-inc">+</button>
          </div>
        </div>
        <div class="trk-habit-row">
          <span class="trk-habit-lbl">⏳ Studied today</span>
          <span class="trk-habit-val">${fmtMin(todayMin)}</span>
        </div>
        ${state.topics.length? `<div class="trk-mini-label">Portions studied today</div>
        <div class="trk-topic-chips">
          ${state.topics.map(t=>`<button class="trk-chip ${day.topicsStudied.includes(t.id)?'on':''}" data-action="toggle-topic-today" data-id="${t.id}">${esc(t.name)}</button>`).join('')}
        </div>` : `<div class="trk-empty-hint">Add topics in the Log Entry tab to check them off here as you cover them.</div>`}
      </div>
      <div class="trk-card">
        <div class="trk-card-title">Your Personal Trainer Says</div>
        ${insights.map(i=>`<div class="trk-insight-line">${i}</div>`).join('')}
        <button class="trk-btn-ghost" data-action="tab" data-tab="insights" style="margin-top:.6rem">See full analysis →</button>
      </div>
    </div>
    <div class="trk-card" style="margin-top:1rem">
      <div class="trk-card-title">Last 14 Days</div>
      <canvas id="trk-chart-daily" class="trk-canvas"></canvas>
    </div>
    <div class="trk-cta-row">
      <button class="trk-btn-primary" data-action="tab" data-tab="session">▶ Start a Study Session</button>
      <button class="trk-btn-ghost" data-action="tab" data-tab="log">+ Log Past Session</button>
    </div>`;
  requestAnimationFrame(()=>drawBarChart(document.getElementById('trk-chart-daily'), last14DaysData(),{showValue:false}));
}

/* ── RENDER: SESSION (STOPWATCH) ──────────────────────────────────── */

function renderSessionPanel(){
  const panel = document.querySelector('[data-panel="session"]');
  if(!panel) return;

  if(pendingSession){
    panel.innerHTML = finishFormHtml(pendingSession);
    return;
  }

  panel.innerHTML = `
    <div class="trk-card trk-sw-card">
      <div class="trk-card-title">Study Session Stopwatch</div>
      <div class="trk-sw-display" id="trk-sw-time">00:00</div>
      <div class="trk-sw-progress-track"><div class="trk-sw-progress-fill" id="trk-sw-progress"></div></div>
      <div class="trk-sw-next" id="trk-sw-next">Next reward at 10m</div>
      <div class="trk-sw-btns">
        ${sw.running
          ? `<button class="trk-btn-primary" data-action="sw-pause">⏸ Pause</button>`
          : `<button class="trk-btn-primary" data-action="sw-start">▶ ${swElapsedMs()>0?'Resume':'Start'}</button>`}
        <button class="trk-btn-ghost" data-action="sw-stop" ${swElapsedMs()<1000?'disabled':''}>⏹ Stop & Log</button>
      </div>
      <div class="trk-sw-hint">Earn a reward every 10 minutes of active focus — bigger rewards every 30 minutes, and the biggest every hour. Pausing doesn't cost you progress, but it doesn't count toward rewards either.</div>
    </div>
    <div class="trk-card" style="margin-top:1rem">
      <div class="trk-card-title">This Session's Rewards</div>
      <div class="trk-reward-feed" id="trk-reward-feed"></div>
    </div>`;
  updateStopwatchDisplay();
  renderRewardFeed();
}

function finishFormHtml(pre){
  return `
    <div class="trk-card">
      <div class="trk-card-title">🎉 Session Complete — ${fmtMin(pre.duration)}</div>
      <p class="trk-form-sub">Log what you worked on to unlock insights and XP.</p>
      <form id="trk-finish-form" class="trk-form">
        ${topicPickerHtml('finish-topic')}
        ${selectFieldHtml('finish-technique','Technique',TECHNIQUES)}
        ${selectFieldHtml('finish-location','Where',LOCATIONS)}
        ${starRowHtml('focus','Focus during this session')}
        ${starRowHtml('confidence','Confidence with this topic now')}
        <label class="trk-field"><span>Notes (optional)</span><textarea id="finish-notes" rows="2" maxlength="500" placeholder="What did you cover?"></textarea></label>
        <div class="trk-form-btns">
          <button type="submit" class="trk-btn-primary">Save Session</button>
          <button type="button" class="trk-btn-ghost" data-action="discard-pending">Discard</button>
        </div>
      </form>
    </div>`;
}

function renderRewardFeed(){
  const el = document.getElementById('trk-reward-feed');
  if(!el) return;
  if(!rewardFeed.length){ el.innerHTML = `<div class="trk-empty-hint">Rewards earned during your active session will appear here.</div>`; return; }
  el.innerHTML = rewardFeed.slice(0,12).map(r=>`<div class="trk-feed-item trk-feed-${r.tier}">${r.msg}</div>`).join('');
}

/* ── SHARED FORM PIECES ───────────────────────────────────────────── */

function topicPickerHtml(idPrefix){
  return `
  <label class="trk-field"><span>Topic / Portion</span>
    <div class="trk-topic-input-row">
      <input list="trk-topics-datalist" id="${idPrefix}" placeholder="e.g. Probability — Ch. 4" autocomplete="off">
      <datalist id="trk-topics-datalist">${state.topics.map(t=>`<option value="${esc(t.name)}">`).join('')}</datalist>
    </div>
  </label>`;
}
function selectFieldHtml(id,label,options){
  return `<label class="trk-field"><span>${label}</span><select id="${id}">${options.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select></label>`;
}
function starRowHtml(group,label){
  return `<label class="trk-field"><span>${label}</span>
    <div class="trk-stars" data-rating-group="${group}" data-value="0">
      ${[1,2,3,4,5].map(n=>`<button type="button" class="trk-star" data-action="rate" data-group="${group}" data-val="${n}">★</button>`).join('')}
    </div></label>`;
}
function setStars(group,val){
  document.querySelectorAll(`.trk-stars[data-rating-group="${group}"]`).forEach(wrap=>{
    wrap.dataset.value = val;
    wrap.querySelectorAll('.trk-star').forEach(btn=>{
      btn.classList.toggle('on', parseInt(btn.dataset.val,10)<=val);
    });
  });
}
function getStars(group){
  const wrap = document.querySelector(`.trk-stars[data-rating-group="${group}"]`);
  return wrap? parseInt(wrap.dataset.value||'0',10) : 0;
}

/* ── RENDER: LOG ENTRY TAB ────────────────────────────────────────── */

function renderLogPanel(){
  const panel = document.querySelector('[data-panel="log"]');
  if(!panel) return;
  panel.innerHTML = `
    <div class="trk-grid-2">
      <div class="trk-card">
        <div class="trk-card-title">Log a Past Session</div>
        <form id="trk-log-form" class="trk-form">
          <label class="trk-field"><span>Date</span><input type="date" id="log-date" value="${todayStr()}" max="${todayStr()}"></label>
          <label class="trk-field"><span>Duration (minutes)</span><input type="number" id="log-duration" min="1" max="600" placeholder="45" required></label>
          <label class="trk-field"><span>Start time</span><input type="time" id="log-time" value="12:00"></label>
          ${topicPickerHtml('log-topic')}
          ${selectFieldHtml('log-technique','Technique',TECHNIQUES)}
          ${selectFieldHtml('log-location','Where',LOCATIONS)}
          ${starRowHtml('log-focus','Focus during this session')}
          ${starRowHtml('log-confidence','Confidence with this topic now')}
          <label class="trk-field"><span>Notes (optional)</span><textarea id="log-notes" rows="2" maxlength="500"></textarea></label>
          <div class="trk-form-btns"><button type="submit" class="trk-btn-primary">Save Session</button></div>
        </form>
      </div>
      <div class="trk-card">
        <div class="trk-card-title">Topics / Syllabus Portions</div>
        <form id="trk-topic-form" class="trk-form-inline">
          <input id="new-topic-name" placeholder="Add a topic or chapter…" maxlength="60">
          <button type="submit" class="trk-btn-primary">Add</button>
        </form>
        <div class="trk-topic-list">
          ${state.topics.length? state.topics.map(t=>{
            const ts=topicStats().find(x=>x.topic.id===t.id);
            return `<div class="trk-topic-row">
              <span class="trk-topic-name">${esc(t.name)}</span>
              <span class="trk-topic-meta">${ts? fmtMin(ts.totalMin)+' · conf '+ts.avgConf.toFixed(1) : 'no sessions yet'}</span>
              <button class="trk-icon-btn" data-action="delete-topic" data-id="${t.id}" title="Remove topic">✕</button>
            </div>`;
          }).join('') : `<div class="trk-empty-hint">No topics yet — add your syllabus chapters or subjects above.</div>`}
        </div>
      </div>
    </div>`;
}

/* ── RENDER: INSIGHTS TAB ─────────────────────────────────────────── */

function renderInsightsPanel(){
  const panel = document.querySelector('[data-panel="insights"]');
  if(!panel) return;
  const tstats = topicStats().sort((a,b)=>b.avgConf-a.avgConf);
  panel.innerHTML = `
    <div class="trk-card">
      <div class="trk-card-title">Your Personal Trainer Says</div>
      ${buildInsights().map(i=>`<div class="trk-insight-line">${i}</div>`).join('')}
    </div>
    <div class="trk-grid-2" style="margin-top:1rem">
      <div class="trk-card"><div class="trk-card-title">Focus by Time of Day</div><canvas id="trk-chart-hour" class="trk-canvas"></canvas><div class="trk-chart-note">Average focus rating (1–5) for sessions started in each window.</div></div>
      <div class="trk-card"><div class="trk-card-title">Focus by Session Length</div><canvas id="trk-chart-duration" class="trk-canvas"></canvas><div class="trk-chart-note">Where your concentration holds up best.</div></div>
      <div class="trk-card"><div class="trk-card-title">Focus by Location</div><canvas id="trk-chart-location" class="trk-canvas"></canvas><div class="trk-chart-note">Only locations with 2+ sessions shown.</div></div>
      <div class="trk-card"><div class="trk-card-title">Focus by Technique</div><canvas id="trk-chart-technique" class="trk-canvas"></canvas><div class="trk-chart-note">Only techniques with 2+ sessions shown.</div></div>
    </div>
    <div class="trk-card" style="margin-top:1rem">
      <div class="trk-card-title">Topic Strength</div>
      ${tstats.length? `<div class="trk-topic-strength">
        ${tstats.map(t=>`<div class="trk-topic-str-row">
          <span class="trk-topic-name">${esc(t.topic.name)}</span>
          <div class="trk-str-bar"><div class="trk-str-fill" style="width:${t.avgConf/5*100}%"></div></div>
          <span class="trk-topic-meta">${t.avgConf.toFixed(1)}/5 · ${fmtMin(t.totalMin)}</span>
        </div>`).join('')}
      </div>` : `<div class="trk-empty-hint">Log sessions against topics to see strong vs. weak areas here.</div>`}
    </div>`;
  requestAnimationFrame(redrawAllCharts);
}

/* ── RENDER: REWARDS TAB ──────────────────────────────────────────── */

function renderRewardsPanel(){
  const panel = document.querySelector('[data-panel="rewards"]');
  if(!panel) return;
  const li = levelInfo(state.xp);
  const streak = computeStreak();
  panel.innerHTML = `
    <div class="trk-card">
      <div class="trk-card-title">Level ${li.level}</div>
      <div class="trk-xp-bar-track"><div class="trk-xp-bar-fill" style="width:${(li.progress*100).toFixed(1)}%"></div></div>
      <div class="trk-chart-note">${state.xp - li.base} / ${li.next - li.base} XP to Level ${li.level+1} · ${state.xp} XP total</div>
    </div>
    <div class="trk-card" style="margin-top:1rem">
      <div class="trk-card-title">Streak — ${streak} days (best: ${computeLongestStreak()})</div>
      <div class="trk-heatmap">${streakHeatmapHtml()}</div>
    </div>
    <div class="trk-card" style="margin-top:1rem">
      <div class="trk-card-title">Themes</div>
      <div class="trk-theme-grid">
        ${THEMES.map(t=>{
          const unlocked = t.unlockStreak<=streak;
          return `<button class="trk-theme-swatch ${state.theme===t.key?'active':''} ${unlocked?'':'locked'}" data-action="select-theme" data-theme="${t.key}" ${unlocked?'':'disabled'} style="--sw:${t.accent}">
            <span class="trk-theme-dot" style="background:${t.accent}"></span>
            <span>${esc(t.name)}</span>
            ${unlocked? (state.theme===t.key?'<em>active</em>':'') : `<em>🔒 ${t.unlockStreak}-day streak</em>`}
          </button>`;
        }).join('')}
      </div>
    </div>
    <div class="trk-card" style="margin-top:1rem">
      <div class="trk-card-title">Badges (${state.badges.length}/${BADGES.length})</div>
      <div class="trk-badge-grid">
        ${BADGES.map(b=>{
          const on = state.badges.includes(b.id);
          return `<div class="trk-badge ${on?'on':'locked'}"><div class="trk-badge-icon">${on?b.icon:'🔒'}</div><div class="trk-badge-name">${esc(b.name)}</div><div class="trk-badge-desc">${esc(b.desc)}</div></div>`;
        }).join('')}
      </div>
    </div>`;
}

function streakHeatmapHtml(){
  const cells=[];
  for(let i=34;i>=0;i--){
    const ds = addDays(todayStr(),-i);
    const min = minutesForDate(ds);
    let level = 0;
    if(min>0) level=1; if(min>=30) level=2; if(min>=60) level=3; if(min>=120) level=4;
    cells.push(`<div class="trk-heat-cell trk-heat-${level}" title="${ds} — ${fmtMin(min)}"></div>`);
  }
  return cells.join('');
}

/* ── RENDER: HISTORY TAB ──────────────────────────────────────────── */

function renderHistoryPanel(){
  const panel = document.querySelector('[data-panel="history"]');
  if(!panel) return;
  const sessions = [...state.sessions].sort((a,b)=> (b.date+b.hour).localeCompare(a.date+a.hour));
  panel.innerHTML = `
    <div class="trk-card">
      <div class="trk-card-title">Session History (${sessions.length})</div>
      ${sessions.length? `<div class="trk-history-list">
        ${sessions.map(s=>{
          const t = state.topics.find(x=>x.id===s.topicId);
          return `<div class="trk-history-row">
            <div class="trk-hist-main">
              <span class="trk-hist-date">${esc(s.date)}</span>
              <span class="trk-hist-topic">${esc(t?t.name:'General')}</span>
              <span class="trk-hist-dur">${fmtMin(s.duration)}</span>
            </div>
            <div class="trk-hist-sub">${esc(s.technique||'')} · ${esc(s.location||'')} · focus ${s.focus||0}/5 · conf ${s.confidence||0}/5</div>
            ${s.notes? `<div class="trk-hist-notes">${esc(s.notes)}</div>` : ''}
            <button class="trk-icon-btn trk-hist-del" data-action="delete-session" data-id="${s.id}" title="Delete">✕</button>
          </div>`;
        }).join('')}
      </div>` : `<div class="trk-empty-hint">No sessions logged yet — start the stopwatch or add a past session.</div>`}
    </div>`;
}

/* ── FULL RENDER ──────────────────────────────────────────────────── */

function renderAll(){
  renderTopStats();
  renderDashboard();
  renderSessionPanel();
  renderLogPanel();
  renderInsightsPanel();
  renderRewardsPanel();
  renderHistoryPanel();
  applyTheme();
}

/* ── EVENT HANDLING (delegated) ──────────────────────────────────── */

function switchTab(tabKey){
  document.querySelectorAll('.trk-tab').forEach(b=>b.classList.toggle('active', b.dataset.tab===tabKey));
  document.querySelectorAll('.trk-panel').forEach(p=>p.classList.toggle('active', p.dataset.panel===tabKey));
  if(tabKey==='insights') requestAnimationFrame(redrawAllCharts);
  if(tabKey==='dashboard') requestAnimationFrame(()=>drawBarChart(document.getElementById('trk-chart-daily'), last14DaysData(),{showValue:false}));
}

function bindEvents(){
  const root = document.getElementById('tracker-app');
  if(!root) return;

  root.addEventListener('click', e=>{
    const btn = e.target.closest('[data-action]');
    if(!btn) return;
    const action = btn.dataset.action;

    if(action==='tab'){ switchTab(btn.dataset.tab); return; }
    if(action==='sw-start'){ swStart(); return; }
    if(action==='sw-pause'){ swPause(); return; }
    if(action==='sw-stop'){ swStop(); return; }
    if(action==='discard-pending'){ discardPendingSession(); return; }
    if(action==='rate'){ setStars(btn.dataset.group, parseInt(btn.dataset.val,10)); return; }

    if(action==='toggle-exercise'){
      const day=getDay(todayStr()); day.exercise=!day.exercise; saveState();
      const nb=refreshBadges(); saveState();
      renderDashboard(); renderTopStats();
      return;
    }
    if(action==='water-inc'||action==='water-dec'){
      const day=getDay(todayStr());
      day.water = Math.max(0, day.water + (action==='water-inc'?1:-1));
      saveState();
      const nb=refreshBadges(); saveState();
      renderDashboard();
      return;
    }
    if(action==='toggle-topic-today'){
      const day=getDay(todayStr()); const id=btn.dataset.id;
      const idx=day.topicsStudied.indexOf(id);
      if(idx>-1) day.topicsStudied.splice(idx,1); else day.topicsStudied.push(id);
      saveState(); renderDashboard();
      return;
    }
    if(action==='delete-topic'){
      if(!confirm('Remove this topic? Past sessions logged under it will keep their history but show as "General".')) return;
      state.topics = state.topics.filter(t=>t.id!==btn.dataset.id);
      saveState(); renderLogPanel(); renderInsightsPanel();
      return;
    }
    if(action==='delete-session'){
      if(!confirm('Delete this session? This cannot be undone.')) return;
      state.sessions = state.sessions.filter(s=>s.id!==btn.dataset.id);
      saveState(); renderAll();
      return;
    }
    if(action==='select-theme'){
      const key=btn.dataset.theme;
      const t = THEMES.find(x=>x.key===key);
      const streak = computeStreak();
      if(!t || t.unlockStreak>streak) return;
      state.theme=key; saveState(); applyTheme(); renderRewardsPanel();
      return;
    }
  });

  root.addEventListener('submit', e=>{
    if(e.target.id==='trk-finish-form'){
      e.preventDefault();
      const data = {
        date: pendingSession.date, duration: pendingSession.duration, hour: pendingSession.hour,
        topicName: document.getElementById('finish-topic').value,
        technique: document.getElementById('finish-technique').value,
        location: document.getElementById('finish-location').value,
        focus: getStars('focus'), confidence: getStars('confidence'),
        notes: document.getElementById('finish-notes').value,
      };
      pendingSession = null;
      saveSession(data);
      switchTab('dashboard');
      return;
    }
    if(e.target.id==='trk-log-form'){
      e.preventDefault();
      const dur = parseInt(document.getElementById('log-duration').value,10);
      if(!dur || dur<1){ return; }
      const timeVal = document.getElementById('log-time').value || '12:00';
      const hour = parseInt(timeVal.split(':')[0],10);
      const data = {
        date: document.getElementById('log-date').value || todayStr(),
        duration: dur, hour,
        topicName: document.getElementById('log-topic').value,
        technique: document.getElementById('log-technique').value,
        location: document.getElementById('log-location').value,
        focus: getStars('log-focus'), confidence: getStars('log-confidence'),
        notes: document.getElementById('log-notes').value,
      };
      saveSession(data);
      e.target.reset();
      setStars('log-focus',0); setStars('log-confidence',0);
      document.getElementById('log-date').value = todayStr();
      return;
    }
    if(e.target.id==='trk-topic-form'){
      e.preventDefault();
      const input = document.getElementById('new-topic-name');
      if(ensureTopic(input.value)){
        saveState();
        const nb=refreshBadges(); saveState();
        input.value='';
        renderLogPanel();
      }
      return;
    }
  });
}

/* ── INIT ─────────────────────────────────────────────────────────── */

function initTracker(){
  const mount = document.getElementById('tracker-app');
  if(!mount) return;
  state = loadState();
  mount.innerHTML = shellHtml();
  bindEvents();
  swResumeIfActive();
  refreshBadges(); // catch up on any badges already earned by existing data
  saveState();
  renderAll();
}

window.initTracker = initTracker;

})();
