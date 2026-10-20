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
const code=require('./_load')()+`;globalThis.__t={get S(){return S;},newGame,wildFor,ZN,ZK,WILDBY,SP,tickEnts,lairAction,LAIRS,get LOG(){return LOG;},isNight,onKey,UI,move,TL,TILES:()=>TILES,zoneKeyAt};`;
(0,eval)(code);
const T=__t;let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
T.newGame(false);const S=()=>T.S;
// pools by day and by night
let emptyDay=[],gloomDay=0,gloomNight=0,nightN=0;
for(const k of Object.keys(T.WILDBY)){
  const [zk,w]=k.split('|');
  S().turn=10;let any=false;
  for(let i=0;i<400;i++){const f=T.wildFor(zk,w==='w');if(f){any=true;if(T.SP[f.sp].t==='Gloom')gloomDay++;}}
  if(!any)emptyDay.push(k);
  S().turn=170;
  for(let i=0;i<400;i++){const f=T.wildFor(zk,w==='w');if(f){nightN++;if(T.SP[f.sp].t==='Gloom')gloomNight++;}}
}
ok(gloomDay===0,'no Gloom beast ever spawns by day');
ok(gloomNight>0,'Gloom beasts do spawn at night ('+gloomNight+' of '+nightN+')');
console.log('pools empty by day:',emptyDay.join(', ')||'none');
// dawn clears gloom entities
S().turn=170;S().pos={room:null,x:130+32,y:110+24};
S().ents=[{sp:'redcap',lvl:14,x:131+32,y:110+24,stun:0,home:'gloam',aq:false},{sp:'jackalope',lvl:2,x:129+32,y:110+24,stun:0,home:'gloam',aq:false}];
S().turn=245;T.tickEnts();
ok(!S().ents.some(e=>T.SP[e.sp].t==='Gloom'),'Gloom entities vanish at dawn');
ok(S().ents.some(e=>e.sp==='jackalope'),'other entities stay');
// lair
const L=T.LAIRS.find(l=>l.sp==='redcap');S().turn=10;S().arm=null;T.lairAction(L.x,L.y);
ok(S().mode==='world'&&T.LOG.slice(-1)[0].t.includes('only stirs after dark'),'gloom lair silent by day');
S().turn=170;T.lairAction(L.x,L.y);T.lairAction(L.x,L.y);ok(S().mode==='battle','gloom lair fights at night');
console.log('FAILS',fails);
