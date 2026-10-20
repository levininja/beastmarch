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
;globalThis.__t={get S(){return S;},UI,newGame,onKey,move,render,renderNow,saveGame,loadGame,startBattle,mkFoe,talkTo,qAccept,qTurnIn,QUESTS,QB,NPCS,NPCPOS,NPCAT,MATS,RECIPES,giveMats,craft,SHRINES,SHB,RELICS,WILDBY,SPL,SP,LINES,RAR,NAQ,TILES:()=>TILES,REG:()=>REG,BLK,LAIRS,TOWNS,qComplete,pMax,panelHTML,zoneKeyAt,DROPS,IT,tickEnts,artSVG,shrineAction,tryBind,bindChance,qEvent,qMark,ZN,ZK,W,H,START,reachFrom,wildFor,TL,get LOG(){return LOG;},packVis,unpackVis,partyHTML,dexHTML,battleHTML,gearHTML,cmax,addXpC,SAVE_KEY};`;
(0,eval)(code);
const T=__t;let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
console.log('load+worldgen ms',Date.now()-t0);
const W=T.W,H=T.H,TL=T.TILES(),REG=T.REG();
ok(W===224&&H===176,'world is 224x176 (160x128 land plus the outer ring)');
let water=0;for(let i=0;i<W*H;i++)if(TL[i]===T.TL.WATER)water++;console.log('water %',(water/W/H*100).toFixed(1));
const zoneWater={},zoneN={};for(let i=0;i<W*H;i++){const z=T.ZK[REG[i]];zoneN[z]=(zoneN[z]||0)+1;if(TL[i]===T.TL.WATER)zoneWater[z]=(zoneWater[z]||0)+1;}
console.log(T.ZK.map(z=>z+':'+(((zoneWater[z]||0)/zoneN[z])*100).toFixed(0)+'%').join(' '));
// reachability (NPCs block)
const seen=new Uint8Array(W*H),q=[T.START[1]*W+T.START[0]];seen[q[0]]=1;
for(let h=0;h<q.length;h++){const i=q[h],x=i%W,y=(i/W)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const j=ny*W+nx;if(seen[j]||T.BLK[TL[j]]||T.NPCAT[nx+','+ny])continue;seen[j]=1;q.push(j);}}
const near=(x,y)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>seen[(y+dy)*W+x+dx]);
for(const L of T.LAIRS)ok(near(L.x,L.y),'lair reachable '+L.z);
for(const h of T.SHRINES)ok(near(h.x,h.y)&&T.zoneKeyAt(h.x,h.y)===h.zone,'shrine reachable in zone '+h.id);
for(const id in T.NPCPOS){const p=T.NPCPOS[id];ok(near(p[0],p[1]),'npc approachable '+id);}
for(const t of T.TOWNS){const g=[[t.x0-1,t.y0+5],[t.x0+t.w,t.y0+5],[t.x0+6,t.y0-1],[t.x0+6,t.y0+t.h]];ok(g.some(([x,y])=>seen[y*W+x]),'town reachable '+t.id);}
ok(Object.keys(T.NPCPOS).length===Object.keys(T.NPCS).filter(k=>T.NPCS[k].at).length,'all npcs placed');
// species facts
ok(T.SPL.length===100,'100 species');ok(T.NAQ===20,'20 aquatic');
ok(T.SPL.every(id=>T.SP[id].stages>=2),'every creature in an evolution line');
const rc={};for(const L of T.LINES)rc[L.r]=(rc[L.r]||0)+1;console.log('lines by rarity',JSON.stringify(rc));
for(const zk of T.ZK.filter(z=>!T.ZN[z].safe))ok((T.WILDBY[zk+'|l']||[]).length>0,'land species in '+zk);
// evolution chain consistency
for(const id of T.SPL){const sp=T.SP[id];if(sp.next){ok(T.SP[sp.next].prev===id&&sp.evo[0]>=10&&sp.evo[0]<=38,'evo '+id);}}
// art
let bad=0;for(const id of T.SPL){const s=T.artSVG(id);if(!s.startsWith('<svg')||!s.endsWith('</svg>')||/NaN|undefined/.test(s))bad++;}
ok(bad===0,'art builds for all species, no NaN');
fs.writeFileSync(require('os').tmpdir()+'/beastmarch_art_test.html','<body style="background:#EEE;margin:0;display:grid;grid-template-columns:repeat(10,100px)">'+T.SPL.map(id=>`<div style="width:100px;font:8px monospace">${T.artSVG(id).replace('<svg','<svg width="100" height="90"')}${id}</div>`).join('')+'</body>');
// quest/shrine flow
T.newGame(false);const S=T.S;S.mode='world';S.lvl=20;
ok(T.SHRINES.length===6&&Object.keys(T.RELICS).length===18,'6 shrines, 18 relics');
for(const h of T.SHRINES)for(const r of h.need)if(!T.QUESTS.some(q=>q.relics&&q.relics[r]))ok(false,'relic '+r+' has a quest');
// complete chain surtr
S.pos={room:null,x:149+32,y:12+24};
for(const id of ['sr1','sr2','sr3']){const q=T.QB[id];S.q[id]={st:'active',p:q.obj.map(o=>o.t==='visit'?1:(o.n||1))};T.qTurnIn(id);}
ok(S.relics.sr1&&S.relics.sr2&&S.relics.sr3&&S.shrines.surtr.known,'relics granted and shrine revealed');
S.pos={room:null,x:149+32,y:12+24};T.shrineAction(150+32,12+24);ok(S.arm==='shrine:surtr','shrine armed');
T.shrineAction(150+32,12+24);ok(S.mode==='battle'&&S.battle.foe.sp==='surtling','legend appears');
S.items.gilded=20;S.battle.foe.hp=1;T.UI.lockUntil=0;
let bound=false;for(let i=0;i<60&&!bound&&S.mode==='battle';i++){T.tryBind('gilded');bound=S.cr.some(c=>c.sp==='surtling');}
ok(bound&&!S.relics.sr1&&S.shrines.surtr.done,'bound legendary consumes relics');
// not enough relics
S.mode='world';S.battle=null;T.shrineAction(118+32,70+24);ok(/hollows/.test(T.LOG[T.LOG.length-1].t),'altar without relics');
// save migration
const old={hard:false,lvl:7,xp:5,gold:99,hp:50,items:{cord:3,silver:0,gilded:0,salve:1,tonic:0,boat:0},cr:[{id:1,sp:'kitsune',lvl:6,xp:0,hp:40,p:true}],uid:2,pos:{room:null,x:40,y:36},face:{x:1,y:0},turn:10,steps:5,kills:3,cool:0,boating:false,haven:{room:'th:cottage',x:2,y:4},seen:{kitsune:1},caught:{kitsune:1},lairs:{'30,34':5},vis:Buffer.alloc(5120).toString('base64'),met:true};
store[T.SAVE_KEY]=JSON.stringify(old);
ok(T.loadGame()&&T.S.lvl===7&&T.S.cr[0].sp==='kitsune','old save loads');
console.log('old pos (40,36) ->',JSON.stringify(T.S.pos));
ok(T.S.q&&T.S.relics&&T.S.shrines&&T.S.vis.length===W*H,'old save gets new fields');
// pack vis
const v=new Uint8Array(W*H);for(let i=0;i<v.length;i+=3)v[i]=1;const u=T.unpackVis(T.packVis(v));let same=true;for(let i=0;i<v.length;i++)if(u[i]!==v[i]){same=false;break;}
ok(same,'vis bit-pack roundtrip, '+T.packVis(v).length+' chars (was ~'+Math.ceil(W*H/3)*4/1+')');
T.newGame(false);T.S.mode='world';T.saveGame(true);ok(T.loadGame()&&T.S.ver===4,'save/load v4');
console.log('save size chars',store[T.SAVE_KEY].length);
// panels render
T.S.panel=null;
for(const p of ['dex','party','gear','quests','map','pack','forge','help']){try{T.S.panel=p;T.panelHTML();T.renderNow();ok(true,'panel '+p);}catch(e){ok(false,'panel '+p+' '+e.message);}}
// rarity distribution of wild spawns
const cnt={};let bad2=0;for(let i=0;i<20000;i++){const f=T.wildFor('wood',false);if(!f){bad2++;continue;}cnt[f.sp]=(cnt[f.sp]||0)+1;}
console.log('wood spawn sample',JSON.stringify(cnt));
let leg=0;for(const zk of T.ZK.filter(z=>!T.ZN[z].safe))for(let i=0;i<2000;i++){for(const w of [false,true]){const f=T.wildFor(zk,w);if(f&&T.SP[f.sp].legend)leg++;}}
ok(leg===0,'legendary never spawns in the wild');
// fuzz
T.newGame(false);T.S.mode='world';const dirs=[[1,0],[-1,0],[0,1],[0,-1]];
const spots=[[81,80],[120,90],[140,64],[76,114],[100,14],[146,30],[30,30],[30,100],[136,110]].map(p=>[p[0]+32,p[1]+24]);
const tf=Date.now();let nb=0;
for(let i=0;i<20000;i++){T.UI.lockUntil=0;const S2=T.S;
 if(S2.mode==='dead'){T.S.dead=null;T.S.mode='world';T.S.hp=T.pMax(T.S.lvl);T.S.pos={room:null,x:81+32,y:80+24};continue;}
 if(S2.mode==='battle'){nb++;let g=0;while(T.S.mode==='battle'&&g++<200){T.UI.lockUntil=0;T.onKey(String(1+Math.floor(Math.random()*4)));T.S.battle&&(T.S.battle.sub=null);}continue;}
 if(S2.panel){T.onKey('Escape');continue;}
 const d=dirs[Math.floor(Math.random()*4)];T.move(d[0],d[1]);
 if(i%1500===0){const s=spots[(i/1500)%spots.length|0];T.S.pos={room:null,x:s[0],y:s[1]};T.S.lvl=Math.max(T.S.lvl,12);}
}
ok(true,'fuzz ok, battles '+nb+', ms '+(Date.now()-tf));
console.log('FAILS',fails);
