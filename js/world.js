/**
 * world.js — deterministic world generation
 *
 * Load order: 3rd. build() creates TILES/REG for the 224x176 map from seeded
 * value noise: zone layout (layoutRegions), water (waterField), land features
 * (GEN), towns, paths/bridges (connectAll) and NPC placement (placeNPCs). The
 * same code always produces the same world, so saves only store the player's
 * changes. Also holds the interior-room helpers.
 *
 * All files are classic scripts sharing one global scope (no modules); see README.
 */
'use strict';
const TL={G:0,TALL:1,TREE:2,ROCK:3,WATER:4,ROAD:5,FENCE:6,BWALL:7,DOOR:8,SIGN:9,LAIR:10,BRIDGE:11,LAVA:12,BENCH:13,SHRINE:14};
const BLK=[0,0,1,1,1,0,1,1,0,1,1,0,1,1,1];
let TILES,REG,DOORS,SIGNS,NPCPOS={},NPCAT={};
/** Integer hash of (x,y,seed) mapped to [0,1). Basis of all deterministic randomness. */
function hash2(x,y,s){let h=(Math.imul(x,374761393)+Math.imul(y,668265263)+Math.imul(s,2147483647))|0;h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967296;}
/** Smooth value noise at scale `sc`; used for terrain, zone wobble and water. */
function vnoise(x,y,sc,s){
  const gx=x/sc,gy=y/sc,x0=Math.floor(gx),y0=Math.floor(gy),fx=gx-x0,fy=gy-y0;
  const a=hash2(x0,y0,s),b=hash2(x0+1,y0,s),c=hash2(x0,y0+1,s),d=hash2(x0+1,y0+1,s);
  const u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
  return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v;
}
/* Land features per zone. Water is placed first, so these only apply to the tiles water leaves. */
const GEN={
 green:{tall:.60,tree:.70,rock:.84},wood:{tall:.62,tree:.54,rock:.84},crag:{tall:.66,tree:.74,rock:.56},mire:{tall:.50,tree:.70,rock:.88},
 dunes:{tall:.72,tree:.90,rock:.62},frost:{tall:.62,tree:.66,rock:.72},gloam:{tall:.55,tree:.55,rock:.86},
 cinder:{tall:.64,tree:.86,rock:.58,lava:.72},drake:{tall:.62,tree:.68,rock:.60,lava:.74},
 shore:{tall:.60,tree:.78,rock:.80},mangrove:{tall:.52,tree:.40,rock:.88},bonefield:{tall:.70,tree:.92,rock:.50},
 mesa:{tall:.68,tree:.88,rock:.44},mistvale:{tall:.50,tree:.62,rock:.82},obsidian:{tall:.72,tree:.92,rock:.50,lava:.70},
 deepwood:{tall:.50,tree:.36,rock:.86},tors:{tall:.66,tree:.80,rock:.42},witchfen:{tall:.48,tree:.52,rock:.90},
 glacier:{tall:.60,tree:.84,rock:.62},starfall:{tall:.56,tree:.80,rock:.70},worldscar:{tall:.72,tree:.94,rock:.46,lava:.68}};
/* Share of each zone's open land that becomes water. Rivers are thin winding bands, lakes are blobs.
   Some lands are drowned (Mirelow Fen, Saltglass Shore, Witchfen), others are bone dry. */
const WATERCFG={
 green:{f:.12,mode:'lake',sc:9},wood:{f:.16,mode:'river',sc:8},crag:{f:.08,mode:'lake',sc:8},mire:{f:.45,mode:'lake',sc:7},
 dunes:{f:.02,mode:'lake',sc:6},frost:{f:.22,mode:'lake',sc:9},gloam:{f:.18,mode:'lake',sc:8},cinder:{f:0},drake:{f:.20,mode:'lake',sc:10},
 shore:{f:.40,mode:'lake',sc:9},mangrove:{f:.34,mode:'river',sc:7},bonefield:{f:.02,mode:'lake',sc:6},mesa:{f:0},
 mistvale:{f:.18,mode:'river',sc:9},obsidian:{f:0},deepwood:{f:.10,mode:'river',sc:8},tors:{f:.05,mode:'lake',sc:7},
 witchfen:{f:.42,mode:'lake',sc:7},glacier:{f:.24,mode:'lake',sc:10},starfall:{f:.08,mode:'lake',sc:9},worldscar:{f:0}};
