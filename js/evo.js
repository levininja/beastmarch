/**
 * evo.js — evolution celebration screen
 *
 * Load order: 8th. Records what changed when a creature evolves (stats, moves,
 * type) and renders the animated evolution panel.
 *
 * All files are classic scripts sharing one global scope (no modules); see README.
 */
'use strict';
/* ===== Evolution: a record is queued whenever a companion evolves, and a celebration screen plays it back ===== */
/** Captures a before/after record (stats, moves, type) of creature `c` evolving from `from`. */
function evoRecord(c,from,b4,mv4,hp4,fresh){
  const to=c.sp,sp=SP[to];
  (S.evoQ=S.evoQ||[]).push({id:c.id,from,to,lvl:c.lvl,alpha:!!c.alpha,b4,af:cs(c),mv4,mv:movesFor(sp,c.lvl).map(m=>({n:m.n,t:m.t,heal:!!m.heal})),hp4,hp:c.hp,max:cmax(c),fresh,next:sp.evo?{lvl:sp.evo[0],id:sp.evo[1]}:null});
}
const typeStrong=t=>STRONG[t]||[];
const typeWeak=t=>Object.keys(STRONG).filter(k=>STRONG[k].includes(t));
const listOf=a=>a.length<2?(a[0]||'nothing'):a.length===2?a.join(' and '):a.slice(0,-1).join(', ')+', and '+a[a.length-1];
/* Explain what a type change means: old and new weaknesses, what it now beats, and any matchup that cuts both ways. */
/** Explains how the type change between `a` and `b` alters strengths and weaknesses. */
function typeNote(a,b){
  const ws=typeWeak(b),st=typeStrong(b),both=st.filter(t=>ws.includes(t));
  const stOnly=st.filter(t=>!both.includes(t)),wkOnly=ws.filter(t=>!both.includes(t));
  let h=`Its attacks now use ${b}, so they hit ${listOf(st)} hard. It used to be weak to ${listOf(typeWeak(a))}; now it is weak to ${listOf(ws)}.`;
  if(both.length)h+=` ${b} and ${both.join(' and ')} beat each other, so expect that matchup to cut both ways.`;
  return h;
}
/** Evolution screen HTML. */
function evolveHTML(){
  const E=S.evoQ[0],A=SP[E.from],B=SP[E.to],more=S.evoQ.length-1;
  const sparks=Array.from({length:14},(_,i)=>`<i class="spark" style="--a:${Math.round(i*360/14)}deg"></i>`).join('');
  const row=(lab,a,b)=>`<div class="evr"><span>${lab}</span><span class="mono">${a}</span><span class="dim">→</span><span class="mono"><b>${b}</b></span><span class="dlt ${b>a?'up':''}">${b>a?'+'+(b-a):b<a?String(b-a):'same'}</span></div>`;
  const typeChanged=A.t!==B.t;
  const oldNames=E.mv4,newMoves=E.mv;
  const dropped=oldNames.filter(n=>!newMoves.some(m=>m.n===n));
  const moveChips=newMoves.map(m=>{const isNew=!oldNames.includes(m.n);return `<span class="chip" style="--c:${TYPE[m.t][0]}"><i></i>${m.n}${isNew?' · new':''}</span>`;}).join(' ')+dropped.map(n=>` <span class="chip" style="--c:#8A938F;text-decoration:line-through;opacity:.6"><i></i>${n} · replaced</span>`).join('');
  const fx=[];
  fx.push(`Level ${E.lvl}${E.alpha?' · Alpha':''} · XP and bonuses carry over`);
  fx.push(`Restored some health: now ${E.hp}/${E.max} HP`);
  if(E.fresh)fx.push(`New bestiary entry: you have not held a ${B.n} before`);
  fx.push(E.next?`Evolves again at level ${E.next.lvl} into ${SP[E.next.id].n}`:'This is its final form');
  return `<div class="evo">
   <h2 class="evt">Evolution!</h2>
   <div class="stage2"><div class="glow"></div><div class="old">${artHTML(E.from,176,'port')}</div><div class="new">${artHTML(E.to,176,'port')}</div>${sparks}</div>
   <div class="evsub"><div class="nm">${A.n} became ${B.n}</div><div>${chip(RAR[B.rar].n,RAR[B.rar].c)} ${B.stage>1?`<span class="dim">Stage ${B.stage} of ${B.stages}</span>`:''}</div></div>
   <div class="evbody">
    <div class="evstats">${row('HP',E.b4.hp,E.af.hp)}${row('Attack',E.b4.atk,E.af.atk)}${row('Defense',E.b4.def,E.af.def)}${row('Speed',E.b4.spd,E.af.spd)}</div>
    <div class="evtype">${typeChanged?`<p><b>Type changed:</b> ${tchip(A.t)} → ${tchip(B.t)}</p><p class="hint">${typeNote(A.t,B.t)}</p>`:`<p><b>Type:</b> ${tchip(B.t)} <span class="hint">unchanged</span></p>`}</div>
    <p class="evmoves"><b>Moves:</b> ${moveChips}</p>
    <ul class="evfacts">${fx.map(x=>`<li>${x}</li>`).join('')}</ul>
   </div>${more?`<p class="hint">${more} more ${more===1?'evolution':'evolutions'} waiting.</p>`:''}</div>`;
}
/** Dock for the evolution screen. */
function evolveDock(){
  const more=S.evoQ.length-1;
  return `<div class="acts">${btn('Enter',more?`Continue (${more} more)`:'Continue','pri')}</div>`;
}
