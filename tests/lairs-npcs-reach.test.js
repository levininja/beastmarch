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
(0,eval)(require('./_load')()+`;globalThis.__t={TILES(){return TILES;},LAIRS,START,reachFrom,W,H,newGame,TL,BLK,NPCAT,NPCPOS};`);
const T=__t;T.newGame(false);const TI=T.TILES(),W=T.W,H=T.H;
function reach(skip){const seen=new Uint8Array(W*H),q=[T.START[1]*W+T.START[0]];seen[q[0]]=1;for(let h=0;h<q.length;h++){const i=q[h],x=i%W,y=(i/W)|0;for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=W||ny>=H)continue;const j=ny*W+nx;if(seen[j]||T.BLK[TI[j]]||(T.NPCAT[nx+','+ny]&&T.NPCAT[nx+','+ny]!==skip))continue;seen[j]=1;q.push(j);}}return seen;}
const L=T.LAIRS.find(l=>l.z==='deepwood');const near=s=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>s[(L.y+dy)*W+L.x+dx]);
console.log('blocked all:',near(reach(null)));
for(const id in T.NPCPOS)if(near(reach(id)))console.log('freed by removing',id,T.NPCPOS[id]);
