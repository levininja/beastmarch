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
const code=require('./_load')()+`;globalThis.__t={get S(){return S;},UI,newGame,onKey,renderNow,panelHTML,enterRoom,aiLead,SP,tmult,get LOG(){return LOG;}};`;
(0,eval)(code);
const T=__t;let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const key=k=>{T.UI.lockUntil=0;T.UI.noRepeat=false;T.onKey(k);};
T.newGame(false);const S=()=>T.S;
const by={};for(const k in T.SP){(by[T.SP[k].t]=by[T.SP[k].t]||[]).push(k);}
const types=Object.keys(by);
// find a pair where A strongly beats B
let A,B,C;for(const a of types)for(const b of types)if(T.tmult(a,b)>1&&T.tmult(b,a)<1){A=a;B=b;}
for(const c of types)if(c!==A&&c!==B&&T.tmult(c,B)<=1&&T.tmult(B,c)<=1){C=c;break;}
console.log('A beats B:',A,B,'neutral',C);
const team=[{sp:by[B][0],lvl:10},{sp:by[A][0],lvl:10},{sp:by[C||A][0],lvl:10}];
const seen=[{sp:by[B][0],lvl:10},{sp:by[B][0],lvl:10},{sp:by[B][0],lvl:10}];
let n=0;for(let i=0;i<300;i++)if(T.aiLead(team,seen,4,'tactician')===1)n++;
ok(n>250,`rival with a ${A} beast leads it against a squad of ${B} (${n}/300)`);
n=0;for(let i=0;i<300;i++)if(T.aiLead(team,seen,0,'gambler')===1)n++;
ok(n<250&&n>40,`gambler at low rank is noisy (${n}/300)`);
// flow
let uid=1;const mk=(sp,l,p)=>({id:uid++,sp,lvl:l,xp:0,hp:99,p});
S().cr=[mk('tatzel',15,true),mk('sphinxcub',17,true),mk('yeti',16,true)];
S().turn=(3-1)*240+5;T.enterRoom('th:hall');S().pos.x=5;S().pos.y=4;S().face={x:0,y:-1};key('e');
ok(S().panel==='hall','hall');
key('Enter');ok(S().mode==='arena','in arena');
let t=S().tour;ok(t.phase==='bracket','bracket');key('Enter');t=S().tour;ok(t.phase==='pre','pre phase');
let h=T.panelHTML?'':'';
const dockOk=document;
key('3');ok(t.lead===2,'key 3 selects third squad member as lead');
key('2');ok(t.lead===1,'key 2 changes lead');
key('Enter');ok(t.phase==='duel','locked in -> duel');
ok(t.D.s[0].a===1,'my active unit is the chosen lead (index '+t.D.s[0].a+')');
ok(t.D.s[1].a>=0&&t.D.s[1].a<3,'rival lead chosen ('+t.D.s[1].a+')');
ok(t.D.lg[0].t.includes('Both leads are revealed'),'reveal line: '+t.D.lg[0].t);
ok(t.lead===0,'lead resets for next game');
console.log('FAILS',fails);
