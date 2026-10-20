/**
 * arenaui.js — HTML for the tournament screens
 *
 * Load order: 7th. Pure string builders (calendar, hall, bracket, pre-duel
 * lead pick, duel, post-match, final) plus the Proving Hall dock buttons and
 * keyboard handler.
 *
 * All files are classic scripts sharing one global scope (no modules); see README.
 */
'use strict';
/* ===== Tournament screens: town sign, Proving Hall, bracket and arena ===== */
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;

/** Tournament calendar HTML. */
function calHTML(){
  const d=day();
  return `<div class="list">${RANKS.map((R,r)=>{
    const nd=nextEvent(r,d),dd=nd-d;
    const when=dd===0?'<b class="today">Today</b>':`Day ${nd}<div class="hint">in ${plural(dd,'day')}</div>`;
    const st=r===S.rank?chip('Your rank','#2A9D8F'):r<S.rank?chip('Cleared','#8A938F'):chip('Not yet','#8A938F');
    return `<div class="item cal ${r===S.rank?'mine':''}"><span class="rk">${R.k}</span><div class="grow"><b>${R.n}</b> ${st}<div class="hint">${R.size} entrants · ${R.bo===3?'every bout best of three':'one bout per round'} · rivals about Lv ${R.lv[0]}–${R.lv[1]}</div></div><div class="when">${when}</div></div>`;
  }).join('')}</div>`;
}
/** Proving Hall sign text. */
function signHTML(){
  const night=isNight(),n=turnsToShift();
  return `<h2>${ZN[S.sign].n} notice post</h2>
  <p class="signline"><b>Day ${day()}</b> · ${night?'Night':'Daytime'} · ${plural(n,'turn')} until ${night?'dawn':'dusk'}</p>
  <h3>Tournament calendar</h3>${calHTML()}
  <p class="hint">Every cup is listed, but you may only enter the one for your current rank. Be at a town's Proving Hall on the day itself and speak to the registrar. Win your rank's cup to move up, from E through D, C, B and A to S.</p>
  <p class="hint">${ZN[S.sign].n}: no creature may be set upon within these walls. Wild beasts cannot enter, and you cannot be ambushed here.</p>`;
}
/** Total [wins,losses] of the player's tournament record. */
function recTotals(){let w=0,l=0;for(const k in S.lg.rec){w+=S.lg.rec[k][0];l+=S.lg.rec[k][1];}return[w,l];}
/** Hall panel: squad selection and entry. */
function hallHTML(){
  ensureSquad();
  const r=S.rank,R=RANKS[r],d=day(),nd=nextEvent(r,d),today=nd===d,entered=S.lg.ent[r+':'+d];
  const status=today?(entered?`You have already signed today's roll. The ${R.n} will not be run twice in one day.`:`The ${R.n} is being held today, and the roll is open. Sign it and you fight at once.`)
    :`Your rank is <b>${R.k}</b>. The ${R.n} runs on day ${nd}, ${plural(nd-d,'day')} from now.`;
  const sq=S.lg.squad;
  const rows=hallList().map((c,i)=>{const k=sq.indexOf(c.id);return `<button class="item b ${k>=0?'sel':''}" data-k="sq:${c.id}" style="text-align:left"><div class="grow">${i<9?`<kbd>${i+1}</kbd> `:''}<b>${nm(c)}</b> <span class="dim">Lv ${c.lvl}</span> ${tchip(SP[c.sp].t)} ${abadge(c)}</div><span class="dim">${k>=0?(k===0?'Leads':'Squad '+(k+1)):'Not entered'} · ${c.p?'party':'stable'}</span></button>`;}).join('');
  const [w,l]=recTotals(),titles=Object.keys(S.lg.titles).filter(k=>S.lg.titles[k]).map(k=>`${k} ×${S.lg.titles[k]}`).join(', ');
  return `<h2>Proving Hall</h2>
  <div class="npc"><div class="sigil" style="--c:var(--accent);--ci:var(--accent-ink);width:48px;height:48px;font-size:24px">R</div><div><h3 style="margin:0">Registrar Pell</h3><div class="hint">Keeper of the roll</div></div></div>
  <p>${status}</p>
  <p class="hint">Your squad is up to three companions, sent out in the order shown. Everyone in a bout is restored by the hall surgeons beforehand and nothing you do there injures them, so there are no items and no binding. Registration is final: if you leave mid-event you forfeit the rest of it. Rivals are other trainers with rosters of their own; you will meet the same ones again.</p>
  <h3>Your squad (${sq.length}/3) <span class="hint">click a beast, or press its number, to add or remove. Your whole stable is listed.</span></h3>
  ${S.cr.length?`<div class="list">${rows}</div>`:'<p class="hint">You have no companions yet.</p>'}
  <p class="mono">Rank ${R.k} · ${w} bouts won, ${l} lost${titles?' · Cups: '+titles:''}</p>
  <h3>Calendar</h3>${calHTML()}`;
}
/** Dock buttons for the hall. */
function hallDock(){
  const ok=canEnter()&&S.lg.squad.length>0;
  return `<div class="acts">${btnSub('Enter','Sign the roll',ok?'':'not today','pri',!ok)}${btn('u','Use my party')}${btn('b','Pick my best three')}${btn('r','Sleep until the next event')}${btn('Escape','Leave')}</div>`;
}