/* Zone layout. Each wild zone is grown from one or more seeds: 's' a line segment (x1,y1,x2,y2), 'p' a point, 'o' a ring
   (cx,cy,radius). A tile belongs to the zone whose seed is nearest, measured in units of that zone's scale r, after the
   tile has been nudged by two layers of noise. Several seeds make bent, forked and crescent shapes.
   INNER zones fill the original land (coordinates before the OX,OY shift); OUTER zones fill the ring around it (levels 23 to 50). */
const ZSEEDS={
 drake:{r:0.3,s:[['s',10,20,26,14],['s',26,14,42,6],['s',42,6,56,22]]},
 frost:{r:0.3,s:[['s',80,10,104,14],['s',104,14,90,32],['s',90,32,72,38],['s',72,38,58,46]]},
 cinder:{r:0.3,s:[['s',150,8,134,26],['s',134,26,142,42],['s',134,26,116,18]]},
 green:{r:0.38,s:[['s',56,70,74,76],['s',74,76,92,76]]},
 wood:{r:0.3,s:[['s',14,66,16,92],['s',16,92,32,96]]},
 crag:{r:0.38,s:[['s',116,70,146,64]]},
 mire:{r:0.46,s:[['s',58,114,98,112]]},
 dunes:{r:0.66,s:[['s',26,124,50,116]]},
 gloam:{r:0.51,s:[['s',140,120,152,114],['s',152,114,148,106]]}};
const OUTER={
 shore:{r:4,s:[['s',92,164,130,164]]},
 mangrove:{r:3.83,s:[['s',150,164,192,164]]},
 bonefield:{r:4,s:[['s',30,164,72,164]]},
 mesa:{r:2.4,s:[['s',208,150,208,118]]},
 mistvale:{r:3.59,s:[['s',16,150,16,118]]},
 obsidian:{r:3.33,s:[['s',208,112,208,78]]},
 deepwood:{r:3.51,s:[['s',16,112,16,78]]},
 tors:{r:2.76,s:[['s',208,72,208,40]]},
 witchfen:{r:1.7,s:[['s',16,72,16,40]]},
 glacier:{r:1.3,s:[['s',208,30,196,12],['s',196,12,170,12]]},
 starfall:{r:0.66,s:[['s',16,30,28,12],['s',28,12,54,12]]},
 worldscar:{r:0.42,s:[['s',80,12,144,12]]}};
