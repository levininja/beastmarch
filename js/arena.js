/**
 * arena.js — day/night clock, rivals and the tournament (Proving Hall) system
 *
 * Load order: 5th. Contains the day/night cycle, rank ladder (E to S),
 * generated rival trainers and teams, the 3v3 duel engine and AI (including
 * blind lead selection), bracket simulation and tournament flow.
 *
 * All files are classic scripts sharing one global scope (no modules); see README.
 */
'use strict';
/* ===== Day and night, the tournament calendar, rival trainers, and the arena duel engine ===== */

/* A day is DAYLEN turns of light followed by DAYLEN turns of night. The calendar day number ticks over at dawn. */
const DAYLEN=120,CYCLE=DAYLEN*2;
const isNight=()=>S.turn%CYCLE>=DAYLEN;
/* 0 in daylight, 1 in deep night, with a short ramp at dusk and dawn. */
/** 0..1 darkness level for tick `t` with smooth dusk/dawn. */
function nightAmt(t){
  const p=((t%CYCLE)+CYCLE)%CYCLE,R=12;
  if(p<DAYLEN-R)return 0;
  if(p<DAYLEN)return(p-(DAYLEN-R))/R;
  if(p<CYCLE-R)return 1;
  return 1-(p-(CYCLE-R))/R;
}
const turnsToShift=()=>{const p=S.turn%CYCLE;return p<DAYLEN?DAYLEN-p:CYCLE-p;};

/* Ranks E through S. Each rank has its own cup on its own repeating schedule. A and S are eight-entrant, best-of-three brackets. */
const RANKS=[
 {k:'E',n:'Pebble Cup',size:16,bo:1,per:5,off:3,lv:[4,7],gold:150,items:{salve:2,cord:3},mats:['herb','herb']},
 {k:'D',n:'Copper Cup',size:16,bo:1,per:7,off:5,lv:[8,12],gold:350,items:{silver:2,tonic:1},mats:['herb','metal']},
 {k:'C',n:'Iron Cup',size:16,bo:1,per:9,off:7,lv:[13,17],gold:800,items:{silver:3,tonic:2},mats:['gem','gem']},
 {k:'B',n:'Silver Cup',size:16,bo:1,per:11,off:9,lv:[18,22],gold:1800,items:{gilded:1,tonic:2},mats:['gem','metal','herb']},
 {k:'A',n:'Gold Cup',size:8,bo:3,per:13,off:11,lv:[23,27],gold:4000,items:{gilded:2,tonic:3},mats:['gem','gem','metal']},
 {k:'S',n:'Beastmarch Finals',size:8,bo:3,per:15,off:13,lv:[28,33],gold:9000,items:{gilded:3,tonic:4},mats:['gem','gem','metal','herb']}];
const nextEvent=(r,d)=>{const R=RANKS[r];return d<=R.off?R.off:R.off+Math.ceil((d-R.off)/R.per)*R.per;};
const todayEvent=r=>nextEvent(r,day())===day();
const roundNames=size=>size===16?['Round of 16','Quarterfinal','Semifinal','Final']:['Quarterfinal','Semifinal','Final'];

