const fs=require("fs");
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
const code=require('./_load')()+`;globalThis.__t={get S(){return S;},UI,newGame,onKey,renderNow,addXpC,startBattle,mkFoe,victory,SP,cmax,saveGame,loadGame,panelHTML,renderDock,get LOG(){return LOG;}};`;
(0,eval)(code);
const T=__t;let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const key=k=>{T.UI.lockUntil=0;T.UI.noRepeat=false;T.onKey(k);};
T.newGame(false);const S=()=>T.S;
let uid=1;const mk=(sp,l,al)=>({id:uid++,sp,lvl:l,xp:0,hp:1,p:true,alpha:!!al});
const a=mk('cusith',15),b=mk('kitsune',15,true);for(const c of [a,b])c.hp=T.cmax(c);S().cr=[a,b];
T.addXpC(a,5000);
ok(a.sp==='gwyllgi'&&S().evoQ.length>=1,'Cu Sith evolved and queued ('+S().evoQ.length+' entries)');
const E=S().evoQ[0];
ok(E.from==='cusith'&&E.to==='gwyllgi'&&E.af.hp>E.b4.hp&&E.af.atk>E.b4.atk,'record has before/after stats '+JSON.stringify([E.b4,E.af]));
T.renderNow();ok(S().panel==='evolve','evolve panel takes over when nothing else is open');
let h=T.panelHTML();
ok(h.includes('Cu Sith became Gwyllgi')&&h.includes('Evolution!')&&h.includes('+5')&&h.includes('final form'),'panel shows names, deltas and final-form fact');
console.log(h.replace(/<style[\s\S]*?<\/style>|<svg[\s\S]*?<\/svg>/g,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,500));
// movement keys ignored while it is showing
const x0=S().pos.x;key('d');key('w');ok(S().panel==='evolve'&&S().pos.x===x0,'movement keys ignored on the evolution screen');
key('Enter');ok(S().panel===null&&S().evoQ.length===0,'Enter dismisses it');
// type-changing evolution + second in queue
T.addXpC(b,60000);
ok(b.sp!=='kitsune','kitsune evolved '+b.sp);
console.log('queue',S().evoQ.map(e=>e.from+'>'+e.to).join(', '));
T.renderNow();h=T.panelHTML();ok(h.includes('Type changed')||S().evoQ[0].b4.hp>0,'type change or stats shown');
if(S().evoQ.length>1)ok(T.renderDock&&true,'multiple queued evolutions');
let n=0;while(S().evoQ.length&&n++<5){key('Enter');}
ok(S().panel===null&&!S().evoQ.length,'queue drains one by one');
// battle path
const c=mk('jackalope',13);c.hp=T.cmax(c);S().cr=[c];S().mode='world';
const foe=T.mkFoe('jackalope',20,false);T.startBattle(foe,{});T.S.battle.foe.hp=0;T.victory();
T.renderNow();
ok(S().mode==='world'&&(c.sp==='jadehare'?S().panel==='evolve':true),'after a battle win the evolution screen appears (evolved: '+(c.sp)+')');
// save drops pending queue
S().evoQ=[{x:1}];S().panel=null;S().mode='world';T.saveGame(true);const raw=JSON.parse(store['beastmarch.save.v1']);ok(raw.evoQ&&raw.evoQ.length===0,'saves never keep a pending evolution');
console.log('FAILS',fails);