const inb=(x,y)=>x>=0&&y>=0&&x<W&&y<H;
const D4=[[1,0],[-1,0],[0,1],[0,-1]];
const inTown=(x,y)=>TOWNS.some(t=>x>=t.x0&&x<t.x0+t.w&&y>=t.y0&&y<t.y0+t.h);
const WILDZ=ZK.filter(k=>!ZN[k].safe);
/** Distance from point (px,py) to the line segment (x1,y1)-(x2,y2). */
function segDist(px,py,x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((px-x1)*dx+(py-y1)*dy)/l)):0;
  return Math.hypot(px-x1-t*dx,py-y1-t*dy);
}
const inInner=(x,y)=>{const m=11*vnoise(x,y,14,91);return x>=OX-m&&x<OX+160+m&&y>=OY-m&&y<OY+128+m;};
const shiftSeed=s=>s[0]==='s'?['s',s[1]+OX,s[2]+OY,s[3]+OX,s[4]+OY]:s[0]==='o'?['o',s[1]+OX,s[2]+OY,s[3]]:['p',s[1]+OX,s[2]+OY];
const OUTERZ=Object.keys(OUTER);
/** Assigns every tile a zone id in REG from the ZSEEDS/OUTER seeds (segments, points, rings), pins lairs and shrines into their zones, merges stray fragments and applies town rectangles. */
function layoutRegions(){
  const reg=new Uint8Array(W*H);
  const groups=[
    WILDZ.filter(k=>ZSEEDS[k]).map(k=>({k,i:ZK.indexOf(k),r:ZSEEDS[k].r,s:ZSEEDS[k].s.map(shiftSeed)})),
    OUTERZ.map(k=>({k,i:ZK.indexOf(k),r:OUTER[k].r,s:OUTER[k].s}))];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const wx=x+20*(vnoise(x,y,20,71)-.5)+9*(vnoise(x,y,6,73)-.5),wy=y+20*(vnoise(x,y,20,79)-.5)+9*(vnoise(x,y,6,83)-.5);
    const grp=groups[inInner(x,y)?0:1];
    let best=1e9,bk=0;
    for(const Z of grp)for(const s of Z.s){
      const d=(s[0]==='s'?segDist(wx,wy,s[1],s[2],s[3],s[4]):s[0]==='o'?Math.abs(Math.hypot(wx-s[1],wy-s[2])-s[3]):Math.hypot(wx-s[1],wy-s[2]))/Z.r;
      if(d<best){best=d;bk=Z.i;}
    }
    reg[y*W+x]=bk;
  }
  /* Lairs, altars and wild quest-givers must sit in the zone they belong to. */
  const pin=(x,y,zk)=>{const zi=ZK.indexOf(zk);for(let dy=-4;dy<=4;dy++)for(let dx=-4;dx<=4;dx++)if(dx*dx+dy*dy<=17&&inb(x+dx,y+dy))reg[(y+dy)*W+x+dx]=zi;};
  /* Fold stray scraps (under 90 tiles) into the zone around them, so every zone is a few solid pieces. */
  const keep=new Set();
  for(const L of LAIRS)keep.add(L.y*W+L.x);for(const h of SHRINES)keep.add(h.y*W+h.x);
  for(const id in NPCS){const n=NPCS[id];if(n.at&&n.at.wild)keep.add(n.at.y*W+n.at.x);}
  for(let pass=0;pass<2;pass++){
    const seen=new Uint8Array(W*H);
    for(let s=0;s<W*H;s++){
      if(seen[s])continue;const zi=reg[s],comp=[s];seen[s]=1;let pinned=false;
      for(let h=0;h<comp.length;h++){
        const i=comp[h],x=i%W,y=(i/W)|0;if(keep.has(i))pinned=true;
        for(const [dx,dy] of D4){const nx=x+dx,ny=y+dy;if(!inb(nx,ny))continue;const j=ny*W+nx;if(!seen[j]&&reg[j]===zi){seen[j]=1;comp.push(j);}}
      }
      if(comp.length>=90||pinned)continue;
      const votes={};
      for(const i of comp){const x=i%W,y=(i/W)|0;for(const [dx,dy] of D4){const nx=x+dx,ny=y+dy;if(!inb(nx,ny))continue;const z=reg[ny*W+nx];if(z!==zi)votes[z]=(votes[z]||0)+1;}}
      let bz=zi,bv=0;for(const z in votes)if(votes[z]>bv){bv=votes[z];bz=+z;}
      for(const i of comp)reg[i]=bz;
    }
  }
  for(const L of LAIRS)pin(L.x,L.y,L.z);
  for(const h of SHRINES)pin(h.x,h.y,h.zone);
  for(const id in NPCS){const n=NPCS[id];if(n.at&&n.at.wild)pin(n.at.x,n.at.y,n.at.wild);}
  for(const t of TOWNS){const zi=ZK.indexOf(t.id);for(let y=t.y0;y<t.y0+t.h;y++)for(let x=t.x0;x<t.x0+t.w;x++)reg[y*W+x]=zi;}
  return reg;
}
/* Label spots for the world map: the zone tile nearest its centre of mass. */
let ZLAB={};
/** Computes a label position per zone (ZLAB) for the world map. */
function computeLabels(){
  const sx={},sy={},n={};
  for(let i=0;i<W*H;i++){const k=ZK[REG[i]];if(ZN[k].safe)continue;sx[k]=(sx[k]||0)+i%W;sy[k]=(sy[k]||0)+((i/W)|0);n[k]=(n[k]||0)+1;}
  ZLAB={};
  for(const k of WILDZ){
    if(!n[k])continue;const cx=sx[k]/n[k],cy=sy[k]/n[k];let b=1e9,bx=0,by=0;
    for(let i=0;i<W*H;i++){if(ZK[REG[i]]!==k)continue;const x=i%W,y=(i/W)|0,d=(x-cx)**2+(y-cy)**2;if(d<b){b=d;bx=x;by=y;}}
    ZLAB[k]=[bx,by];
  }
}
const zoneKeyAt=(x,y)=>ZK[REG[y*W+x]];
/** Builds the water mask per zone from WATERCFG so zones can be wetter or drier. */
function waterField(){
  const wat=new Uint8Array(W*H);
  for(const zk of ZK){
    const cfg=WATERCFG[zk];if(!cfg||!cfg.f)continue;
    const idx=[],val=[];
    for(let y=0;y<H;y++)for(let x=0;x<W;x++){
      const i=y*W+x;if(ZK[REG[i]]!==zk)continue;
      let n=.65*vnoise(x,y,cfg.sc,53)+.35*vnoise(x,y,cfg.sc*.5,59);
      if(cfg.mode==='river')n=-Math.abs(n-.5);
      idx.push(i);val.push(n);
    }
    const sorted=val.slice().sort((a,b)=>a-b);
    const thr=sorted[Math.floor(sorted.length*(1-cfg.f))];
    for(let k=0;k<idx.length;k++)if(val[k]>=thr)wat[idx[k]]=1;
  }
  return wat;
}
/** Generates the whole world (TILES, REG, DOORS, SIGNS, NPC positions). Deterministic. */
function build(){
  TILES=new Uint8Array(W*H);REG=new Uint8Array(W*H);DOORS={};SIGNS={};
  REG=layoutRegions();
  const wat=waterField();
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
    const i=y*W+x,zk=ZK[REG[i]];
    if(ZN[zk].safe){TILES[i]=TL.ROAD;continue;}
    const g=GEN[zk];let t=TL.G;
    if(wat[i])t=TL.WATER;
    else if(g.lava&&vnoise(x,y,5,41)>g.lava)t=TL.LAVA;
    else if(g.rock&&vnoise(x,y,3.5,29)>g.rock&&hash2(x,y,5)>.45)t=TL.ROCK;
    else if(g.tree&&vnoise(x,y,3.5,23)>g.tree&&hash2(x,y,7)>.4)t=TL.TREE;
    else if(vnoise(x,y,4.5,11)>g.tall&&hash2(x,y,9)>.12)t=TL.TALL;
    TILES[i]=t;
  }
  const bld=(T,ox,oy,kind)=>{
    for(let by=0;by<3;by++)for(let bx=0;bx<4;bx++)TILES[(T.y0+oy+by)*W+T.x0+ox+bx]=TL.BWALL;
    const dx=T.x0+ox+1,dy=T.y0+oy+2;TILES[dy*W+dx]=TL.DOOR;DOORS[dx+','+dy]=T.id+':'+kind;
  };
  for(const T of TOWNS){
    const x1=T.x0+T.w-1,y1=T.y0+T.h-1;
    for(let x=T.x0;x<=x1;x++){TILES[T.y0*W+x]=TL.FENCE;TILES[y1*W+x]=TL.FENCE;}
    for(let y=T.y0;y<=y1;y++){TILES[y*W+T.x0]=TL.FENCE;TILES[y*W+x1]=TL.FENCE;}
    for(const [gx,gy] of [[T.x0,T.y0+5],[x1,T.y0+5],[T.x0+6,T.y0],[T.x0+6,y1]])TILES[gy*W+gx]=TL.ROAD;
    /* Keep the ground outside every gate walkable, whatever the zone around the town grew there. */
    for(const [ox,oy,dx,dy] of [[T.x0,T.y0+5,-1,0],[x1,T.y0+5,1,0],[T.x0+6,T.y0,0,-1],[T.x0+6,y1,0,1]])
      for(let k=1;k<=2;k++){const gx=ox+dx*k,gy=oy+dy*k;if(inb(gx,gy)&&BLK[TILES[gy*W+gx]])TILES[gy*W+gx]=TILES[gy*W+gx]===TL.WATER?TL.BRIDGE:TL.G;}
    bld(T,2,1,'healer');bld(T,7,1,'shop');bld(T,6,5,'hall');if(T.cottage)bld(T,2,5,'cottage');
    /* The sign and work table stand in the south fence either side of the gate, so they never block a walkway. */
    TILES[y1*W+T.x0+5]=TL.SIGN;SIGNS[(T.x0+5)+','+y1]=T.id;
    TILES[y1*W+T.x0+7]=TL.BENCH;
  }
  const carve=(x,y)=>{
    const i=y*W+x,t=TILES[i];
    if(t===TL.WATER)TILES[i]=TL.BRIDGE;
    else if(t===TL.FENCE||t===TL.BWALL||t===TL.DOOR||t===TL.SIGN)return;
    else TILES[i]=TL.ROAD;
  };
  const road=pts=>{
    for(let k=0;k<pts.length-1;k++){
      let [x,y]=pts[k];const [tx,ty]=pts[k+1];carve(x,y);
      while(x!==tx||y!==ty){if(x!==tx)x+=Math.sign(tx-x);else y+=Math.sign(ty-y);carve(x,y);}
    }
  };
  const sh=p=>p.map(q=>[q[0]+OX,q[1]+OY]);
  road(sh([[86,87],[131,87],[131,97]]));
  road(sh([[80,81],[80,28]]));
  for(const L of LAIRS){
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)TILES[(L.y+dy)*W+L.x+dx]=TL.G;
    TILES[L.y*W+L.x]=TL.LAIR;
  }
  for(const h of SHRINES){
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)TILES[(h.y+dy)*W+h.x+dx]=TL.G;
    TILES[h.y*W+h.x]=TL.SHRINE;
  }
  connectAll();
  placeNPCs();
  computeLabels();
}
/* True when a quest-giver standing here (alongside those already placed) would wall anyone off from a lair, an altar, or a chunk of land. */
/** Counts land tiles reachable from (bx,by); used to test whether blocking a tile cuts the map. */
function floodCount(bx,by){
  const seen=new Uint8Array(W*H),q=[START[1]*W+START[0]];seen[q[0]]=1;
  for(let h=0;h<q.length;h++){
    const i=q[h],cx=i%W,cy=(i/W)|0;
    for(const [dx,dy] of D4){
      const nx=cx+dx,ny=cy+dy;if(!inb(nx,ny))continue;const j=ny*W+nx;
      if(seen[j]||BLK[TILES[j]]||NPCAT[nx+','+ny]||(nx===bx&&ny===by))continue;seen[j]=1;q.push(j);
    }
  }
  return {seen,n:q.length};
}
/** True when placing an NPC at (x,y) would cut off more than 2 tiles of land or a lair/altar, relative to `base`. */
function blocksWay(x,y,base){
  const r=floodCount(x,y);
  if(base-r.n>2)return true;
  const near=(px,py)=>D4.some(([dx,dy])=>r.seen[(py+dy)*W+px+dx]);
  return LAIRS.some(L=>!near(L.x,L.y))||SHRINES.some(h=>!near(h.x,h.y));
}
/* Quest givers stand in towns at fixed spots, or on the nearest open ground in their zone. */
/** Places quest-giver NPCs near their anchors without blocking any route. */
function placeNPCs(){
  NPCPOS={};NPCAT={};
  const reach=reachFrom(START[0],START[1]);
  for(const id in NPCS){
    const n=NPCS[id];if(!n.at)continue;
    let pos=null;
    if(n.at.town){const T=TOWNS.find(t=>t.id===n.at.town);pos=[T.x0+n.at.dx,T.y0+n.at.dy];}
    else{
      const baseN=floodCount(-1,-1).n;
      const open=(x,y)=>inb(x,y)&&reach[y*W+x]&&!BLK[TILES[y*W+x]]&&TILES[y*W+x]!==TL.LAIR;
      search:for(let r=0;r<40;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
        if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
        const x=n.at.x+dx,y=n.at.y+dy;
        if(!open(x,y)||zoneKeyAt(x,y)!==n.at.wild||NPCAT[x+','+y])continue;
        let free=0;for(const [ax,ay] of D4)if(open(x+ax,y+ay))free++;
        if(free<3||blocksWay(x,y,baseN))continue;
        pos=[x,y];break search;
      }
      if(pos&&TILES[pos[1]*W+pos[0]]===TL.TALL)TILES[pos[1]*W+pos[0]]=TL.G;
    }
    if(pos){NPCPOS[id]=pos;NPCAT[pos[0]+','+pos[1]]=id;}
  }
}
/** Flood fill of walkable tiles from (sx,sy); returns a visited set. */
function reachFrom(sx,sy){
  const seen=new Uint8Array(W*H),q=[sy*W+sx];seen[q[0]]=1;
  for(let h=0;h<q.length;h++){
    const i=q[h],x=i%W,y=(i/W)|0;
    for(const [dx,dy] of D4){const nx=x+dx,ny=y+dy;if(!inb(nx,ny))continue;const j=ny*W+nx;if(seen[j]||BLK[TILES[j]])continue;seen[j]=1;q.push(j);}
  }
  return seen;
}
/* A walled-off pocket may stay as an island only if nothing essential is on it, water is most of its
   shoreline, and that water touches the mainland so a boat can launch from there. */