/* ---------- rival trainers ---------- */
/** Seeded PRNG (mulberry32) used to generate rivals reproducibly. */
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const RIVN1=['Aldric','Bryn','Cassia','Dorrin','Elowen','Fenn','Garrick','Hester','Isolde','Jory','Kestrel','Lorcan','Maeve','Nell','Osric','Perrin','Quill','Rhosyn','Silas','Tamsin','Ulric','Vesper','Wren','Xan','Yarrow','Zeb','Alma','Bodhi','Corwin','Delphine'];
const RIVN2=['Ashby','Blackthorn','Cobb','Dunmore','Fairweather','Gorse','Hale','Ironside','Juniper','Kettleby','Lowry','Marsh','Nettlefold','Oakes','Pike','Quarrel','Rook','Strand','Thatch','Underhill','Vane','Wicker','Yewdale','Brackenridge','Crowe','Dray','Emberly','Flint','Greaves','Holloway'];
const RIVQ=['I trained all winter for this. Mostly indoors, but still.','My beasts have never lost a bout. We have only entered one.','Do not mind the shaking. That is excitement. Possibly breakfast.',"I bet my aunt's pie recipe on this match.",'Fair warning: my beasts bite. So do I, when provoked.','Good luck. You will need it, and so will I.','My coach says I fight like a wet hen. I say it is working.','I feed them cheese before every bout. Not a strategy, but a ritual.','May the best trainer win. That is me. Hello.','I once won a bout by sneezing at the right moment.','Nothing personal. Mostly personal.','I would shake your hand, but I am mid-stretch.','My mother is watching. Please do not hurt me in front of her.','This ring is lucky. It is also stuck on my finger.','I do not lose. I reach alternate conclusions.','We have matching scarves. That counts for something.','If I win, I am buying everyone soup.','I hear you bound some strange beasts. Let us see them fight.','Let us keep this civilized and quick.','They said I would never make it this far. I was holding the gate at the time.'];
const RIVW=['Well fought. I will be sulking by the soup stall.','I demand a rematch, and also a sandwich.','My scarf was supposed to be lucky.','Fine. You are good. Do not let it go to your head.','I will train harder. Probably indoors again.','That was my best team. Oh dear.','Next time I am bringing the cheese.','Tell my mother I tried.','A worthy bout. My ego will recover by Thursday.','Hmph. Beginner\'s luck. Mostly.'];
const RIVL=['Better luck next time. Truly. Eat something.','That is why we train indoors.','Do not take it hard. Take it soft, like a pillow.','I would say it was close, but I would be lying.','Keep at it. Beasts do not bind themselves.','Sorry. I am a little bit sorry.','Your beasts have heart. Mine have teeth.','Soup is on me. For the loser.'];
const POOL=[20,20,20,20,12,12];
const NOISE=[.30,.22,.15,.08,.03,0];   // chance a trainer fumbles into a random move, by rank
const RIV=[],RIVBY={};
/** Chooses a rival team member of type `type` appropriate for rank `r` and level `lv`, avoiding `used`. */
function rivSpecies(rng,type,r,lv,used){
  const rr=[[1,2],[1,2],[1,3],[2,3],[2,4],[3,4]][r],cand=[];
  for(const L of LINES){
    if(L.r>=5||L.r<rr[0]||L.r>rr[1])continue;
    let id=L.i[0];while(SP[id].evo&&lv>=SP[id].evo[0])id=SP[id].evo[1];
    if(!used.includes(id))cand.push(id);
  }
  const typed=type?cand.filter(id=>SP[id].t===type):cand,pool=typed.length?typed:cand;
  return pool[Math.floor(rng()*pool.length)];
}
(function buildRivals(){
  const rng=mulberry(20261019),combos=[];
  for(let a=0;a<RIVN1.length;a++)for(let b=0;b<RIVN2.length;b++)combos.push([a,b]);
  for(let i=combos.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[combos[i],combos[j]]=[combos[j],combos[i]];}
  const types=Object.keys(TYPE).filter(t=>t!=='Plain'),traits=['brawler','tactician','turtle','gambler'];
  let n=0;
  RANKS.forEach((R,r)=>{
    for(let k=0;k<POOL[r];k++){
      const cb=combos[n],id='rv'+n,style=types[Math.floor(rng()*types.length)];
      const lv0=R.lv[0]+Math.floor(rng()*(R.lv[1]-R.lv[0]+1)),team=[],used=[];
      for(let j=0;j<3;j++){
        const lvl=clamp(lv0+Math.floor(rng()*3)-1,R.lv[0],R.lv[1]);
        const sp=rivSpecies(rng,j===0||rng()<.6?style:null,r,lvl,used);used.push(sp);
        team.push({sp,lvl,alpha:false});
      }
      if(r>=2&&rng()<.3)team[Math.floor(rng()*3)].alpha=true;
      /* A trainer's listed style is whatever their team mostly is, so the label never lies. */
      const tc={};for(const t of team){const ty=SP[t.sp].t;tc[ty]=(tc[ty]||0)+1;}
      const style2=Object.keys(tc).sort((x,y)=>tc[y]-tc[x])[0];
      const rv={id,name:RIVN1[cb[0]]+' '+RIVN2[cb[1]],r,style:style2,tr:traits[Math.floor(rng()*4)],q:RIVQ[Math.floor(rng()*RIVQ.length)],w:RIVW[Math.floor(rng()*RIVW.length)],l:RIVL[Math.floor(rng()*RIVL.length)],team};
      RIV.push(rv);RIVBY[id]=rv;n++;
    }
  });
})();

