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
const code=require('./_load')()+`;globalThis.__t={TILES:()=>TILES,REG:()=>REG,BLK,TL,TOWNS,LAIRS,SHRINES,NPCAT,NPCPOS,START,W,H,ZK,inb,hash2,vnoise};`;
(0,eval)(code);
const T=__t,W=T.W,H=T.H,TL=T.TILES(),REG=T.REG();
console.log('lava blocks movement:',!!T.BLK[T.TL.LAVA],' water blocks:',!!T.BLK[T.TL.WATER]);
const seen=new Uint8Array(W*H),q=[T.START[1]*W+T.START[0]];seen[q[0]]=1;
for(let h=0;h<q.length;h++){const i=q[h],x=i%W,y=(i/W)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(!T.inb(nx,ny))continue;const j=ny*W+nx;if(seen[j]||T.BLK[TL[j]]||T.NPCAT[nx+','+ny])continue;seen[j]=1;q.push(j);}}
const near=(x,y)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>T.inb(x+dx,y+dy)&&seen[(y+dy)*W+x+dx]);
const cz=T.ZK.indexOf('cinder');let lava=0,open=0,openReach=0,openUnreach=0;
for(let i=0;i<W*H;i++)if(REG[i]===cz){if(TL[i]===T.TL.LAVA)lava++;else if(!T.BLK[TL[i]]){open++;if(seen[i])openReach++;else openUnreach++;}}
console.log('cinder tiles: lava',lava,' walkable',open,' reachable',openReach,' cut off',openUnreach);
for(const L of T.LAIRS.filter(l=>l.z==='cinder'))console.log('cinder lair',L.sp,'reachable on foot:',near(L.x,L.y));
for(const h of T.SHRINES.filter(s=>s.zone==='cinder'))console.log('cinder shrine',h.id,'reachable on foot:',near(h.x,h.y));
const ew=T.TOWNS.find(t=>t.id==='ew');const gates=[[ew.x0-1,ew.y0+5],[ew.x0+ew.w,ew.y0+5],[ew.x0+6,ew.y0-1],[ew.x0+6,ew.y0+ew.h]];
console.log('Emberwatch gates reachable from start (W,E,N,S):',gates.map(([x,y])=>!!seen[y*W+x]).join(','));
for(const id in T.NPCPOS){const p=T.NPCPOS[id];if(T.ZK[REG[p[1]*W+p[0]]]==='cinder')console.log('cinder npc',id,'reachable:',near(p[0],p[1]));}
// every row of tiles in cinder printed coarsely