/* ---------- arena screens ---------- */
const pName=id=>id==='you'?'<b>You</b>':RIVBY[id].name;
/** Bracket view of tournament `T`. */
function bracketHTML(T){
  const names=roundNames(T.size),m=myMatch(T);
  let banner='';
  if(T.last){
    const o=T.last.opp,line=T.last.ff?'You withdrew.':T.last.you?o.w:o.l;
    banner=`<p class="scene"><b>${T.last.ff?'Forfeit':T.last.you?'You won the bout':'You lost the bout'}</b> against ${o.name} (${T.last.w[0]}–${T.last.w[1]}). ${T.last.ff?'':`“${line}”`}</p>`;
  }
  const grid=T.rounds.map((rd,k)=>`<div class="rnd ${k===T.rd?'cur':''}"><h3>${names[k]}</h3>${rd.map(x=>{
    const done=x.w>=0;
    return `<div class="mt ${isYou(x)?'me':''}"><span class="${done&&x.w===0?'w':done?'l':''}">${pName(x.a)}</span><span class="vs">${done?x.sc[0]+'–'+x.sc[1]:'vs'}</span><span class="${done&&x.w===1?'w':done?'l':''}">${pName(x.b)}</span></div>`;}).join('')}</div>`).join('');
  let next='';
  if(m){const o=RIVBY[m.a==='you'?m.b:m.a],rc=S.lg.rec[o.id];next=`<p>Your next bout: <b>${o.name}</b>, a ${o.style} trainer${rc?` (you are ${rc[0]}–${rc[1]} against them)`:''}.${T.bo===3?' Best of three.':''}</p>`;}
  else next='<p>Your event is over.</p>';
  return `<h2>Bracket</h2>${banner}${next}<div class="rounds">${grid}</div>${T.wd?'<p class="hint bad">Press Esc again to withdraw from the event. Registration cannot be undone.</p>':''}`;
}
/** One row for a team member. */
function teamRow(sp,lvl,alpha){const s=SP[sp];return `<div class="item"><div class="art-row">${artHTML(sp,48,'port')}</div><div class="grow"><b>${s.n}</b> ${alpha?'<span class="ab">Alpha</span>':''} <span class="dim">Lv ${lvl}</span> ${tchip(s.t)}</div></div>`;}
/** Pre-duel screen: opposing team and lead selection. */
function preHTML(T){
  const o=T.opp,rc=S.lg.rec[o.id],need=Math.ceil(T.bo/2);
  const mine=T.squad.map(id=>S.cr.find(c=>c.id===id)).filter(Boolean);
  return `<h2>${o.name}</h2><p class="scene">“${o.q}”</p>
  <p class="hint">${o.style} trainer · fights ${({brawler:'by going for the biggest hit',tactician:'by switching to the better matchup',turtle:'cautiously, guarding when hurt',gambler:'on instinct'})[o.tr]}${rc?` · you are ${rc[0]}–${rc[1]} against them`:' · you have not met before'}</p>
  <p class="mono">${T.bo===3?`Best of three · game ${T.sr.g} · you ${T.sr.w[0]}, them ${T.sr.w[1]}`:'One bout. Lose and you are out.'}</p>
  <h3>Their team</h3><div class="list">${o.team.map(t=>teamRow(t.sp,t.lvl,t.alpha)).join('')}</div>
  <h3>Choose your lead</h3><p class="hint">Pick who steps out first. ${o.name.split(' ')[0]} is choosing at the same time, judging only by your squad, and neither of you sees the other's pick until you both commit.</p><div class="cmds">${mine.map((c,i)=>`<button class="b ${(T.lead||0)===i?'pri':''}" data-k="${i+1}"><kbd>${i+1}</kbd> ${SP[c.sp].n}${(T.lead||0)===i?' · your lead':''}<span class="sub">Lv ${c.lvl} · ${SP[c.sp].t}</span></button>`).join('')}</div>`;
}
/** Health/status block for side `i` of duel `D`. */
function unitBlock(D,i){
  const sd=D.s[i],u=sd.u[sd.a],sp=SP[u.sp];
  const pips=sd.u.map(x=>`<i class="pip ${x.hp>0?'on':''}"></i>`).join('');
  return `<div class="unit ${i?'foe':'you'}">${artHTML(u.sp,i?104:80,'port')}<div><div class="nm">${sp.n} <span class="dim">Lv ${u.lvl}</span> ${tchip(sp.t)} ${u.alpha?'<span class="ab">Alpha</span>':''}</div><div class="lab"><span>${i?D.nm:'You'} ${pips}</span><span>${u.hp}/${u.max}</span></div>${bar(u.hp/u.max)}</div></div>`;
}
/** Active duel screen. */
function duelHTML(T){
  const D=T.D,sr=T.sr;
  return `<div class="bt"><p class="mono">${T.opp.name}${T.bo===3?` · game ${sr.g} · you ${sr.w[0]}, them ${sr.w[1]}`:''}</p>${unitBlock(D,1)}
  <div class="scene" aria-live="polite">${D.lg.slice(-5).map(l=>`<p>${l.t}</p>`).join('')}</div>${unitBlock(D,0)}
  ${D.yield?'<p class="hint bad">Press Esc again to forfeit this match.</p>':''}</div>`;
}
/** Between-duels summary. */
function postHTML(T){
  const D=T.D,sr=T.sr,need=Math.ceil(T.bo/2),done=sr.w[0]>=need||sr.w[1]>=need;
  return `<h2>${D.win===0?'You take the game':'You lose the game'}</h2>
  <div class="scene">${D.lg.slice(-4).map(l=>`<p>${l.t}</p>`).join('')}</div>
  <p class="mono">${T.bo===3?`Games: you ${sr.w[0]}, ${T.opp.name.split(' ')[0]} ${sr.w[1]}.`:''} ${done?(sr.w[0]>sr.w[1]?'The bout is yours.':'The bout is lost.'):'Everyone is restored for the next game.'}</p>`;
}
/** End-of-tournament summary. */
function finalHTML(T){
  const r=T.res;
  return `<h2>${r.champ?'You are the champion':r.place}</h2>
  <p>${T.champ==='you'?`You win the ${RANKS[T.r].n}.`:`${r.champName} wins the ${RANKS[T.r].n}.`}${r.ranked?` <b>You are promoted to Rank ${RANKS[S.rank].k}.</b>`:''}</p>
  <h3>Your winnings</h3><div class="list">${r.lines.map(x=>`<div class="item">${x}</div>`).join('')}</div>
  <h3>Final bracket</h3><div class="rounds">${T.rounds.map((rd,k)=>`<div class="rnd"><h3>${roundNames(T.size)[k]}</h3>${rd.map(x=>`<div class="mt ${isYou(x)?'me':''}"><span class="${x.w===0?'w':'l'}">${pName(x.a)}</span><span class="vs">${x.sc[0]}–${x.sc[1]}</span><span class="${x.w===1?'w':'l'}">${pName(x.b)}</span></div>`).join('')}</div>`).join('')}</div>`;
}
/** Dispatches to the screen for the current tournament phase. */
function arenaHTML(){
  const T=S.tour,R=RANKS[T.r];
  const head=`<div class="hint arhead">Rank ${R.k} · ${R.n}${T.phase==='final'?'':' · '+roundNames(T.size)[T.rd]}</div>`;
  return head+({bracket:bracketHTML,pre:preHTML,duel:duelHTML,post:postHTML,final:finalHTML})[T.phase](T);
}
/** Dock buttons for the current tournament phase. */
function arenaDock(){
  const T=S.tour;
  if(T.phase==='bracket')return `<div class="acts">${btn('Enter',T.champ||!myMatch(T)?'See results':'To the arena','pri')}${btn('Escape',T.wd?'Confirm withdraw':'Withdraw','danger')}</div>`;
  if(T.phase==='pre')return `<div class="acts">${btn('Enter','Lock in lead','pri')}</div>`;
  if(T.phase==='post')return `<div class="acts">${btn('Enter','Continue','pri')}</div>`;
  if(T.phase==='final')return `<div class="acts">${btn('Enter','Leave the hall','pri')}</div>`;
  const D=T.D,me=D.s[0],u=me.u[me.a],o=D.s[1].u[D.s[1].a];
  const bench=(onlyLive)=>`<div class="cmds">${me.u.map((x,i)=>`<button class="b" data-k="${i+1}" ${x.hp<=0||i===me.a?'disabled':''}><kbd>${i+1}</kbd> ${SP[x.sp].n}<span class="sub">Lv ${x.lvl} · HP ${x.hp}/${x.max}${x.hp<=0?' · fainted':i===me.a?' · fighting':''}</span></button>`).join('')}${onlyLive?'':btn('Escape','Back')}</div>`;
  if(D.need)return `<p class="hint">Your beast has fallen. Choose who steps in.</p>`+bench(true);
  if(D.sub==='swap')return bench(false);
  const mv=movesFor(SP[u.sp],u.lvl).map((m,i)=>{
    const cdv=u.cd[m.n]||0;let sub;
    if(cdv>0)sub=`ready in ${cdv}`;
    else if(m.heal)sub=`Heals about ${Math.ceil(u.max*m.heal)} HP`;
    else{const tm=tmult(m.t,SP[o.sp].t),rg=dmgRange(u.lvl,m.p*(u.alpha?ALPHA_PWR:1),u.atk,o.def,tm*u.mult);sub=`${m.t} · power ${m.p}${tm>1?' · strong':tm<1?' · weak':''} · about ${rng(rg)} damage${moveCd(m)?` · rests ${moveCd(m)}`:''}`;}
    return `<button class="b" data-k="${i+1}" ${cdv>0?'disabled':''}><kbd>${i+1}</kbd> ${m.n}<span class="sub">${sub}</span></button>`;
  }).join('');
  const canSwap=me.u.some((x,i)=>i!==me.a&&x.hp>0);
  return `<div class="cmds">${mv}</div><div class="acts" style="margin-top:6px">${btn('g','Guard')}${btnSub('w','Swap',canSwap?'':'no one left','',!canSwap)}${btn('Escape',D.yield?'Confirm forfeit':'Forfeit','danger')}</div>`;
}
/** Key handler for tournament screens (digits pick lead, Enter locks in). */
function arenaKey(k){
  const T=S.tour;if(!T)return;
  const go=k==='Enter'||k===' '||k==='e';
  UI.noRepeat=true;
  if(T.phase==='bracket'){
    if(go){T.wd=false;bracketNext();}
    else if(k==='Escape'){if(T.wd){T.wd=false;withdraw();}else T.wd=true;}
    render();return;
  }
  if(T.phase==='pre'){const n=parseInt(k,10);if(n>=1&&n<=3)pickLead(n-1);else if(go)gameBegin();render();return;}
  if(T.phase==='post'){if(go)postNext();render();return;}
  if(T.phase==='final'){if(go)exitTour();else render();return;}
  const D=T.D;if(!D)return;
  const n=parseInt(k,10);
  if(D.need){if(n>=1&&n<=3)duelAct('swap',n-1);render();return;}
  if(D.sub==='swap'){
    if(k==='Escape')D.sub=null;
    else if(n>=1&&n<=3)duelAct('swap',n-1);
    render();return;
  }
  if(k==='Escape'){
    if(D.yield){D.yield=false;matchEnd(false,true);}else D.yield=true;
    render();return;
  }
  D.yield=false;
  if(n>=1&&n<=4)duelAct('move',n-1);
  else if(k==='g')duelAct('guard');
  else if(k==='w'&&D.s[0].u.some((x,i)=>i!==D.s[0].a&&x.hp>0))D.sub='swap';
  render();
}