/** True when a connected component is separated from the mainland and is not allowed to be cut off. */
function isIsland(comp,seen){
  let water=0,other=0;const wset=[];
  for(const i of comp){
    const x=i%W,y=(i/W)|0;
    if(inTown(x,y))return false;
    for(const [dx,dy] of D4){
      const nx=x+dx,ny=y+dy;if(!inb(nx,ny))continue;
      const j=ny*W+nx,t=TILES[j];
      if(t===TL.LAIR||t===TL.SHRINE)return false;
      if(BLK[t]){if(t===TL.WATER){water++;wset.push(j);}else other++;}
    }
  }
  if(water<2||water<.6*(water+other))return false;
  const vis=new Uint8Array(W*H),q=[];
  for(const j of wset)if(!vis[j]){vis[j]=1;q.push(j);}
  for(let h=0;h<q.length;h++){
    const i=q[h],x=i%W,y=(i/W)|0;
    for(const [dx,dy] of D4){
      const nx=x+dx,ny=y+dy;if(!inb(nx,ny))continue;
      const j=ny*W+nx;
      if(seen[j]&&!BLK[TILES[j]])return true;
      if(!vis[j]&&TILES[j]===TL.WATER){vis[j]=1;q.push(j);}
    }
  }
  return false;
}
/* Cut a path from any walled-off pocket to the main land, except pockets that qualify as islands. */
/** Carves bridges and paths so every important place is reachable from the start; deliberately leaves some islands. */
function connectAll(){
  let seen=reachFrom(START[0],START[1]);
  const judged=new Uint8Array(W*H);
  for(let s=0;s<W*H;s++){
    if(seen[s]||judged[s]||BLK[TILES[s]])continue;
    const comp=[s],mark=new Uint8Array(W*H);mark[s]=1;
    for(let h=0;h<comp.length;h++){
      const i=comp[h],x=i%W,y=(i/W)|0;
      for(const [dx,dy] of D4){const nx=x+dx,ny=y+dy;if(!inb(nx,ny))continue;const j=ny*W+nx;if(mark[j]||BLK[TILES[j]])continue;mark[j]=1;comp.push(j);}
    }
    if(isIsland(comp,seen)){for(const i of comp)judged[i]=1;continue;}
    const par=new Int32Array(W*H).fill(-2),q=[s];par[s]=-1;let end=-1;
    for(let h=0;h<q.length&&end<0;h++){
      const i=q[h],x=i%W,y=(i/W)|0;
      for(const [dx,dy] of D4){
        const nx=x+dx,ny=y+dy;if(!inb(nx,ny))continue;const j=ny*W+nx;
        if(par[j]!==-2)continue;
        const t=TILES[j];if(t===TL.FENCE||t===TL.BWALL||t===TL.SIGN||t===TL.LAIR||t===TL.SHRINE||t===TL.BENCH)continue;
        par[j]=i;
        if(seen[j]){end=j;break;}
        q.push(j);
      }
    }
    for(let i=end;i>=0;i=par[i]){const t=TILES[i];if(BLK[t]){TILES[i]=t===TL.WATER?TL.BRIDGE:TL.G;}}
    seen=reachFrom(START[0],START[1]);
  }
}
const roomKind=id=>id.split(':')[1];
const roomCh=(id,x,y)=>{const r=ROOMS[roomKind(id)];return r&&r[y]?r[y][x]:undefined;};
const roomBlocked=ch=>'#SHTBCN'.includes(ch);
/** Map position of the door that leads into interior `id`. */
function doorPos(id){for(const k in DOORS)if(DOORS[k]===id){const [x,y]=k.split(',').map(Number);return[x,y];}return[START[0],START[1]];}
