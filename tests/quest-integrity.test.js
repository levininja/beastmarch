const fs=require("fs");
const noop=new Proxy(function(){},{get:(t,p)=>p==='width'?600:p==='height'?440:p==='length'?0:noop,apply:()=>noop,set:()=>true});
const el=()=>new Proxy({innerHTML:'',hidden:false,style:{},textContent:'',dataset:{},width:600,height:440,scrollTop:0,scrollHeight:0,getBoundingClientRect:()=>({width:600}),getContext:()=>noop,blur(){},closest:()=>null,classList:{add(){},remove(){}}},{get:(t,p)=>p in t?t[p]:noop,set:(t,p,v)=>{t[p]=v;return true}});
global.document={querySelector:()=>el(),addEventListener(){},documentElement:{getAttribute:()=>null},fonts:null};
global.window={addEventListener(){},devicePixelRatio:1};
global.matchMedia=()=>({matches:false,addEventListener(){}});
global.MutationObserver=class{observe(){}};
global.localStorage={getItem:()=>null,setItem(){},removeItem(){}};
global.CanvasRenderingContext2D=undefined;
(0,eval)(require('./_load')()+`;globalThis.__t={LINES,ZN,ZK,WILDBY,RAR,SP,SHRINES,LAIRS,QUESTS,DROPS,wildFor,newGame,get S(){return S;}};`);
(0,eval)(require('./_load')()+`;globalThis.__t={QUESTS,QB,NPCS,MATS,RECIPES,DROPS,ZN,SP,IT,LAIRS,newGame,qTurnIn,qOpen,qAvail,get S(){return S;},qComplete};`);
const T=__t;let bad=0;const no=m=>{console.log('BAD',m);bad++;};
for(const q of T.QUESTS){if(!T.NPCS[q.giver])no('giver '+q.id);if(q.after&&!T.QB[q.after])no('after '+q.id);
 for(const o of q.obj){for(const z of [].concat(o.zone||[]))if(!T.ZN[z])no('zone '+q.id+' '+z);}
 for(const m in (q.mats||{}))if(!T.MATS[m])no('mat '+q.id+' '+m);for(const i in (q.items||{}))if(!T.IT[i])no('item '+q.id+' '+i);}
for(const r of T.RECIPES)for(const m in r.need)if(!T.MATS[m])no('recipe mat '+r.id+' '+m);
for(const z in T.DROPS)for(const m in T.DROPS[z])if(!T.MATS[m])no('drop '+z+' '+m);
for(const L of T.LAIRS)if(!T.SP[L.sp])no('lair sp '+L.sp);
// every material obtainable: in some drop table or quest reward
const got=new Set();for(const z in T.DROPS)for(const m in T.DROPS[z])got.add(m);for(const q of T.QUESTS)for(const m in (q.mats||{}))got.add(m);
for(const m in T.MATS)if(!got.has(m))no('material never obtainable '+m);
// every recipe craftable in principle
T.newGame(false);T.S.lvl=50;
const ids=T.QUESTS.filter(q=>['brine','thessaly','ferren','sibyl','astra'].includes(q.giver)).map(q=>q.id);
let done=0;for(const id of ids){const q=T.QB[id];T.S.q[id]={st:'active',p:q.obj.map(o=>o.t==='visit'?1:(o.n||1))};T.qTurnIn(id);if(T.S.q[id].st==='done')done++;else no('could not complete '+id+' '+JSON.stringify(T.S.q[id]));}
console.log('new quests completed',done,'of',ids.length,'| rings unlocked:',Object.keys(T.S.recipes).filter(k=>k.startsWith('r_')).join(','));
console.log('quests',T.QUESTS.length,'recipes',T.RECIPES.length,'mats',Object.keys(T.MATS).length,'BAD',bad);
