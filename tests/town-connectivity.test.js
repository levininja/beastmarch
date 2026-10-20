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
const code=require('./_load')()+`;globalThis.__t={TILES:()=>TILES,DOORS:()=>DOORS,NPCAT,NPCPOS,BLK,TOWNS,START,W,H,NPCS,inb};`;
(0,eval)(code);
const T=__t;let fails=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)fails++;};
const W=T.W,TL=T.TILES();
function flood(sx,sy){const seen=new Uint8Array(W*T.H),q=[sy*W+sx];seen[q[0]]=1;for(let h=0;h<q.length;h++){const i=q[h],x=i%W,y=(i/W)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(!T.inb(nx,ny))continue;const j=ny*W+nx;if(seen[j]||T.BLK[TL[j]]||T.NPCAT[nx+','+ny])continue;seen[j]=1;q.push(j);}}return seen;}
const reach=flood(T.START[0],T.START[1]);
for(const t of T.TOWNS){
  const x1=t.x0+t.w-1,y1=t.y0+t.h-1;
  const spots={westGateIn:[t.x0+1,t.y0+5],eastGateIn:[x1-1,t.y0+5],northGateIn:[t.x0+6,t.y0+1],southGateIn:[t.x0+6,y1-1]};
  const bad=[];for(const k in spots){const [x,y]=spots[k];if(!reach[y*W+x])bad.push(k);}
  for(const k in T.DOORS()){if(!T.DOORS()[k].startsWith(t.id+':'))continue;const [x,y]=k.split(',').map(Number);if(!reach[(y+1)*W+x])bad.push('exit '+T.DOORS()[k]);}
  ok(!bad.length,'town '+t.id+' fully connected with NPCs blocking'+(bad.length?' BAD: '+bad.join(','):''));
}
const near=(x,y)=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>T.inb(x+dx,y+dy)&&reach[(y+dy)*W+x+dx]);
for(const id in T.NPCPOS){const p=T.NPCPOS[id];ok(near(p[0],p[1]),'npc approachable '+id+' at '+p);}
// NPCs must not be trapped by each other: every walkable tile in a town is reachable
for(const t of T.TOWNS){let unreachable=0;for(let y=t.y0+1;y<t.y0+t.h-1;y++)for(let x=t.x0+1;x<t.x0+t.w-1;x++){if(T.BLK[TL[y*W+x]]||T.NPCAT[x+','+y])continue;if(!reach[y*W+x])unreachable++;}ok(unreachable===0,'no walled-off floor tiles in '+t.id+' ('+unreachable+')');}
console.log('FAILS',fails);
for(const id of ['th','cw']){const t=T.TOWNS.find(x=>x.id===id);console.log(id);for(let y=t.y0-1;y<=t.y0+t.h;y++){let s='';for(let x=t.x0-1;x<=t.x0+t.w;x++){const n=Object.keys(T.NPCAT).find(k=>k===x+','+y);const tl=TL[y*W+x];s+=n?'N':(tl===7?'#':tl===8?'D':tl===9?'s':tl===13?'b':tl===6?'f':tl===5?'.':tl===11?'=':'~');}console.log(s);}}
