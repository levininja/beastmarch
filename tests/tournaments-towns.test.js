const fs=require('fs');
const noop=new Proxy(function(){},{get:(t,p)=>p==='width'?600:p==='height'?440:p==='length'?0:noop,apply:()=>noop,set:()=>true});
const el=()=>new Proxy({innerHTML:'',hidden:false,style:{},textContent:'',dataset:{},width:600,height:440,scrollTop:0,scrollHeight:0,getBoundingClientRect:()=>({width:600}),getContext:()=>noop,blur(){},closest:()=>null,classList:{add(){},remove(){}}},{get:(t,p)=>p in t?t[p]:noop,set:(t,p,v)=>{t[p]=v;return true}});
const store={};
global.document={querySelector:()=>el(),addEventListener(){},documentElement:{getAttribute:()=>null},fonts:null};
global.window={addEventListener(){},devicePixelRatio:1};
global.matchMedia=()=>({matches:false,addEventListener(){}});
global.MutationObserver=class{observe(){}};
global.localStorage={getItem:k=>store[k]||null,setItem:(k,v)=>{store[k]=v},removeItem:k=>{delete store[k]}};
global.CanvasRenderingContext2D=undefined;
const t0=Date.now();
const code=require('./_load')()+`
;globalThis.__t={get S(){return S;},UI,newGame,onKey,render,renderNow,saveGame,loadGame,panelHTML,RANKS,RIV,RIVBY,nextEvent,todayEvent,nightAmt,isNight,day,CYCLE,DAYLEN,SP,TOWNS,DOORS:()=>DOORS,SIGNS:()=>SIGNS,roomCh,enterRoom,npcTalk,interact,arenaHTML,arenaDock,hallHTML,signHTML,enterTournament,aiAct,bestReplacement,rivSpecies,mkUnit,duelTurn,simSeries,get LOG(){return LOG;},canEnter,roundNames,myMatch,TL,TILES:()=>TILES,mulberry,LINES,restUntilEvent,withdraw,cmax,readSign,renderDock,worldKey,pick};`;
(0,eval)(code);
const T=__t;let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const key=k=>{T.UI.lockUntil=0;T.UI.noRepeat=false;T.onKey(k);};
// ---- rivals
ok(T.RIV.length===104,'104 rival trainers: '+T.RIV.length);
ok(new Set(T.RIV.map(r=>r.name)).size===104,'rival names are unique');
let badSp=0,badLv=0,legend=0,badTeam=0;
for(const r of T.RIV){const R=T.RANKS[r.r];if(r.team.length!==3)badTeam++;for(const t of r.team){if(!T.SP[t.sp])badSp++;else if(T.SP[t.sp].legend)legend++;if(t.lvl<R.lv[0]||t.lvl>R.lv[1])badLv++;}}
ok(!badSp&&!badLv&&!legend&&!badTeam,'rosters valid (species, levels in rank band, no legendaries, 3 each)');
console.log('pool per rank',T.RANKS.map((R,r)=>R.k+':'+T.RIV.filter(x=>x.r===r).length).join(' '));
ok(T.RANKS.every((R,r)=>T.RIV.filter(x=>x.r===r).length>=R.size-1),'each rank pool can fill its bracket');
const sample=T.RIV.filter(x=>x.r===5).slice(0,3).map(r=>r.name+' ['+r.tr+'/'+r.style+'] '+r.team.map(t=>T.SP[t.sp].n+' L'+t.lvl+(t.alpha?'*':'')).join(', '));console.log(sample.join('\n'));
// ---- calendar
T.newGame(false);
const S=()=>T.S;
for(let r=0;r<6;r++){const R=T.RANKS[r];let prev=0,okk=true;for(let d=1;d<=120;d++){const n=T.nextEvent(r,d);if(n<d||(prev&&n<prev))okk=false;prev=n;}ok(okk&&T.nextEvent(r,1)===R.off&&T.nextEvent(r,R.off+1)===R.off+R.per,'schedule sane '+R.k+' every '+R.per+' from day '+R.off);}
ok(T.RANKS.slice(0,4).every(R=>R.size===16&&R.bo===1)&&T.RANKS.slice(4).every(R=>R.size===8&&R.bo===3),'E-B are 16 sudden death, A-S are 8 best of three');
// ---- day/night
const na=t=>+T.nightAmt(t).toFixed(2);
console.log('night amt at 0,107,114,120,200,228,234,239,240:',[0,107,114,120,200,228,234,239,240].map(na).join(' '));
ok(na(0)===0&&na(100)===0&&na(120)===1&&na(200)===1&&na(240)===0,'night amount 0 by day, 1 at night');
S().turn=119;ok(!T.isNight()&&T.day()===1,'turn 119 is day 1 daylight');S().turn=120;ok(T.isNight(),'turn 120 is night');S().turn=239;ok(T.isNight()&&T.day()===1,'turn 239 still night of day 1');S().turn=240;ok(!T.isNight()&&T.day()===2,'turn 240 is dawn of day 2');
S().turn=0;
// ---- sign + hall in every town
for(const t of T.TOWNS){
  const sx=t.x0+5,sy=t.y0+9;ok(T.SIGNS()[sx+','+sy]===t.id,'sign placed '+t.id);
  ok(T.TILES()[(t.y0+9)*224+t.x0+7]===T.TL.BENCH,'work table placed '+t.id);
  const hd=Object.keys(T.DOORS()).filter(k=>T.DOORS()[k]===t.id+':hall');ok(hd.length===1,'hall door '+t.id);
}
S().pos={room:null,x:79+32,y:90+24};S().face={x:0,y:1};
key('e');ok(S().panel==='sign','sign opens calendar panel from the square');
let h=T.panelHTML();ok(['Pebble','Copper','Iron','Silver','Gold','Beastmarch Finals'].every(n=>h.includes(n))&&h.includes('Day 1'),'sign lists all six cups and the current day');
console.log(h.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,420));
key('Escape');
// hall room
T.enterRoom('th:hall');ok(T.roomCh('th:hall',5,3)==='N','registrar in hall');
S().pos.x=5;S().pos.y=4;S().face={x:0,y:-1};key('e');ok(S().panel==='hall','registrar opens hall panel');
h=T.panelHTML();ok(h.includes('Proving Hall')&&h.includes('Pebble Cup'),'hall panel text');
// no companions: cannot enter
S().turn=(3-1)*240+5;ok(T.todayEvent(0),'day 3 has the E cup');key('Enter');ok(S().mode==='world','cannot enter with no companions');
// give companions
let uid=100;const mk=(sp,l)=>({id:uid++,sp,lvl:l,xp:0,hp:1,p:true,alpha:false});
function giveSquad(r,over){const R=T.RANKS[r],L=R.lv[1]+over;S().cr=[];for(let i=0;i<3;i++){const sp=T.rivSpecies(Math.random,null,r,L,S().cr.map(c=>c.sp));S().cr.push(mk(sp,L));}for(const c of S().cr)c.hp=T.cmax(c);S().lg.squad=[];}
giveSquad(0,0);S().panel='hall';T.UI.sel=0;key('1');key('2');ok(S().lg.squad.length===2,'toggle squad by number');key('3');key('3');ok(S().lg.squad.length===2,'toggle off works');key('3');
ok(S().lg.squad.length===3,'squad of three');
console.log(T.renderDock&&'dock ok');
// ---- play a full tournament through the real keys with an auto player
function autoPlay(maxSteps){
  let steps=0,duels=0;
  while(S().mode==='arena'&&steps++<maxSteps){
    const t=S().tour;
    if(t.phase!=='duel'){key('Enter');continue;}
    const D=t.D;
    if(D.need){key(String(T.bestReplacement(D,0)+1));continue;}
    const a=T.aiAct(D,0);
    if(a.k==='move')key(String(a.i+1));else if(a.k==='guard')key('g');else if(a.k==='swap'){key('w');key(String(a.i+1));}
    duels++;
  }
  return {steps,duels};
}
S().panel='hall';key('Enter');
ok(S().mode==='arena'&&S().tour.size===16&&S().tour.rounds[0].length===8,'entered a 16-entrant bracket with 8 first-round matches');
ok(T.arenaHTML().length>200&&T.arenaDock().length>50,'bracket screen renders');
ok(S().lg.ent['0:3'],'registration recorded');
const r1=autoPlay(5000);
const tr=S().mode==='world'?null:S().tour;
ok(S().mode==='world'&&!S().tour,'tournament ended and returned to the world ('+JSON.stringify(r1)+')');
console.log('rank after E cup:',S().rank,' log tail:',T.LOG.slice(-4).map(l=>l.t).join(' | '));
// blocked re-entry
S().pos={room:'th:hall',x:5,y:4};S().panel='hall';key('Enter');ok(S().mode==='world','cannot enter twice on the same day');
// final screen content test via a manual run where we capture the HTML at final
function runAt(r,over,opts){
  S().rank=r;S().turn=(T.RANKS[r].off-1)*240+10;giveSquad(r,over);S().lg.squad=S().cr.map(c=>c.id);S().lg.ent={};
  S().pos={room:'th:hall',x:5,y:4};S().panel='hall';key('Enter');
  const t=S().tour;if(!t)return null;
  const info={size:t.size,bo:t.bo,maxScore:0,finalHTML:'',phases:new Set()};
  let guard=0;
  while(S().mode==='arena'&&guard++<6000){
    const tt=S().tour;info.phases.add(tt.phase);
    if(tt.phase==='final'&&!info.finalHTML)info.finalHTML=T.arenaHTML();
    if(tt.phase!=='duel'){key('Enter');continue;}
    const D=tt.D;if(D.need){key(String(T.bestReplacement(D,0)+1));continue;}
    const a=T.aiAct(D,0);
    if(a.k==='move')key(String(a.i+1));else if(a.k==='guard')key('g');else if(a.k==='swap'){key('w');key(String(a.i+1));}
  }
  info.res=guard<6000;info.rank=S().rank;info.last=T.LOG.slice(-3).map(l=>l.t);return info;
}
for(let r=0;r<6;r++){
  const i=runAt(r,1);
  ok(i&&i.res&&S().mode==='world','rank '+T.RANKS[r].k+' tournament completes through keys; size '+(i&&i.size)+' bo '+(i&&i.bo));
  ok(i&&i.finalHTML.includes('Final bracket')&&i.phases.has('pre')&&i.phases.has('duel')&&i.phases.has('post'),'rank '+T.RANKS[r].k+' passes through all phases');
}
// ---- balance: champion rate with a squad at hi+1 vs hi-2, using the same brawler AI the rivals use
function champRate(r,over,n){
  let champ=0,wins=0,bouts=0;
  for(let k=0;k<n;k++){
    const R=T.RANKS[r],L=R.lv[1]+over;
    S().rank=r;S().turn=(R.off-1)*240+10;S().cr=[];
    for(let i=0;i<3;i++){const sp=T.rivSpecies(Math.random,null,r,L,S().cr.map(c=>c.sp));S().cr.push(mk(sp,L));}
    S().lg.squad=S().cr.map(c=>c.id);S().lg.ent={};S().pos={room:'th:hall',x:5,y:4};S().panel='hall';
    T.enterTournament();const t=S().tour;let g=0;
    while(S().mode==='arena'&&g++<6000){
      const tt=S().tour;if(tt.phase!=='duel'){key('Enter');continue;}
      const D=tt.D;if(D.need){key(String(T.bestReplacement(D,0)+1));continue;}
      const a=T.aiAct(D,0);if(a.k==='move')key(String(a.i+1));else if(a.k==='guard')key('g');else if(a.k==='swap'){key('w');key(String(a.i+1));}
    }
    if(S().rank>r||(r===5&&T.LOG.slice(-4).some(l=>/Champion|champion/.test(l.t))))champ++;
  }
  return champ/n;
}
for(const [r,ov] of [[0,1],[0,-2],[2,1],[2,-2],[4,1],[5,1]]){const c=champRate(r,ov,24);console.log('rank',T.RANKS[r].k,'squad lvl',T.RANKS[r].lv[1]+ov,'champion rate',(c*100).toFixed(0)+'%');}
console.log('FAILS',fails);