/* ---------- the duel engine ---------- */
let DSEQ=1;
/** Creates a duel unit from species, level and alpha flag. */
function mkUnit(sp,lvl,alpha,src){
  const st=src?cs(src):cstat(sp,lvl,alpha);
  return{id:src?'m'+src.id:'r'+(DSEQ++),sp,lvl,alpha:!!alpha,max:st.hp,hp:st.hp,atk:st.atk,def:st.def,spd:st.spd,cd:{},mult:src?bondMult()*rageC(src):BOND};
}
/** Creates a duel state between teams `a` and `b` at rank `rk`; `mute` disables the log (simulated matches). */
function newDuel(a,b,rk,mute){return{s:[{u:a,a:0},{u:b,a:0}],tr:['brawler','brawler'],nm:'Rival',rk,g:[false,false],t:0,over:false,win:-1,lg:[],need:false,auto:!!mute,mute:!!mute};}
const dlg=(D,t,k)=>{if(!D.mute){D.lg.push({t,k:k||''});if(D.lg.length>40)D.lg.shift();}};
const dn=(D,i,u)=>(i===0?'Your ':D.nm+"'s ")+SP[u.sp].n;
const alive=sd=>sd.u.filter(x=>x.hp>0).length;
/* Choose who steps in after a faint: the beast with the best type matchup and the most health. */
/** AI pick of the best bench unit after a faint. */
function bestReplacement(D,i){
  const sd=D.s[i],o=D.s[1-i].u[D.s[1-i].a];let best=-1,bs=-1;
  sd.u.forEach((x,k)=>{if(x.hp<=0)return;const s=tmult(SP[x.sp].t,SP[o.sp].t)/tmult(SP[o.sp].t,SP[x.sp].t)+x.hp/x.max;if(s>bs){bs=s;best=k;}});
  return best;
}
/** AI chooses a move for side `i`. */
function aiAct(D,i){
  const sd=D.s[i],ot=D.s[1-i],u=sd.u[sd.a],o=ot.u[ot.a],tr=D.tr[i],noise=NOISE[D.rk]||0;
  const mvs=movesFor(SP[u.sp],u.lvl).map((m,k)=>({m,k})).filter(x=>!(u.cd[x.m.n]>0));
  const atk=mvs.filter(x=>!x.m.heal),heal=mvs.find(x=>x.m.heal);
  if(!atk.length)return{k:'guard'};
  const est=x=>dmgRaw(u.lvl,x.m.p*(u.alpha?ALPHA_PWR:1),u.atk,o.def,tmult(x.m.t,SP[o.sp].t))*u.mult;
  const hpf=u.hp/u.max,bench=[];sd.u.forEach((x,k)=>{if(k!==sd.a&&x.hp>0)bench.push(k);});
  if(Math.random()<noise)return{k:'move',i:pick(atk).k};
  if(heal&&hpf<.35&&Math.random()<(tr==='tactician'||tr==='turtle'?.7:.3))return{k:'move',i:heal.k};
  if(tr==='turtle'&&hpf<.5&&Math.random()<.3)return{k:'guard'};
  if(tr==='tactician'&&bench.length&&tmult(SP[o.sp].t,SP[u.sp].t)>1&&Math.random()<.55){
    let bk=-1,bs=0;for(const k of bench){const x=sd.u[k],s=tmult(SP[x.sp].t,SP[o.sp].t)/tmult(SP[o.sp].t,SP[x.sp].t)+x.hp/x.max;if(s>bs){bs=s;bk=k;}}
    if(bk>=0&&bs>1.4)return{k:'swap',i:bk};
  }
  if(tr==='gambler'&&Math.random()<.3)return Math.random()<.2?{k:'guard'}:{k:'move',i:pick(atk).k};
  return{k:'move',i:atk.reduce((a,b)=>est(b)>est(a)?b:a).k};
}
/* One turn: swaps and guards happen first, then attacks in order of speed. A beast that faints cannot act. */
/** Resolves one turn of a duel given both sides' actions `acts`. */
function duelTurn(D,acts){
  const SD=D.s;D.g=[false,false];
  for(let i=0;i<2;i++){
    const a=acts[i];
    if(a.k==='swap'&&SD[i].u[a.i]&&SD[i].u[a.i].hp>0){SD[i].a=a.i;dlg(D,`${i===0?'You send out':D.nm+' sends out'} ${SP[SD[i].u[a.i].sp].n}.`,i?'bad':'good');}
  }
  for(let i=0;i<2;i++)if(acts[i].k==='guard'){D.g[i]=true;dlg(D,`${dn(D,i,SD[i].u[SD[i].a])} braces for the blow.`,'info');}
  const order=[0,1].filter(i=>acts[i].k==='move');
  order.sort((x,y)=>(SD[y].u[SD[y].a].spd-SD[x].u[SD[x].a].spd)||(Math.random()<.5?-1:1));
  for(const i of order){
    const u=SD[i].u[SD[i].a],t=SD[1-i].u[SD[1-i].a];
    if(u.hp<=0||t.hp<=0)continue;
    const mv=movesFor(SP[u.sp],u.lvl)[acts[i].i];
    if(!mv||(u.cd[mv.n]||0)>0)continue;
    if(mv.heal){const h=Math.ceil(u.max*mv.heal);u.hp=Math.min(u.max,u.hp+h);dlg(D,`${dn(D,i,u)} uses Mend and recovers ${h} HP.`,i?'info':'good');}
    else{
      const m=tmult(mv.t,SP[t.sp].t);let d=dmgCalc(u.lvl,mv.p*(u.alpha?ALPHA_PWR:1),u.atk,t.def,m*u.mult);
      if(D.g[1-i])d=Math.max(1,Math.ceil(d/2));
      t.hp=Math.max(0,t.hp-d);
      dlg(D,`${dn(D,i,u)} uses ${mv.n} on ${dn(D,1-i,t)} for ${d} damage.${effText(m)}`,i?'bad':'good');
      if(t.hp<=0)dlg(D,`${dn(D,1-i,t)} collapses.`,i?'bad':'good');
    }
    const cd=moveCd(mv);if(cd>0)u.cd[mv.n]=cd+1;
  }
  for(const sd of SD)for(const u of sd.u)for(const k in u.cd)if(u.cd[k]>0)u.cd[k]--;
  D.t++;
  for(let i=0;i<2;i++){
    const sd=SD[i];
    if(sd.u[sd.a].hp>0)continue;
    if(!alive(sd)){D.over=true;D.win=1-i;break;}
    if(i===1||D.auto){sd.a=bestReplacement(D,i);dlg(D,`${i===0?'You send out':D.nm+' sends out'} ${SP[sd.u[sd.a].sp].n}.`,i?'bad':'good');}
    else D.need=true;
  }
  /* A bout that drags on is decided by who has more health left. */
  if(!D.over&&D.t>=70){
    const f=sd=>sd.u.reduce((a,x)=>a+x.hp/x.max,0);
    D.over=true;D.win=f(SD[0])>f(SD[1])?0:f(SD[0])<f(SD[1])?1:(Math.random()<.5?0:1);
    dlg(D,'The judges call time and score the bout on remaining health.','info');
  }
}
/** Simulates a best-of series between two rivals. */
function simSeries(ra,rb,bo,rk){
  const sc=[0,0],need=Math.ceil(bo/2);
  while(sc[0]<need&&sc[1]<need){
    const D=newDuel(ra.team.map(t=>mkUnit(t.sp,t.lvl,t.alpha)),rb.team.map(t=>mkUnit(t.sp,t.lvl,t.alpha)),rk,true);
    D.tr=[ra.tr,rb.tr];
    while(!D.over)duelTurn(D,[aiAct(D,0),aiAct(D,1)]);
    sc[D.win]++;
  }
  return{w:sc[0]>sc[1]?0:1,sc};
}

