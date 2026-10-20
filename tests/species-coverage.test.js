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
const T=__t;
console.log('lines',T.LINES.length,'species',Object.keys(T.SP).length);
const byR={};T.LINES.forEach(L=>{byR[L.r]=byR[L.r]||{lines:0,sp:0};byR[L.r].lines++;byR[L.r].sp+=L.i.length;});console.log(JSON.stringify(byR));
// zones
for(const zk of T.ZK){const z=T.ZN[zk];if(z.safe)continue;for(const w of ['l','w']){const p=T.WILDBY[zk+'|'+w]||[];if(!p.length)continue;const tot=p.reduce((a,e)=>a+e.w,0);console.log(zk,w,'lv',z.lv.join('-'),'n',p.length,p.map(e=>e.id+':'+(100*e.w/tot).toFixed(1)).join(' '));}}
const wild=new Set();for(const k in T.WILDBY)T.WILDBY[k].forEach(e=>wild.add(e.id));
const missing=T.LINES.filter(L=>L.r<5&&!wild.has(L.i[0]));console.log('non-legendary lines with no wild zone:',missing.map(L=>L.i[0]));
console.log('lines per zone-of-first-form');
const E=T.LINES.filter(L=>L.r<5).map(L=>L.e);console.log('evo levels',JSON.stringify(E));
// simulation: species seen from wildFor across all zones, day and night
const S2=[];
const W=T;W.newGame(false);const seen={},cnt={};
for(const night of [false,true]){W.S.turn=night?130:10;
 for(const zk of T.ZK){if(T.ZN[zk].safe)continue;for(const w of [false,true])for(let i=0;i<3000;i++){const f=W.wildFor(zk,w,0);if(f){seen[f.sp]=(seen[f.sp]||0)+1;}}}}
const nonLeg=Object.keys(T.SP).filter(k=>!T.SP[k].legend);
console.log('wild-reachable non-legendary species:',Object.keys(seen).length,'of',nonLeg.length);
console.log('never:',nonLeg.filter(k=>!seen[k]).join(','));