/* ---------- the bracket ---------- */
/** Returns a shuffled copy of an array. */
function shuffled(a){const b=a.slice();for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
const isYou=m=>m.a==='you'||m.b==='you';
const myMatch=T=>T.rounds[T.rd].find(m=>isYou(m)&&m.w<0)||null;
const pairUp=ids=>{const o=[];for(let i=0;i<ids.length;i+=2)o.push({a:ids[i],b:ids[i+1],w:-1,sc:[0,0]});return o;};
/** Makes sure the player has a valid 3-creature squad. */
function ensureSquad(){
  const L=S.lg;L.squad=L.squad.filter(id=>S.cr.some(c=>c.id===id));
  if(!L.squad.length)L.squad=party().slice(0,3).map(c=>c.id);
  if(!L.squad.length)L.squad=S.cr.slice(0,3).map(c=>c.id);
}
/* Every visit to the hall starts from your current party, so a squad picked on an earlier visit never lingers. */
const hallList=()=>{const pt=S.cr.filter(c=>c.p),st=S.cr.filter(c=>!c.p).sort((a,b)=>b.lvl-a.lvl);return pt.concat(st);};
/** Sets the squad from the current party. */
function squadFromParty(){S.lg.squad=party().slice(0,3).map(c=>c.id);if(!S.lg.squad.length)S.lg.squad=S.cr.slice(0,3).map(c=>c.id);}
/** Sets the squad to the three highest-level creatures. */
function squadBest(){S.lg.squad=S.cr.slice().sort((a,b)=>b.lvl-a.lvl).slice(0,3).map(c=>c.id);}
/** Opens the Proving Hall panel. */
function openHall(){squadFromParty();S.panel='hall';UI.sel=0;render();}
/** Adds/removes creature `id` at squad position `i`. */
function toggleSquad(i,id){
  const c=id!==undefined?S.cr.find(x=>x.id===id):hallList()[i];if(!c)return;
  const q=S.lg.squad,k=q.indexOf(c.id);
  if(k>=0)q.splice(k,1);else if(q.length<3)q.push(c.id);else log('Your squad already has three. Remove someone first.','info');
}
const canEnter=()=>todayEvent(S.rank)&&!S.lg.ent[S.rank+':'+day()];
/** Waits until the next tournament day. */
function restUntilEvent(){
  const d=nextEvent(S.rank,day()+(todayEvent(S.rank)?1:0));
  S.turn=(d-1)*CYCLE;
  log(`You sleep on a hall cot until dawn on day ${d}.`,'info');
}
/** Registers the player and generates the bracket. */
function enterTournament(){
  ensureSquad();
  const r=S.rank,R=RANKS[r];
  if(!todayEvent(r)){log(`The ${R.n} is not held today.`,'info');return;}
  if(S.lg.ent[r+':'+day()]){log("You have already signed today's roll.",'info');return;}
  if(!S.lg.squad.length){log('You have no companions to enter. Bind a beast first.','bad');return;}
  S.lg.ent[r+':'+day()]=1;
  const rivals=shuffled(RIV.filter(x=>x.r===r).map(x=>x.id)).slice(0,R.size-1);
  const ent=shuffled(['you'].concat(rivals));
  const T={r,size:R.size,bo:R.bo,day:day(),ent,rounds:[pairUp(ent)],rd:0,kills:[],champ:null,phase:'bracket',res:null,squad:S.lg.squad.slice(),opp:null,sr:null,D:null,wd:false};
  saveGame(true);
  S.tour=T;S.mode='arena';S.panel=null;S.talk=null;UI.sel=0;UI.noRepeat=true;setLock(LOCK_START);
  log(`You sign the roll for the ${R.n}. ${R.size} entrants, ${R.bo===3?'every bout best of three':'one bout each round'}. Registration is final.`,'info');
  render();
}
/** Simulates all matches in the current round that do not involve the player. */
function simRound(T){
  for(const m of T.rounds[T.rd]){
    if(m.w>=0||isYou(m))continue;
    const r=simSeries(RIVBY[m.a],RIVBY[m.b],T.bo,T.r);m.w=r.w;m.sc=r.sc;
  }
}
/* Play out every match that does not involve you. Returns true when the whole bracket is decided. */
/** Applies results for the round and advances. */
function settle(T){
  for(;;){
    simRound(T);
    const rd=T.rounds[T.rd];
    if(rd.some(m=>m.w<0))return false;
    const win=rd.map(m=>m.w===0?m.a:m.b);
    if(win.length===1){T.champ=win[0];return true;}
    T.rounds.push(pairUp(win));T.rd++;
  }
}
/** Moves to the player's next match or ends the tournament. */
function bracketNext(){
  const T=S.tour;
  if(T.champ||!myMatch(T)){concludeTour();T.phase='final';return;}
  const m=myMatch(T);
  T.opp=RIVBY[m.a==='you'?m.b:m.a];T.sr={w:[0,0],g:1};T.phase='pre';
}
/* A rival picks a lead from what it can see of your squad: species, types and levels only. It never sees which beast you chose. */
/** AI selects its lead given what it has seen of the player's team (blind simultaneous pick). */
function aiLead(team,seen,rk,tr){
  const noise=NOISE[rk]||0;
  if(Math.random()<noise||(tr==='gambler'&&Math.random()<.35))return Math.floor(Math.random()*team.length);
  let best=0,bs=-1e9;
  team.forEach((t,k)=>{
    const ty=SP[t.sp].t;let s=0;
    seen.forEach(p=>{const pt=SP[p.sp].t;s+=Math.log(tmult(ty,pt))-Math.log(tmult(pt,ty))+(t.lvl-p.lvl)*.04;});
    s=s/seen.length+(tr==='brawler'?.08*t.lvl/10:0)+(Math.random()-.5)*.12;
    if(s>bs){bs=s;best=k;}
  });
  return best;
}
/** Sets the player's lead choice (index `k`) during the pre-duel phase. */
function pickLead(k){const T=S.tour;if(T&&T.phase==='pre'&&k>=0&&k<T.squad.length)T.lead=k;}
/** Locks in both leads, marks opposing species as seen and starts the duel. */
function gameBegin(){
  const T=S.tour,mine=T.squad.map(id=>S.cr.find(c=>c.id===id)).filter(Boolean);
  const D=newDuel(mine.map(c=>mkUnit(c.sp,c.lvl,c.alpha,c)),T.opp.team.map(t=>mkUnit(t.sp,t.lvl,t.alpha)),T.r,false);
  D.tr=['you',T.opp.tr];D.nm=T.opp.name.split(' ')[0];D.sub=null;D.yield=false;
  const my=Math.min(T.lead||0,mine.length-1);
  const their=aiLead(T.opp.team,mine.map(c=>({sp:c.sp,lvl:c.lvl})),T.r,T.opp.tr);
  D.s[0].a=my;D.s[1].a=their;T.lead=0;T.opp.team.forEach(t=>{S.seen[t.sp]=1;});
  dlg(D,`Both leads are revealed. You send out ${SP[D.s[0].u[my].sp].n}. ${T.opp.name} sends out ${SP[D.s[1].u[their].sp].n}.`,'info');
  T.D=D;T.phase='duel';
}
/** Player action in a duel. */
function duelAct(kind,i){
  const T=S.tour,D=T.D;if(!D||D.over)return;
  const me=D.s[0];
  if(D.need){
    const u=me.u[i];if(kind!=='swap'||!u||u.hp<=0)return;
    me.a=i;D.need=false;dlg(D,`You send out ${SP[u.sp].n}.`,'good');return;
  }
  let a;
  if(kind==='move'){
    const u=me.u[me.a],mv=movesFor(SP[u.sp],u.lvl)[i];if(!mv)return;
    if((u.cd[mv.n]||0)>0)return;
    a={k:'move',i};
  }else if(kind==='guard')a={k:'guard'};
  else if(kind==='swap'){const u=me.u[i];if(!u||u.hp<=0||i===me.a)return;a={k:'swap',i};}
  else return;
  D.sub=null;D.yield=false;
  duelTurn(D,[a,aiAct(D,1)]);
  if(D.over)gameEnd();
}
/** Ends one duel of the series. */
function gameEnd(){
  const T=S.tour,D=T.D,sr=T.sr;
  sr.w[D.win]++;
  for(const u of D.s[1].u)if(u.hp<=0)T.kills.push({lvl:u.lvl,alpha:u.alpha});
  dlg(D,D.win===0?'You take the game.':'You lose the game.',D.win===0?'good':'bad');
  T.phase='post';
}
/** Advances from the post-duel screen. */
function postNext(){
  const T=S.tour,sr=T.sr,need=Math.ceil(T.bo/2);
  if(sr.w[0]>=need||sr.w[1]>=need){matchEnd(sr.w[0]>sr.w[1]);return;}
  sr.g++;T.phase='pre';
}
/** Finishes a match (`forfeit` if the player withdrew). */
function matchEnd(you,forfeit){
  const T=S.tour,m=myMatch(T),sr=T.sr||{w:[0,0]};
  if(m){
    m.w=m.a==='you'?(you?0:1):(you?1:0);
    m.sc=m.a==='you'?[sr.w[0],sr.w[1]]:[sr.w[1],sr.w[0]];m.ff=!!forfeit;
    if(T.opp){const r=S.lg.rec[T.opp.id]||(S.lg.rec[T.opp.id]=[0,0]);r[you?0:1]++;}
  }
  T.D=null;T.phase='bracket';T.last={you,opp:T.opp,w:sr.w.slice(),ff:!!forfeit};
  settle(T);
}
/** Withdraws from the tournament. */
function withdraw(){
  const T=S.tour;
  if(myMatch(T)){const m=myMatch(T);if(!T.opp)T.opp=RIVBY[m.a==='you'?m.b:m.a];matchEnd(false,true);}
  concludeTour();T.phase='final';
}
/* Rewards are applied once, when the bracket is over for you. */
/** Awards prizes/rank progress and archives the tournament. */
function concludeTour(){
  const T=S.tour;if(T.res)return;
  if(!T.champ)settle(T);
  const R=RANKS[T.r],N=Math.log2(T.size),names=roundNames(T.size);
  let out=0;T.rounds.forEach((rd,k)=>{if(rd.some(isYou))out=k;});
  const champ=T.champ==='you';
  const share=champ?1:out===N-1?.5:out===N-2?.25:out===N-3?.12:.04;
  const place=champ?'Champion':out===N-1?'Runner-up':'Out in the '+names[out];
  const lines=[];
  const gold=Math.floor(R.gold*share);S.gold+=gold;lines.push(`${gold} gold`);
  let total=0;for(const k of T.kills)total+=foeXp({lvl:k.lvl,elite:k.alpha});
  const pl=S.lvl,xm=1+fx('xp');
  const px=Math.ceil(total*.5*xm);addXpPlayer(px);
  for(const id of T.squad){const c=S.cr.find(x=>x.id===id);if(c)addXpC(c,Math.ceil(total*.6*xm*catchUp(c,pl)));}
  lines.push(`${px} experience for you, and a share for each companion that fought`);
  let ranked=false;
  if(champ){
    for(const k in R.items){S.items[k]+=R.items[k];lines.push(`${R.items[k]} × ${IT[k].n}`);}
    const mm={};for(const kind of R.mats){const pool=MD.filter(m=>m[2]===kind),m=pick(pool)[0];mm[m]=(mm[m]||0)+1;}
    giveMats(mm);for(const id in mm)lines.push(`${MATS[id].n}${mm[id]>1?' × '+mm[id]:''}`);
    S.lg.titles[R.k]=(S.lg.titles[R.k]||0)+1;
    if(S.rank===T.r&&T.r<RANKS.length-1){S.rank++;ranked=true;}
  }
  T.res={place,champ,lines,ranked,champName:champ?'You':RIVBY[T.champ].name};
  log(`${R.n}: ${place}. You earn ${gold} gold and ${px} experience.`,champ?'good':'info');
  if(ranked)log(`You are promoted to Rank ${RANKS[S.rank].k}.`,'good');
}
/** Leaves the tournament screens. */
function exitTour(){
  S.tour=null;S.mode='world';S.panel=null;S.cool=4;
  if(S.rage>0)S.rage--;for(const c of S.cr)if(c.rage>0)c.rage--;
  UI.noRepeat=true;setLock(LOCK_END);saveGame(true);render();
}
