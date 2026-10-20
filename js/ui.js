/**
 * ui.js — rendering, panels, input and start-up
 *
 * Load order: 9th (last). Canvas drawing for the local map and world map,
 * every panel's HTML, the control dock, keyboard/click handling and the
 * bootstrap code at the bottom of the file that starts the game.
 *
 * All files are classic scripts sharing one global scope (no modules); see README.
 */
'use strict';
const $=s=>document.querySelector(s);
if(typeof CanvasRenderingContext2D!=='undefined'&&CanvasRenderingContext2D&&!CanvasRenderingContext2D.prototype.roundRect)CanvasRenderingContext2D.prototype.roundRect=function(x,y,w,h){this.rect(x,y,w,h);};
const UI={sel:0,rel:null,newConfirm:false,lockUntil:0,lockT:null,noRepeat:false,tonic:false,ftab:'ring',gmode:null,gpot:null};
const chip=(t,c)=>`<span class="chip" style="--c:${c}"><i></i>${t}</span>`;
const tchip=t=>`<span class="tc" style="--c:${TYPE[t][0]};--ci:${TYPE[t][1]}">${t}</span>`;
const abadge=c=>c.alpha?'<span class="ab">Alpha</span>':'';
const kl=k=>k===' '?'Space':k==='Escape'?'Esc':k.length===1?k.toUpperCase():k;
const btn=(k,label,cls)=>`<button class="b ${cls||''}" data-k="${k}"><kbd>${kl(k)}</kbd> ${label}</button>`;
const btnSub=(k,label,sub,cls,dis)=>`<button class="b ${cls||''}" data-k="${k}" ${dis?'disabled':''}><kbd>${kl(k)}</kbd> ${label}${sub?`<span class="sub">${sub}</span>`:''}</button>`;
const bar=(p,cls)=>`<div class="bar ${cls||''}"><i style="width:${clamp(p,0,1)*100}%"></i></div>`;
const rng=r=>r[0]===r[1]?`${r[0]}`:`${r[0]}–${r[1]}`;

/* Ignore all input for a moment so keys still in your fingers cannot trigger battle commands. */
/** Ignores input for `ms` milliseconds (prevents accidental key repeats). */
function setLock(ms){
  UI.lockUntil=now()+ms;
  const d=$('#dock');if(d&&d.classList)d.classList.add('locked');
  clearTimeout(UI.lockT);
  UI.lockT=setTimeout(()=>{const d2=$('#dock');if(d2&&d2.classList)d2.classList.remove('locked');},ms);
}

/* ---------- palette ---------- */
/** True when the page is using the dark theme. */
function isDark(){const a=document.documentElement.getAttribute('data-theme');return a==='dark'||(a!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);}
const PAL={
 light:{z:{green:['#BFD8A0','#76A04E'],wood:['#9CC092','#4C8250'],crag:['#CDC3B6','#938676'],mire:['#9DB8A6','#5C8472'],frost:['#E1EBF1','#A5BFCF'],cinder:['#D2AB93','#97614A'],drake:['#B5AEC6','#7468A0'],dunes:['#E6D3A0','#C4A55F'],gloam:['#8EA08A','#4E6650'],shore:['#E8DDB0','#C9B46E'],mangrove:['#8FB08A','#4F7F55'],bonefield:['#E4E0D6','#B8B2A0'],mesa:['#D9A98A','#B27250'],mistvale:['#B9CBD6','#7C9AAD'],obsidian:['#9A96A6','#5E5A70'],deepwood:['#6F9A6C','#2F5A3A'],tors:['#C7C3CC','#8E8A99'],witchfen:['#A8A0C8','#6D5F9E'],glacier:['#E6F2F8','#B9D8EA'],starfall:['#E8D9F0','#B896D0'],worldscar:['#6E5E58','#8A4A36']},
  road:['#CDBFA0','#A99B7A'],water:['#86B6CE','#4F86A6'],tree:'#2F6137',trunk:'#5A4330',rock:'#7C7C78',rockHi:'#A5A59F',bwall:'#8E7158',roof:'#6B4F3B',door:'#3F2D20',
  lava:['#E27A45','#A63A14'],bridge:'#9A7B52',void:'#C5CDC6',wall:'#566159',wallHi:'#7B877F',floor:'#D5C5A0',floorFg:'#BAA67C',furn:'#8B6B4A',furnDk:'#6A4F35',
  bed:'#B8573F',fire:'#E6843A',cnt:'#9A7A56',ink:'#15211E',pl:'#17695F',plInk:'#FFFFFF',npc:'#8A5A14',npcInk:'#FFFFFF'},
 dark:{z:{green:['#2A3F26','#46663A'],wood:['#1F3322','#35573A'],crag:['#3B3731','#5A5348'],mire:['#25362E','#3F5E50'],frost:['#31404A','#52697A'],cinder:['#40291F','#6A4030'],drake:['#2D2840','#4A4270'],dunes:['#4A4030','#6E5E3E'],gloam:['#1D2A22','#2F4538'],shore:['#4F4630','#7A6A40'],mangrove:['#1F3324','#355A3C'],bonefield:['#4A4842','#726E62'],mesa:['#44281E','#6E4430'],mistvale:['#26323A','#42586A'],obsidian:['#1F1D28','#3A3650'],deepwood:['#12241A','#1F3D29'],tors:['#34323C','#5A5668'],witchfen:['#272238','#463C6E'],glacier:['#2E4250','#547A90'],starfall:['#352A44','#5C4A78'],worldscar:['#241816','#4E2A20']},
  road:['#4A4334','#6A6048'],water:['#1E4660','#2F6A8C'],tree:'#1B4A27',trunk:'#4A3828',rock:'#5A5A56',rockHi:'#7A7A74',bwall:'#5C4837',roof:'#3E2E22',door:'#1C130C',
  lava:['#A8441C','#E0692F'],bridge:'#6B5535',void:'#0A100E',wall:'#3A443F',wallHi:'#56635C',floor:'#3D3629',floorFg:'#4E4534',furn:'#6A5039',furnDk:'#4A3828',
  bed:'#8E3F2E',fire:'#E6843A',cnt:'#6F5639',ink:'#E3EBE6',pl:'#4FC0AE',plInk:'#04211C',npc:'#D9A04A',npcInk:'#2A1D00'}};
const pal=()=>isDark()?PAL.dark:PAL.light;

/* ---------- map drawing ---------- */
/** Draws one overworld tile. */
function drawTile(c,sx,sy,ts,t,zk,wx,wy,P){
  const z=P.z[zk]||P.road,u=ts/10;
  const bg=(t===TL.ROAD||t===TL.FENCE||t===TL.DOOR||t===TL.SIGN)?P.road[0]:(t===TL.WATER||t===TL.BRIDGE)?P.water[0]:t===TL.LAVA?P.lava[0]:z[0];
  c.fillStyle=bg;c.fillRect(sx,sy,ts,ts);
  c.lineWidth=Math.max(1.5,u*.55);c.lineCap='round';
  switch(t){
    case TL.G:if(hash2(wx,wy,3)>.7){c.fillStyle=z[1];c.fillRect(sx+u*(2+hash2(wx,wy,4)*5),sy+u*(2+hash2(wx,wy,5)*6),u*1.2,u*1.2);}break;
    case TL.TALL:c.strokeStyle=z[1];c.beginPath();for(let k=0;k<4;k++){const bx=sx+u*(1.5+k*2.3);c.moveTo(bx,sy+u*9);c.lineTo(bx+(k%2?u*.9:-u*.9),sy+u*(3.2+(k%3)*.9));}c.stroke();break;
    case TL.TREE:
      c.fillStyle=P.trunk;c.fillRect(sx+u*4.4,sy+u*6.5,u*1.2,u*2.8);
      c.fillStyle=P.tree;c.beginPath();c.moveTo(sx+u*5,sy+u*.8);c.lineTo(sx+u*8.6,sy+u*7);c.lineTo(sx+u*1.4,sy+u*7);c.closePath();c.fill();
      if(zk==='frost'){c.fillStyle='#E8F1F6';c.beginPath();c.moveTo(sx+u*5,sy+u*.8);c.lineTo(sx+u*6.7,sy+u*3.6);c.lineTo(sx+u*3.3,sy+u*3.6);c.closePath();c.fill();}
      break;
    case TL.ROCK:
      c.fillStyle=P.rock;c.beginPath();c.moveTo(sx+u*1.5,sy+u*8.5);c.lineTo(sx+u*2.5,sy+u*4);c.lineTo(sx+u*5,sy+u*2);c.lineTo(sx+u*8,sy+u*4.5);c.lineTo(sx+u*8.8,sy+u*8.5);c.closePath();c.fill();
      c.fillStyle=P.rockHi;c.beginPath();c.moveTo(sx+u*2.5,sy+u*4);c.lineTo(sx+u*5,sy+u*2);c.lineTo(sx+u*5.5,sy+u*5);c.closePath();c.fill();break;
    case TL.WATER:case TL.LAVA:{
      c.strokeStyle=t===TL.WATER?P.water[1]:P.lava[1];
      for(let k=0;k<2;k++){const y=sy+u*(3.5+k*3.5);c.beginPath();c.moveTo(sx+u*1.5,y);c.quadraticCurveTo(sx+u*3.2,y-u*1.4,sx+u*5,y);c.quadraticCurveTo(sx+u*6.8,y+u*1.4,sx+u*8.5,y);c.stroke();}
      break;}
    case TL.ROAD:if(hash2(wx,wy,6)>.6){c.fillStyle=P.road[1];c.fillRect(sx+u*(2+hash2(wx,wy,8)*5),sy+u*(2+hash2(wx,wy,2)*6),u*1.1,u*1.1);}break;
    case TL.BRIDGE:
      c.fillStyle=P.bridge;c.fillRect(sx,sy+u*1.2,ts,u*7.6);c.strokeStyle=P.trunk;c.beginPath();
      for(let k=1;k<4;k++){c.moveTo(sx+u*k*2.5,sy+u*1.2);c.lineTo(sx+u*k*2.5,sy+u*8.8);}c.stroke();break;
    case TL.FENCE:
      c.fillStyle=P.trunk;c.fillRect(sx+u,sy+u*2,u*1.4,u*7);c.fillRect(sx+u*7.6,sy+u*2,u*1.4,u*7);c.fillRect(sx,sy+u*3.5,ts,u*1.1);c.fillRect(sx,sy+u*6,ts,u*1.1);break;
    case TL.BWALL:c.fillStyle=P.bwall;c.fillRect(sx,sy,ts,ts);c.fillStyle=P.roof;c.fillRect(sx,sy,ts,u*1.4);c.fillRect(sx,sy+u*5,ts,u*.5);break;
    case TL.DOOR:
      c.fillStyle=P.bwall;c.fillRect(sx,sy,ts,ts);c.fillStyle=P.door;c.fillRect(sx+u*2.2,sy+u*1.5,u*5.6,u*8.5);c.fillStyle=P.fire;c.fillRect(sx+u*6.3,sy+u*5.6,u*.9,u*.9);break;
    case TL.SIGN:c.fillStyle=P.trunk;c.fillRect(sx+u*4.5,sy+u*4,u,u*5.5);c.fillStyle=P.cnt;c.fillRect(sx+u*1.8,sy+u*1.8,u*6.4,u*3.6);break;
    case TL.SHRINE:
      c.fillStyle=P.rock;c.fillRect(sx+u*1.6,sy+u*5.4,u*6.8,u*3.4);c.fillStyle=P.rockHi;c.fillRect(sx+u*2.4,sy+u*2,u*1.6,u*4);c.fillRect(sx+u*6,sy+u*2.6,u*1.6,u*3.4);
      c.fillStyle='#E3B24F';c.beginPath();c.arc(sx+u*5,sy+u*6.4,u*1,0,7);c.fill();break;
    case TL.BENCH:
      c.fillStyle=P.furn;c.fillRect(sx+u*.8,sy+u*5.2,u*8.4,u*1.4);
      c.fillStyle=P.furnDk;c.fillRect(sx+u*1.4,sy+u*6.6,u,u*2.8);c.fillRect(sx+u*7.6,sy+u*6.6,u,u*2.8);
      c.fillStyle=P.rock;c.fillRect(sx+u*1.6,sy+u*3.6,u*3.4,u*1.6);c.fillRect(sx+u*2.4,sy+u*2.8,u*2,u*.9);
      c.fillStyle=P.bed;c.beginPath();c.arc(sx+u*7,sy+u*4.2,u*1,0,7);c.fill();c.fillStyle=P.fire;c.fillRect(sx+u*6.7,sy+u*2.6,u*.6,u*.9);break;
    case TL.LAIR:
      c.fillStyle=P.door;c.beginPath();c.ellipse(sx+u*5,sy+u*5.5,u*4,u*3.4,0,0,7);c.fill();
      c.strokeStyle='#D6402F';c.beginPath();c.ellipse(sx+u*5,sy+u*5.5,u*4,u*3.4,0,0,7);c.stroke();break;
  }
}
/** Draws one interior tile. */
function drawRoomTile(c,sx,sy,ts,ch,P,x,y){
  const u=ts/10;
  if(ch==='#'){c.fillStyle=P.wall;c.fillRect(sx,sy,ts,ts);c.fillStyle=P.wallHi;c.fillRect(sx,sy,ts,u*.8);return;}
  c.fillStyle=P.floor;c.fillRect(sx,sy,ts,ts);c.fillStyle=P.floorFg;c.fillRect(sx,sy+u*9.3,ts,u*.7);
  switch(ch){
    case'S':c.fillStyle=P.furnDk;c.fillRect(sx+u*.5,sy+u,u*9,u*8);c.fillStyle=P.furn;for(let k=0;k<3;k++)c.fillRect(sx+u,sy+u*(2+k*2.4),u*8,u*.8);break;
    case'H':c.fillStyle=P.wall;c.fillRect(sx+u*.5,sy+u*.5,u*9,u*9);c.fillStyle=P.door;c.fillRect(sx+u*2,sy+u*3,u*6,u*6);c.fillStyle=P.fire;c.beginPath();c.moveTo(sx+u*5,sy+u*3.8);c.lineTo(sx+u*7,sy+u*8.5);c.lineTo(sx+u*3,sy+u*8.5);c.closePath();c.fill();break;
    case'T':c.fillStyle=P.furn;c.fillRect(sx+u,sy+u*2.5,u*8,u*5);c.fillStyle=P.furnDk;c.fillRect(sx+u*1.5,sy+u*7.5,u,u*1.5);c.fillRect(sx+u*7.5,sy+u*7.5,u,u*1.5);break;
    case'B':c.fillStyle=P.furnDk;c.fillRect(sx+u,sy+u,u*8,u*8);c.fillStyle=P.bed;c.fillRect(sx+u*1.6,sy+u*3.6,u*6.8,u*5);c.fillStyle='#EEE5D2';c.fillRect(sx+u*1.8,sy+u*1.6,u*6.4,u*1.9);break;
    case'C':c.fillStyle=P.cnt;c.fillRect(sx,sy+u*2,ts,u*7);c.fillStyle=P.furnDk;c.fillRect(sx,sy+u*2,ts,u*.9);break;
    case'R':c.globalAlpha=.4;c.fillStyle=P.bed;c.fillRect(sx+u,sy+u,u*8,u*8);c.globalAlpha=1;break;
    case'D':c.fillStyle=P.door;c.fillRect(sx+u*1.5,sy+u*3,u*7,u*7);break;
  }
}
/** Sizes a canvas to its CSS size and device pixel ratio. */
function fitCanvas(cv){
  const r=cv.getBoundingClientRect(),dpr=Math.min(window.devicePixelRatio||1,2),w=Math.max(20,Math.round(r.width*dpr/COLS))*COLS;
  if(cv.width!==w){cv.width=w;cv.height=w/COLS*ROWS;}
}
/** Draws a filled circle with a glyph (creatures, NPCs). */
function disc(c,x,y,r,fill,ink,glyph,ts){
  c.fillStyle=fill;c.beginPath();c.arc(x,y,r,0,7);c.fill();
  c.fillStyle=ink;c.font=`700 ${Math.floor(ts*.5)}px "IBM Plex Mono",ui-monospace,monospace`;c.fillText(glyph,x,y+ts*.03);
}
/** Draws a wandering creature. */
function drawEnt(c,e,sx,sy,ts,P){
  const sp=SP[e.sp],tc=TYPE[sp.t],u=ts/10,dg=danger(e.lvl,S.lvl);
  c.fillStyle=tc[0];c.beginPath();c.roundRect(sx+u*1,sy+u*1,u*8,u*8,u*2);c.fill();
  c.lineWidth=Math.max(2,u*.7);c.strokeStyle=sp.tp===2?'#D6402F':sp.tp===1?'#D9A82B':'#7AA6C2';c.stroke();
  c.fillStyle=tc[1];c.font=`700 ${Math.floor(ts*.5)}px "IBM Plex Mono",ui-monospace,monospace`;c.fillText(sp.g,sx+ts*.5,sy+ts*.55);
  const lab=dg.k==='deadly'?'??':String(e.lvl),bw=ts*(lab.length>1?.5:.38),bh=ts*.3;
  c.fillStyle=dg.c;c.beginPath();c.roundRect(sx+ts-bw-u*.2,sy,bw,bh,u*.8);c.fill();
  c.fillStyle=dg.k==='even'?'#1a1500':'#FFFFFF';c.font=`700 ${Math.floor(ts*.24)}px "IBM Plex Mono",ui-monospace,monospace`;c.fillText(lab,sx+ts-bw/2-u*.2,sy+bh*.55);
}
/** Draws an NPC. */
function drawNpc(c,id,sx,sy,ts,P){
  disc(c,sx+ts/2,sy+ts/2,ts*.38,P.npc,P.npcInk,NPCS[id].g,ts);
  const m=qMark(id);
  if(m){
    c.fillStyle=m==='?'?'#3F9A4A':'#E3B24F';c.beginPath();c.arc(sx+ts*.82,sy+ts*.18,ts*.19,0,7);c.fill();
    c.fillStyle=m==='?'?'#FFFFFF':'#2A1D00';c.font=`700 ${Math.floor(ts*.28)}px "IBM Plex Mono",ui-monospace,monospace`;c.fillText(m,sx+ts*.82,sy+ts*.19);
  }
}
/** The tile/entity the player is facing. */
function facedTarget(){
  const fx=S.pos.x+S.face.x,fy=S.pos.y+S.face.y;
  if(S.pos.room){const ch=roomCh(S.pos.room,fx,fy);return(ch==='N'||ch==='B')?[fx,fy]:null;}
  if(!inb(fx,fy))return null;
  const t=TILES[fy*W+fx];
  return(t===TL.SIGN||t===TL.LAIR||t===TL.SHRINE||t===TL.BENCH||entAt(fx,fy)||npcAt(fx,fy))?[fx,fy]:null;
}
/** Draws the local 15x11 view. */
function drawMap(){
  const cv=$('#map');fitCanvas(cv);
  const c=cv.getContext('2d'),ts=cv.width/COLS,P=pal();
  c.fillStyle=P.void;c.fillRect(0,0,cv.width,cv.height);
  c.textAlign='center';c.textBaseline='middle';
  const px=S.pos.x,py=S.pos.y;let offx=0,offy=0,cx=0,cy=0;
  if(S.pos.room){
    const rows=ROOMS[roomKind(S.pos.room)],rw=rows[0].length,rh=rows.length;
    offx=Math.floor((COLS-rw)/2);offy=Math.floor((ROWS-rh)/2);
    for(let y=0;y<rh;y++)for(let x=0;x<rw;x++){
      const ch=rows[y][x],sx=(offx+x)*ts,sy=(offy+y)*ts;
      drawRoomTile(c,sx,sy,ts,ch,P,x,y);
      if(ch==='N'){
        const rk=roomKind(S.pos.room);
        if(rk==='cottage')drawNpc(c,'marra',sx,sy,ts,P);
        else disc(c,sx+ts/2,sy+ts/2,ts*.38,P.npc,P.npcInk,({healer:'H',shop:'P',hall:'R'})[rk],ts);
      }
    }
  }else{
    cx=clamp(px-7,0,W-COLS);cy=clamp(py-5,0,H-ROWS);offx=-cx;offy=-cy;
    for(let vy=0;vy<ROWS;vy++)for(let vx=0;vx<COLS;vx++){
      const wx=cx+vx,wy=cy+vy,i=wy*W+wx;
      drawTile(c,vx*ts,vy*ts,ts,TILES[i],ZK[REG[i]],wx,wy,P);
    }
    /* Town nameplates hang above each town's sign. */
    for(const k in SIGNS){
      const sp2=k.split(',').map(Number),vx=sp2[0]-cx,vy=sp2[1]-cy;
      if(vx<-4||vx>COLS+4||vy<-2||vy>ROWS)continue;
      const label=ZN[SIGNS[k]].n;
      c.font=`700 ${Math.floor(ts*.3)}px "IBM Plex Mono",ui-monospace,monospace`;
      const w=c.measureText(label).width+ts*.3,h=ts*.46,x0=(vx+.5)*ts,y0=(vy+1.35)*ts;
      c.fillStyle=P.cnt;c.strokeStyle=P.trunk;c.lineWidth=2;c.beginPath();c.roundRect(x0-w/2,y0-h/2,w,h,ts*.08);c.fill();c.stroke();
      c.fillStyle=P.ink;c.fillText(label,x0,y0+ts*.02);
    }
    {const na=nightAmt(S.turn);if(na>0){c.fillStyle=`rgba(24,38,120,${(.24*na).toFixed(3)})`;c.fillRect(0,0,cv.width,cv.height);}}
    for(const id in NPCPOS){const p=NPCPOS[id],vx=p[0]-cx,vy=p[1]-cy;if(vx>=0&&vy>=0&&vx<COLS&&vy<ROWS)drawNpc(c,id,vx*ts,vy*ts,ts,P);}
    for(const e of S.ents){const vx=e.x-cx,vy=e.y-cy;if(vx>=0&&vy>=0&&vx<COLS&&vy<ROWS)drawEnt(c,e,vx*ts,vy*ts,ts,P);}
  }
  const tg=facedTarget();
  if(tg){c.strokeStyle=P.fire;c.lineWidth=Math.max(2,ts*.06);c.setLineDash([ts*.14,ts*.1]);c.strokeRect((offx+tg[0])*ts+2,(offy+tg[1])*ts+2,ts-4,ts-4);c.setLineDash([]);}
  const sx=(offx+px)*ts+ts/2,sy=(offy+py)*ts+ts/2;
  if(S.boating){
    c.fillStyle=P.trunk;c.beginPath();c.ellipse(sx,sy+ts*.2,ts*.46,ts*.24,0,0,7);c.fill();
    c.strokeStyle=P.cnt;c.lineWidth=Math.max(2,ts*.05);c.beginPath();c.ellipse(sx,sy+ts*.2,ts*.46,ts*.24,0,0,7);c.stroke();
  }
  disc(c,sx,sy-(S.boating?ts*.06:0),ts*.38,P.pl,P.plInk,'@',ts);
  c.fillStyle=P.ink;c.beginPath();c.arc(sx+S.face.x*ts*.43,sy+S.face.y*ts*.43,ts*.07,0,7);c.fill();
}
/** Colour of a zone by its danger relative to the player level. */
function zoneDangerColor(zk){const z=ZN[zk];return z.safe?'#2A9D8F':danger(Math.round((z.lv[0]+z.lv[1])/2),S.lvl).c;}
const RGBC={};
const rgbOf=h=>RGBC[h]||(RGBC[h]=hexRGB(h));
/** Colour used for a tile on the world map. */
function tileHex(t,zk,P){
  const z=P.z[zk]||P.road;
  return (t===TL.WATER||t===TL.BRIDGE)?P.water[0]:t===TL.LAVA?P.lava[0]:(t===TL.ROAD||t===TL.FENCE||t===TL.DOOR||t===TL.SIGN||t===TL.BENCH)?P.road[0]:t===TL.BWALL?P.bwall:t===TL.TREE?P.tree:(t===TL.ROCK||t===TL.SHRINE)?P.rock:t===TL.TALL?z[1]:z[0];
}
/* The whole map is painted pixel by pixel into one small image, then scaled up in a single draw. */
/** Draws the full world map with zone colours, explored areas and non-overlapping labels. */
function drawWorldMap(){
  const cv=$('#wmap');if(!cv)return;
  const c=cv.getContext('2d'),P=pal(),k=cv.width/W;
  if(typeof document.createElement==='function'){
    const off=document.createElement('canvas');off.width=W;off.height=H;
    const oc=off.getContext('2d'),img=oc.createImageData(W,H),d=img.data,tint={};
    for(const zk of ZK)tint[zk]=rgbOf(zoneDangerColor(zk));
    const vo=rgbOf(P.void);
    for(let i=0;i<W*H;i++){
      const zk=ZK[REG[i]],seen=S.vis[i],a=seen?.14:.34,tc=tint[zk],bc=seen?rgbOf(tileHex(TILES[i],zk,P)):vo,o=i*4;
      d[o]=bc[0]*(1-a)+tc[0]*a;d[o+1]=bc[1]*(1-a)+tc[1]*a;d[o+2]=bc[2]*(1-a)+tc[2]*a;d[o+3]=255;
    }
    oc.putImageData(img,0,0);
    c.imageSmoothingEnabled=false;c.drawImage(off,0,0,cv.width,cv.height);
  }
  c.textAlign='center';c.textBaseline='middle';c.font='600 11px "IBM Plex Mono",ui-monospace,monospace';c.lineJoin='round';c.lineWidth=3;
  const lab=(t,x,y)=>{c.strokeStyle='rgba(0,0,0,.65)';c.strokeText(t,x*k,y*k);c.fillStyle='#FFFFFF';c.fillText(t,x*k,y*k);};
  /* Town names are fixed; zone names are nudged around them and each other when they would overlap. */
  const placed=TOWNS.map(T=>[T.x0+T.w/2,T.y0-1.5,ZN[T.id].n.length*.84]);
  for(const zk of WILDZ){
    const p=ZLAB[zk];if(!p)continue;const hw=ZN[zk].n.length*.84;
    let bx=p[0],by=p[1];
    search:for(const dy of [0,3.5,-3.5,7,-7,10.5,-10.5])for(const dx of [0,-8,8,-16,16]){
      const xx=p[0]+dx,yy=p[1]+dy;if(yy<2||yy>H-2||xx-hw<0||xx+hw>W)continue;
      if(!placed.some(q=>Math.abs(q[0]-xx)<hw+q[2]&&Math.abs(q[1]-yy)<3.2)){bx=xx;by=yy;break search;}
    }
    placed.push([bx,by,hw]);lab(ZN[zk].n,bx,by);
  }
  for(const T of TOWNS)lab(ZN[T.id].n,T.x0+T.w/2,T.y0-1.5);
  for(const id in NPCPOS){
    const p=NPCPOS[id];if(!S.vis[p[1]*W+p[0]])continue;
    const m=qMark(id),x=(p[0]+.5)*k,y=(p[1]+.5)*k;
    c.fillStyle=m==='?'?'#3F9A4A':m==='!'?'#E3B24F':'rgba(255,255,255,.55)';c.strokeStyle='#000000';c.lineWidth=1.5;
    c.beginPath();c.arc(x,y,m?6:3.5,0,7);c.fill();c.stroke();
    if(m){c.fillStyle=m==='?'?'#FFFFFF':'#2A1D00';c.font='700 10px "IBM Plex Mono",ui-monospace,monospace';c.fillText(m,x,y+.5);}
  }
  for(const h of SHRINES){
    const st=S.shrines[h.id];if(!(st&&st.known)||st.done)continue;
    const x=(h.x+.5)*k,y=(h.y+.5)*k;
    c.fillStyle='#D9A82B';c.strokeStyle='#000000';c.lineWidth=1.5;c.beginPath();c.moveTo(x,y-7);c.lineTo(x+6,y);c.lineTo(x,y+7);c.lineTo(x-6,y);c.closePath();c.fill();c.stroke();
  }
  if(!S.pos.room){
    const x=(S.pos.x+.5)*k,y=(S.pos.y+.5)*k;
    c.fillStyle=P.pl;c.strokeStyle='#FFFFFF';c.lineWidth=3;c.beginPath();c.arc(x,y,7,0,7);c.fill();c.stroke();
  }
}

/* ---------- HUD and log ---------- */
/** Text describing the current location. */
function where(){
  const safe=chip('Safe haven','#2A9D8F');
  if(S.pos.room){const tid=S.pos.room.split(':')[0];return{name:`${ZN[tid].n} · ${ROOMNAME[roomKind(S.pos.room)]}`,chip:safe};}
  const zk=zoneKeyAt(S.pos.x,S.pos.y),z=ZN[zk];
  if(z.safe)return{name:z.n,chip:safe};
  const dg=danger(Math.round((z.lv[0]+z.lv[1])/2),S.lvl);
  return{name:`${z.n} · Lv ${z.lv[0]}–${z.lv[1]}${S.boating?' · afloat':''}`,chip:chip(dg.n,dg.c)};
}
/** Updates the HUD (level, HP, XP, gold, zone, time). */
function updHUD(){
  const hud=$('#hud');hud.hidden=!S;if(!S)return;
  const m=pMax(S.lvl),nd=needP(S.lvl),w=where();
  $('#hl').textContent=S.lvl;$('#hhp').textContent=`${S.hp}/${m}`;$('#hhpb').style.width=(S.hp/m*100)+'%';
  $('#hxp').textContent=`${S.xp}/${nd}`;$('#hxpb').style.width=(S.xp/nd*100)+'%';
  $('#hg').textContent=S.gold;$('#hz').textContent=w.name;$('#hd').innerHTML=w.chip;
  $('#hday').textContent=`${isNight()?'Night':'Daytime'} · Rank ${RANKS[S.rank].k}`;
}
/* DOM writes happen only when the markup actually changed. */
/** Sets innerHTML only if it changed (avoids flicker and lost focus). */
function setHTML(el,h){if(el._h!==h){el.innerHTML=h;el._h=h;return true;}return false;}
/** Renders the message log. */
function renderLog(){
  const el=$('#log');
  if(setHTML(el,LOG.slice(-40).map(l=>`<p class="${l.k}">${l.t}</p>`).join('')))el.scrollTop=el.scrollHeight;
}

/* ---------- battle estimates ---------- */
/** Damage estimate for a companion move. */
function estMove(c,f,mv){
  const P=mv.p*(c.alpha?ALPHA_PWR:1);
  return dmgRange(c.lvl,P,cs(c).atk,f.def,tmult(mv.t,SP[f.sp].t)*bondMult()*rageC(c));
}
const estStrike=f=>dmgRange(S.lvl,35,pAtk(S.lvl),f.def,(1+fx('strike'))*(S.rage>0?1.3:1));

/* ---------- healing targets (shared by the pack and the battle Heal menu) ---------- */
/** Row state for a healing item on a party slot. */
function healState(item,slot){
  if(item==='salve'){
    if(S.items.salve<1)return'none left';
    if(slot==='you')return S.hp>=pMax(S.lvl)?'full health':'';
    const c=party()[slot];if(!c)return'no companion';
    if(c.hp<=0)return'fainted';
    return c.hp>=cmax(c)?'full health':'';
  }
  const c=party()[slot];
  if(S.items.tonic<1)return'none left';
  if(!c||c.hp>0)return'not fainted';
  return'';
}
/** Party rows for the healing picker. */
function healRowsHTML(){
  const ps=party(),mx=pMax(S.lvl);
  const row=(tok,key,label,reason)=>`<button class="b" data-k="${tok}" ${reason?'disabled':''}><kbd>${key}</kbd> ${label}${reason?`<span class="sub">${reason}</span>`:''}</button>`;
  let h=`<h3>Herbal salves ×${S.items.salve}</h3><div class="cmds">`;
  h+=row('@sY','1',`Salve on you (${S.hp}/${mx} HP)`,healState('salve','you'));
  ps.forEach((c,i)=>{h+=row('@s'+i,String(i+2),`Salve on ${nm(c)} (${c.hp}/${cmax(c)} HP)`,healState('salve',i));});
  h+='</div>';
  const fainted=ps.map((c,i)=>[c,i]).filter(p=>p[0].hp<=0);
  h+=`<h3>Revive tonics ×${S.items.tonic}${UI.tonic?' · now press the companion number':''}</h3><div class="cmds">`;
  if(!fainted.length)h+=`<button class="b" disabled><kbd>T</kbd> Revive tonic<span class="sub">nobody has fainted</span></button>`;
  else for(const p of fainted)h+=row('@t'+p[1],'T'+(p[1]+2),`Revive ${nm(p[0])} (${p[0].hp}/${cmax(p[0])} HP)`,healState('tonic',p[1]));
  h+='</div>';
  return h;
}
/** Maps a key to a healing target token. */
function healKeyToTok(k){
  if(UI.tonic)return /^[2-5]$/.test(k)?'@t'+(+k-2):null;
  if(k==='1')return'@sY';
  if(/^[2-5]$/.test(k))return'@s'+(+k-2);
  return null;
}
/** Applies healing to the target token. */
function healTok(tok){
  if(tok==='@sY')return{item:'salve',slot:'you'};
  const m=/^@([st])(\d)$/.exec(tok);
  return m?{item:m[1]==='s'?'salve':'tonic',slot:+m[2]}:null;
}

/* ---------- panels ---------- */
/** Title screen. */
function titleHTML(){
  return `<div class="title"><div class="big">Beastmarch</div>
  <p>You wake in a land where magic has nearly run dry, but the old beasts still walk it: kitsune in the moors, griffins on the crags, drakes beyond the frozen ridge, and kelpies in the cold lakes. Wound them, bind them, and grow strong enough to cross the wild.</p>
  <p class="hint">Every land has a level range. Wander into one that is too strong for you and you can die.</p>
  <div class="row">${hasSave()?btn('c','Continue','pri'):''}${btn('n','New life',hasSave()?'':'pri')}${btn('h','Hardcore life','danger')}</div>
  <p class="hint">Hardcore: dying deletes your save. Standard: you wake at your last bed and lose a quarter of your gold.</p></div>`;
}
/** Knocked-out screen. */
function deadHTML(){
  return `<div class="title"><h2>You died</h2><p>${S.dead.cause}</p>
  <p class="mono">Level ${S.lvl} · ${S.kills} beasts defeated · ${S.cr.length} companions bound · day ${day()}</p>
  <div class="row">${S.hard?'<p class="hint">Hardcore: your save is gone.</p>':btn('r','Wake at your last resting place','pri')}${btn('n','Start a new life',S.hard?'pri':'')}</div></div>`;
}
/** Battle screen. */
function battleHTML(){
  const B=S.battle,f=B.foe,sp=SP[f.sp],tc=TYPE[sp.t],dg=danger(f.lvl,S.lvl),c=lead(),m=pMax(S.lvl);
  let co='';
  if(c){co=`<div class="unit">${artHTML(c.sp,72,'port')}<div><div class="nm">${nm(c)} <span class="dim">Lv ${c.lvl}</span> ${tchip(SP[c.sp].t)} ${abadge(c)}</div><div class="lab"><span>HP</span><span>${c.hp}/${cmax(c)}</span></div>${bar(c.hp/cmax(c))}</div></div>`;}
  else co=`<p class="hint">You have no companion able to fight. Strike, guard, or run.</p>`;
  return `<div class="bt">
   <div class="unit foe">${artHTML(f.sp,108,'port')}
    <div><div class="nm">${foeName(f)} ${tchip(sp.t)}</div><div style="margin:3px 0 5px">${chip('Lv '+f.lvl+' · '+dg.n,dg.c)} ${chip(RAR[sp.rar].n,RAR[sp.rar].c)}</div>
    <div class="lab"><span>HP</span><span>${f.hp}/${f.max}</span></div>${bar(f.hp/f.max)}</div></div>
   <div class="scene" aria-live="polite">${LOG.slice(-4).map(l=>`<p>${l.t}</p>`).join('')}</div>
   <div class="unit you"><div class="sigil">@</div><div><div class="nm">You <span class="dim">Lv ${S.lvl}</span></div><div class="lab"><span>HP</span><span>${S.hp}/${m}</span></div>${bar(S.hp/m)}</div></div>
   ${co}</div>`;
}
/** Pack panel. */
function packHTML(){
  const keys=Object.keys(IT).filter(k=>k!=='boat'||S.items.boat>0);
  return `<h2>Pack</h2><p class="gold mono">${S.gold} gold</p>
  <div class="list">${keys.map(k=>`<div class="item"><div class="grow"><b>${IT[k].n}</b> ${k==='boat'?'<span class="mono">owned</span>':`<span class="mono">×${S.items[k]}</span>`}<div class="hint">${IT[k].d}</div></div></div>`).join('')}</div>
  ${healRowsHTML()}
  <p class="hint" style="margin-top:10px">Press a number to use a salve. Press <kbd>T</kbd> then a number to revive. Cords are thrown from the Bind menu during a battle. Gems, metals, ingredients, rings and potions are in Gear (<kbd>G</kbd>).</p>`;
}
/** Party/companions panel. */
function partyHTML(){
  const cr=S.cr;
  if(!cr.length)return `<h2>Companions</h2><p>You have none yet. In a fight, wear a beast down, then throw a cord from the Bind menu. Wounded beasts are easier to bind.</p>`;
  UI.sel=clamp(UI.sel,0,cr.length-1);
  const s=cr[UI.sel],st=cs(s),mv=movesFor(SP[s.sp],s.lvl),bonus=Math.round((catchUp(s,S.lvl)-1)*100);
  const rows=cr.map((c,i)=>`<button class="item b ${i===UI.sel?'sel':''} ${c.hp<=0?'dead':''}" data-k="#${i}" style="text-align:left"><div class="grow"><b>${nm(c)}</b> <span class="dim">Lv ${c.lvl}</span> ${tchip(SP[c.sp].t)} ${abadge(c)}${bar(c.hp/cmax(c),'sm')}</div><span class="dim">${c.p?(c===lead()?'Lead':'Party'):'Stable'}</span></button>`).join('');
  return `<h2>Companions</h2><p class="hint">Party ${party().length}/4 · ${cr.length-party().length} in the stable. Select with W/S or the numbers 1–9.</p>
  <div class="list">${rows}</div>
  <div class="npc">${artHTML(s.sp,96,'port')}<div><h3 style="margin:0">${nm(s)} ${abadge(s)}</h3><div class="hint">${chip(RAR[SP[s.sp].rar].n,RAR[SP[s.sp].rar].c)} ${SP[s.sp].stage>1?'Stage '+SP[s.sp].stage+' of '+SP[s.sp].stages:'Stage 1 of '+SP[s.sp].stages}</div></div></div>
  <p class="mono">HP ${s.hp}/${st.hp} · Atk ${st.atk} · Def ${st.def} · Spd ${st.spd}</p>
  <p class="hint">XP ${s.xp}/${needC(s.lvl)}${bonus?` · +${bonus}% XP while below your level`:''}${SP[s.sp].evo?` · evolves at level ${SP[s.sp].evo[0]}`:''}${s.alpha?' · Alpha: +35% HP and +10% move power':''}</p>
  <p>${mv.map(m=>`<span class="chip" style="--c:${TYPE[m.t][0]}"><i></i>${m.n}${m.heal?' heals':' '+m.p}${moveCd(m)?` · rests ${moveCd(m)}`:''}</span>`).join(' ')}</p>
  <p class="hint">A move's number is its power, its base strength. Damage also depends on level, attack against the target's defense, type match (double when strong, half when weak) and a roll of 85–100%. Moves of power 70 or more must rest between uses. Bound beasts deal 15% extra damage.</p>
  <div class="acts">${btn('Enter',s.p?'Move to stable':'Add to party')}${btn('l','Make lead')}${btn('x',UI.rel===s.id?'Confirm release':'Release','danger')}</div>`;
}
/** World map panel. */
function mapHTML(){
  const rows=Object.keys(ZN).filter(k=>!ZN[k].safe).sort((a,b)=>ZN[a].lv[0]-ZN[b].lv[0]||ZN[a].lv[1]-ZN[b].lv[1]).map(k=>{const z=ZN[k],dg=danger(Math.round((z.lv[0]+z.lv[1])/2),S.lvl);return `<div class="item"><span><b>${z.n}</b> <span class="dim">Lv ${z.lv[0]}–${z.lv[1]}</span></span>${chip(dg.n,dg.c)}</div>`;}).join('');
  return `<h2>World map</h2><canvas id="wmap" width="896" height="704" role="img" aria-label="Explored world map"></canvas>
  <p class="hint">Colors show how dangerous each land is for your level. Unexplored land is dimmed. Teal marks safe havens. Gold diamonds mark shrines you have learned about.</p><div class="list">${rows}</div>`;
}
/** Bestiary panel. */
function dexHTML(){
  const seen=Object.keys(S.seen).length,got=Object.keys(S.caught).filter(k=>S.caught[k]>0).length;
  const cards=SPL.map(id=>{
    const sp=SP[id];
    if(!S.seen[id])return `<div class="card unk"><b>???</b><div class="hint">${RAR[sp.rar].n}${sp.aq?' · water':''}</div></div>`;
    const zs=sp.legend&&sp.stage===1?'Wakes only at its shrine':sp.z.length?(sp.aq?'Waters of ':'')+sp.z.map(z=>ZN[z].n).join(', ')+(sp.t==='Gloom'?' · only at night':''):'Evolved form';
    const evo=sp.next?`Evolves at Lv ${sp.evo[0]} into ${S.seen[sp.next]?SP[sp.next].n:'???'}`:'Final form';
    return `<div class="card">${artHTML(id,64,'port')}<div><b>${sp.n}</b> ${tchip(sp.t)}</div><div>${chip(RAR[sp.rar].n,RAR[sp.rar].c)}</div><div class="hint">${zs}</div><div class="hint">${evo}</div><div class="hint">${S.caught[id]>0?'Bound ×'+S.caught[id]:'Seen, not bound'}</div></div>`;
  }).join('');
  return `<h2>Bestiary</h2><p class="hint">${seen} seen · ${got} bound · ${SPL.length} known to exist · every beast belongs to an evolution line</p><div class="grid2">${cards}</div>`;
}
/** Shop panel. */
function shopHTML(){
  const rows=S.shop.map((k,i)=>{
    const owned=k==='boat'&&S.items.boat>0;
    const label=owned?'Owned':IT[k].price+' gold';
    return `<div class="item"><div class="grow"><b>${IT[k].n}</b> ${k==='boat'?'':`<span class="mono">×${S.items[k]}</span>`}<div class="hint">${IT[k].d}</div></div><button class="b ${!owned&&S.gold>=IT[k].price?'pri':''}" data-k="${i+1}" ${owned?'disabled':''}><kbd>${i+1}</kbd> ${label}</button></div>`;
  }).join('');
  return `<h2>Provisioner</h2><p class="gold mono">${S.gold} gold</p><div class="list">${rows}</div>`;
}
/** Help panel. */
function helpHTML(){
  return `<h2>How to play</h2>
  <h3>Moving</h3><p>Every step is one turn. Walls, trees and rocks block you. The dashed box shows what you are facing.</p>
  <p><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> or arrows move · <kbd>E</kbd> use or talk · <kbd>.</kbd> wait · <kbd>C</kbd> camp · <kbd>I</kbd> pack · <kbd>P</kbd> companions · <kbd>M</kbd> map · <kbd>B</kbd> bestiary · <kbd>Esc</kbd> menu</p>
  <h3>Danger</h3><p>Each land has a level range. Colors compare it to your level: grey trivial, green easy, yellow even, orange hard, red dangerous, purple deadly. Beasts on the map carry a level badge in the same colors, with a red ring for aggressive, yellow for neutral, blue for skittish. Aggressive beasts chase you, but they never enter a town and never leave the land they came from.</p>
  <h3>Safe places</h3><p>Towns and buildings are safe. No creature can attack you there. Tall grass outside can hide an ambush, and camping in the wild is a gamble.</p>
  <h3>Water</h3><p>Buy a Folding Skiff from a provisioner. Walk into open water to board, and step onto land to leave. Water beasts live only in the water, and you can be ambushed while afloat. You cannot camp on the water.</p>
  <h3>Battle</h3><p>The first half second of a fight ignores all keys, so a stray press cannot trigger a command. Arrow keys do nothing during battle. <kbd>1</kbd>–<kbd>4</kbd> command your companion · <kbd>S</kbd> strike · <kbd>G</kbd> guard · <kbd>B</kbd> bind · <kbd>H</kbd> heal · <kbd>W</kbd> swap · <kbd>R</kbd> run. Beasts may strike you instead of your companion. If your health reaches zero, you die.</p>
  <h3>Quests</h3><p>Folk marked <b>!</b> have work for you and <b>?</b> means a quest is ready to hand in. Walk into someone or press <kbd>E</kbd> beside them to talk. Many quests chain into follow-ups, sometimes with a different person in a different town. <kbd>Q</kbd> opens your quest log. Quests always give experience, and often cords, salves, gold, gems, metals and ingredients.</p>
  <h3>Rings and potions</h3><p>Use a work table in town (walk up and press <kbd>E</kbd>). You are not told what formulas exist. When your pack holds everything one needs, it is unlocked and you are told. Rings combine a metal with gems and you may wear two at a time. Potions are brewed from ingredients and applied to you or a companion. Open <kbd>G</kbd> for Gear.</p>
  <h3>Day, night and tournaments</h3><p>A day is 120 turns of daylight followed by 120 turns of night, and the map darkens slightly after dusk. The notice post beside each town's work table shows the current day and the calendar for all six cups, E through S. You only compete in the cup for your rank, and you must be at a town's Proving Hall (the building on the south side of the square) on the day itself. Bouts are three beasts a side with no items; you choose moves, guards and swaps. Before each bout you see the rival's team and pick your lead in secret while they pick theirs, each judging only by the other's team; both leads are revealed at once. Win your rank's cup to be promoted. A and S are best of three.</p>
  <h3>Gloom beasts</h3><p>Gloom-type beasts, and the lairs they guard, only appear at night. By day the wilds hold the other types.</p>
  <h3>Legendary beasts</h3><p>Six legendary beasts are never found in the wild. Each sleeps at a hidden shrine and wakes only if you hold its three relics, one per quest in a chain. Finish the chain, then stand at the altar and press <kbd>E</kbd> twice. If you defeat it without binding it, it withdraws and you can try again later. Binding it uses up the relics.</p>
  <h3>Moves</h3><p>A move's power is its base strength. Moves of power 70 or more must rest for a couple of turns after use, and any action you take counts as a turn. Bound beasts deal 15% extra damage. Companions below your level earn bonus XP, 25% per level behind you, up to double. A captured Alpha keeps its extra HP and move power.</p>`;
}
/** Menu panel. */
function menuHTML(){
  return `<h2>Menu</h2><div class="acts">${btn('s','Save now','pri')}${btn('?','How to play')}${btn('n',UI.newConfirm?'Confirm: erase and start over':'Start a new life','danger')}${btn('Escape','Resume')}</div>
  <p class="hint" style="margin-top:10px">Progress also saves when you rest on a bed, visit a healer, or finish a fight. ${S.hard?'This is a hardcore life: death deletes the save.':''}</p>`;
}
const FKEYS=['1','2','3','4','5','6','7','8','9','0','-'];
const needLine=(need)=>Object.keys(need).map(k=>{const h=S.mats[k]||0,ok=h>=need[k];return `<span class="${ok?'okn':'lackn'}">${MATS[k].n}${need[k]>1?' ×'+need[k]:''} <span class="mono">(${h})</span></span>`;}).join(', ');
const found=kind=>RECIPES.filter(r=>r.kind===kind&&S.recipes[r.id]).length;
/** Text for a quest reward. */
function rewardLine(q){
  const p=[`${q.xp} XP`];
  if(q.gold)p.push(q.gold+' gold');
  for(const k in (q.items||{}))p.push(IT[k].n+(q.items[k]>1?' ×'+q.items[k]:''));
  for(const k in (q.mats||{}))p.push(MATS[k].n+(q.mats[k]>1?' ×'+q.mats[k]:''));
  return p.join(' · ');
}
/** Objective list for a quest. */
function objHTML(q){
  if(!q.obj.length){const n=NPCS[q.turnin||q.giver];return `<ul class="obj"><li class="${qComplete(q)?'ok':''}">Deliver it to ${n.n} (${n.place})</li></ul>`;}
  return '<ul class="obj">'+q.obj.map((o,i)=>{const n=objNeed(o),h=Math.min(objHave(q,i),n),d=h>=n;return `<li class="${d?'ok':''}">${d?'✓ ':''}${o.label}${n>1?` <span class="mono">${h}/${n}</span>`:''}</li>`;}).join('')+'</ul>';
}
/** NPC dialogue panel. */
function talkHTML(){
  const t=S.talk,n=NPCS[t.npc],q=t.qid?QB[t.qid]:null;
  let h=`<div class="npc"><div class="sigil" style="--c:#8A5A14;--ci:#FFFFFF">${n.g}</div><div><h2>${n.n}</h2><div class="hint">${n.t} · ${n.place}</div></div></div>`;
  const quoted=t.text.charAt(0)==='('?t.text:`“${t.text}”`;
  h+=`<p class="say">${quoted}</p>`;
  if(q&&(t.mode==='offer'||t.mode==='remind'||t.mode==='turnin')){
    const chain=QUESTS.some(x=>x.after===q.id);
    h+=`<div class="qcard"><div class="qh"><b>${t.mode==='turnin'?'Complete: ':''}${q.title}</b> <span class="dim">Lv ${q.min||1}</span>${chain?' <span class="chip" style="--c:#8A5A14"><i></i>Chain continues</span>':''}</div>${objHTML(q)}<div class="hint">Reward: ${rewardLine(q)}</div></div>`;
  }
  return h;
}
/** Quest log panel. */
function questsHTML(){
  const act=QUESTS.filter(qActive).sort((a,b)=>qComplete(b)-qComplete(a)),done=QUESTS.filter(q=>S.q[q.id]&&S.q[q.id].st==='done');
  let h=`<h2>Quest log</h2><p class="hint">${done.length} of ${QUESTS.length} quests complete. Beasts and townsfolk marked <b>!</b> have work for you, and <b>?</b> means a quest is ready to hand in.</p>`;
  if(!act.length)h+='<p>No active quests. Talk to people marked with a ! on the map. Some wait in the wild.</p>';
  for(const q of act){
    const ready=qComplete(q),tn=NPCS[q.turnin||q.giver],g=NPCS[q.giver];
    h+=`<div class="qcard ${ready?'ready':''}"><div class="qh"><b>${q.title}</b> <span class="dim">Lv ${q.min||1}</span>${ready?' <span class="chip" style="--c:#3F9A4A"><i></i>Ready to hand in</span>':''}</div><div class="hint">From ${g.n} · hand in to ${tn.n}, ${tn.place}</div>${objHTML(q)}<div class="hint">Reward: ${rewardLine(q)}</div></div>`;
  }
  if(done.length)h+=`<h3>Completed</h3><p class="hint">${done.map(q=>q.title).join(' · ')}</p>`;
  return h;
}
/** Potions the player owns. */
function potList(){return RECIPES.filter(r=>r.kind==='potion'&&S.pot[r.id]>0);}
/** Gear panel (rings and potions). */
function gearHTML(){
  const rings=RECIPES.filter(r=>r.kind==='ring'&&S.rings[r.id]),pots=potList(),ps=party();
  let h=`<h2>Gear</h2><p class="hint">Rings found: ${found('ring')} of ${NRING} · Potions found: ${found('potion')} of ${NPOT}. Formulas reveal themselves when you hold everything they need. Brew and forge at a work table in town.</p>`;
  if(UI.gpot){
    const r=RC[UI.gpot],mx=pMax(S.lvl);
    h+=`<h3>Use ${r.n} on…</h3><div class="cmds"><button class="b" data-k="tgt:you"><kbd>1</kbd> You<span class="sub">${S.hp}/${mx} HP</span></button>${ps.map((c,i)=>`<button class="b" data-k="tgt:${i}"><kbd>${i+2}</kbd> ${nm(c)} ${abadge(c)}<span class="sub">Lv ${c.lvl} · ${c.hp}/${cmax(c)} HP${c.hp<=0?' · fainted':''}</span></button>`).join('')}</div><p class="hint">${r.d} Press Esc to go back.</p>`;
    return h;
  }
  h+=`<h3>Rings (${S.equip.length}/2 worn)</h3>`;
  if(!rings.length)h+='<p class="hint">You have not forged any rings yet.</p>';
  else h+='<div class="cmds">'+rings.map((r,i)=>{const on=S.equip.includes(r.id);return `<button class="b ${on?'pri':''}" data-k="ring:${r.id}">${UI.gmode==='potion'?'':`<kbd>${i+1}</kbd> `}${r.n}${on?' · worn':''}<span class="sub">${r.d}</span></button>`;}).join('')+'</div>';
  h+=`<h3>Potions</h3>`;
  if(!pots.length)h+='<p class="hint">You have no potions.</p>';
  else h+=`<div class="cmds">${pots.map((r,i)=>`<button class="b" data-k="pot:${r.id}">${UI.gmode==='potion'?`<kbd>${i+1}</kbd> `:''}${r.n} ×${S.pot[r.id]}<span class="sub">${r.d}</span></button>`).join('')}</div><div class="acts" style="margin-top:6px">${btn('u',UI.gmode==='potion'?'Choosing a potion…':'Use a potion by number')}</div>`;
  if(S.rage>0||S.musk>0||Object.keys(S.bonus).some(k=>k.indexOf('p_')===0))h+=`<p class="hint">Active: ${[S.rage>0?`Berserker's Brew (${S.rage} fights)`:'',S.musk>0?`Beastcall Musk (${S.musk} binds)`:'',S.bonus.p_hp?'Vigor':'',S.bonus.p_atk?'Fury':'',S.bonus.p_def?'Stoneskin':''].filter(Boolean).join(', ')}.</p>`;
  h+='<h3>Materials</h3>';
  let any=false;
  for(const kk of MKIND){
    const have=MD.filter(m=>m[2]===kk[0]&&S.mats[m[0]]>0);
    if(!have.length)continue;any=true;
    h+=`<p class="mats"><b>${kk[1]}:</b> ${have.map(m=>`${m[1]} <span class="mono">×${S.mats[m[0]]}</span>`).join(' · ')}</p>`;
  }
  if(!any)h+='<p class="hint">You carry no materials yet. Quests and beasts reward them, and the rarer ones are hard to come by.</p>';
  const rel=Object.keys(RELICS).filter(k=>S.relics[k]>0);
  h+=`<h3>Relics</h3>`;
  if(!rel.length)h+='<p class="hint">You hold no relics. Legendary beasts sleep at shrines and wake only for three relics each, earned through long chains of quests.</p>';
  else h+=`<p class="mats">${rel.map(k=>RELICS[k]).join(' · ')}</p><p class="hint">Take all three relics of a set to their shrine and press E twice.</p>`;
  const lg=SPL.filter(id=>SP[id].legend&&SP[id].stage===1&&S.caught[id]>0).length;
  h+=`<p class="hint">Legendary beasts bound: ${lg} of ${SHRINES.length}.</p>`;
  return h;
}
/** Recipes for the active forge tab. */
function forgeList(){return RECIPES.filter(r=>r.kind===UI.ftab&&S.recipes[r.id]);}
/** Forge panel. */
function forgeHTML(){
  const ring=UI.ftab==='ring',list=forgeList(),total=ring?NRING:NPOT;
  let h=`<h2>Work table</h2><p class="hint">Rings found: ${found('ring')} of ${NRING} · Potions found: ${found('potion')} of ${NPOT}. A formula is revealed only when you hold every ingredient it calls for.</p>
  <div class="acts"><button class="b ${ring?'pri':''}" data-k="r"><kbd>R</kbd> Rings</button><button class="b ${ring?'':'pri'}" data-k="o"><kbd>O</kbd> Potions</button></div>`;
  h+='<div class="list" style="margin-top:8px">'+list.map((r,i)=>{
    const owned=ring&&S.rings[r.id],can=!owned&&hasAll(r.need);
    return `<div class="item"><div class="grow"><b>${r.n}</b>${ring?'':` <span class="mono">×${S.pot[r.id]||0}</span>`}<div class="hint">${r.d}</div><div class="hint">Needs: ${needLine(r.need)}</div></div><button class="b ${can?'pri':''}" data-k="craft:${r.id}" ${can?'':'disabled'}>${i<FKEYS.length?`<kbd>${FKEYS[i]}</kbd> `:''}${owned?'Forged':ring?'Forge':'Brew'}</button></div>`;
  }).join('')+'</div>';
  if(!list.length)h+=`<p class="hint">No ${ring?'ring':'potion'} formulas discovered yet.</p>`;
  const left=total-list.length;
  if(left>0)h+=`<p class="hint">${left} ${ring?'ring':'potion'} formula${left>1?'s':''} still undiscovered.</p>`;
  return h;
}
/** HTML for the currently open panel. */
function panelHTML(){
  return ({pack:packHTML,party:partyHTML,map:mapHTML,dex:dexHTML,shop:shopHTML,help:helpHTML,menu:menuHTML,talk:talkHTML,quests:questsHTML,gear:gearHTML,forge:forgeHTML,sign:signHTML,hall:hallHTML,evolve:evolveHTML})[S.panel]();
}

/* ---------- dock ---------- */
/** Dock buttons while exploring. */
function worldDock(){
  return `<div class="dockrow"><div class="pad"><span></span><button class="b" data-k="w" aria-label="Move north">W</button><span></span>
  <button class="b" data-k="a" aria-label="Move west">A</button><button class="b" data-k="." aria-label="Wait a turn">·</button><button class="b" data-k="d" aria-label="Move east">D</button>
  <span></span><button class="b" data-k="s" aria-label="Move south">S</button><span></span></div>
  <div class="acts">${btn('e','Use / talk','pri')}${btn('c','Camp')}${btn('i','Pack')}${btn('p','Companions')}${btn('q','Quests')}${btn('g','Gear')}${btn('m','Map')}${btn('b','Bestiary')}${btn('?','Help')}</div></div>
  <p class="hint">WASD or arrows to move. <kbd>.</kbd> waits a turn.</p>`;
}
/** Dock buttons in battle. */
function battleDock(){
  const B=S.battle,f=B.foe,c=lead();
  if(B.sub==='bind'){
    const opts=['cord','silver','gilded'];
    return `<div class="cmds">${opts.map((k,i)=>{const n=S.items[k],p=bindChance(k);const o=p<.15?'Slim':p<.35?'Fair':p<.6?'Good':'Excellent';return `<button class="b" data-k="${i+1}" ${n<1?'disabled':''}><kbd>${i+1}</kbd> ${IT[k].n}<span class="sub">×${n} · odds ${o}</span></button>`;}).join('')}${btn('Escape','Back')}</div><p class="hint">Wounded beasts are bound more easily.</p>`;
  }
  if(B.sub==='heal')return healRowsHTML()+`<div class="acts" style="margin-top:6px">${btn('Escape','Back')}</div>`;
  if(B.sub==='swap'){
    const ps=party();
    return `<div class="cmds">${ps.map((p,i)=>`<button class="b" data-k="${i+1}" ${p.hp<=0||p===c?'disabled':''}><kbd>${i+1}</kbd> ${nm(p)} ${abadge(p)}<span class="sub">Lv ${p.lvl} · HP ${p.hp}/${cmax(p)}</span></button>`).join('')}${btn('Escape','Back')}</div>`;
  }
  let mv='';
  if(c){
    mv=movesFor(SP[c.sp],c.lvl).map((m,i)=>{
      const cdv=B.cd[cdKey(c,m)]||0;let sub;
      if(cdv>0)sub=`ready in ${cdv}`;
      else if(m.heal)sub=`Heals about ${Math.ceil(cmax(c)*m.heal)} HP`;
      else{const tm=tmult(m.t,SP[f.sp].t);sub=`${m.t} · power ${m.p}${tm>1?' · strong':tm<1?' · weak':''} · about ${rng(estMove(c,f,m))} damage${moveCd(m)?` · rests ${moveCd(m)}`:''}`;}
      return `<button class="b" data-k="${i+1}" ${cdv>0?'disabled':''}><kbd>${i+1}</kbd> ${m.n}<span class="sub">${sub}</span></button>`;
    }).join('');
  }
  return `<div class="cmds">${mv}</div><div class="acts" style="margin-top:6px">${btnSub('s','Strike',`about ${rng(estStrike(f))} damage`)}${btn('g','Guard')}${btn('b','Bind','pri')}${btn('h','Heal')}${btn('w','Swap')}${btn('r','Run')}</div>`;
}
/** Renders the control dock for the current mode. */
function renderDock(){
  const d=$('#dock'),put=h=>setHTML(d,h);
  if(!S||S.mode==='dead'){put('');return;}
  if(S.mode==='battle'){put(battleDock());return;}
  if(S.mode==='arena'){put(arenaDock());return;}
  if(S.panel==='talk'&&S.talk){
    const m=S.talk.mode;
    put(`<div class="acts">${m==='offer'?btn('Enter','Accept quest','pri')+btn('Escape','Not now'):m==='turnin'?btn('Enter','Complete quest','pri')+btn('Escape','Not yet'):btn('Escape','Goodbye')}</div>`);return;
  }
  if(S.panel==='evolve'){put(evolveDock());return;}
  if(S.panel==='hall'){put(hallDock());return;}
  if(S.panel){put(`<div class="acts">${btn('Escape','Close')}</div>`);return;}
  put(worldDock());
}

/* ---------- render ---------- */
/* Several state changes in one tick draw one frame. Without an animation clock (or if it stalls), draw straight away. */
/** Schedules a render on the next frame. */
function render(){
  if(typeof requestAnimationFrame!=='function'){renderNow();return;}
  if(UI.rq)return;UI.rq=true;
  const go=()=>{if(UI.rq){UI.rq=false;renderNow();}};
  requestAnimationFrame(go);setTimeout(go,150);
}
/** Renders everything immediately. */
function renderNow(){
  let showMap=false,html='';
  /* A waiting evolution takes over the screen as soon as nothing more important is open. */
  if(S&&S.mode==='world'&&S.evoQ&&S.evoQ.length&&(!S.panel||S.panel==='gear'))S.panel='evolve';
  if(!S)html=titleHTML();
  else if(S.mode==='dead')html=deadHTML();
  else if(S.mode==='battle')html=battleHTML();
  else if(S.mode==='arena')html=arenaHTML();
  else if(S.panel)html=panelHTML();
  else showMap=true;
  $('#map').hidden=!showMap;$('#panel').hidden=showMap;
  if(!showMap)setHTML($('#panel'),html);
  if(showMap)drawMap();
  if(S&&S.panel==='map'&&!S.battle)drawWorldMap();
  updHUD();renderLog();renderDock();
}

/* ---------- input ---------- */
/** Opens panel `n` and resets selection state. */
function openPanel(n){S.panel=n;UI.sel=0;UI.rel=null;UI.newConfirm=false;UI.tonic=false;UI.gmode=null;UI.gpot=null;render();}
const PANEL_KEYS={i:'pack',p:'party',m:'map',b:'dex',q:'quests',g:'gear','?':'help','/':'help'};
/** Key handler while exploring. */
function worldKey(k){
  switch(k){
    case'w':move(0,-1);break;case's':move(0,1);break;case'a':move(-1,0);break;case'd':move(1,0);break;
    case'e':case' ':case'Enter':interact();break;
    case'.':case'z':S.arm=null;endTurn();break;
    case'c':campOut();break;
    case'Escape':openPanel('menu');break;
    default:if(PANEL_KEYS[k])openPanel(PANEL_KEYS[k]);
  }
}
/** Key handler for panels. */
function panelKey(k){
  const p=S.panel;
  if(p==='evolve'){if(k==='Enter'||k===' '||k==='e'||k==='Escape'){S.evoQ.shift();S.panel=null;render();}return;}
  if(k==='Escape'){
    if(p==='gear'&&(UI.gpot||UI.gmode)){UI.gpot=null;UI.gmode=null;render();return;}
    S.panel=null;S.talk=null;UI.tonic=false;render();return;
  }
  if(p==='talk'){
    const t=S.talk;
    if(t&&(k==='Enter'||k===' '||k==='e')){
      if(t.mode==='offer'){qAccept(t.qid);S.panel=null;S.talk=null;render();}
      else if(t.mode==='turnin'){
        qTurnIn(t.qid);
        if(QUESTS.some(q=>q.giver===t.npc&&qOpen(q)))talkTo(t.npc);else{S.panel=null;S.talk=null;render();}
      }else{S.panel=null;S.talk=null;render();}
    }
    return;
  }
  if(p==='hall'){
    if(k==='Enter'||k===' '||k==='e'){enterTournament();return;}
    if(k==='r'){restUntilEvent();render();return;}
    if(k==='u'){squadFromParty();render();return;}
    if(k==='b'){squadBest();render();return;}
    if(k.indexOf('sq:')===0){toggleSquad(0,+k.slice(3));render();return;}
    if(/^[1-9]$/.test(k)){toggleSquad(+k-1);render();return;}
    return;
  }
  if(p==='forge'){
    if(k==='r'){UI.ftab='ring';render();return;}
    if(k==='o'){UI.ftab='potion';render();return;}
    let id=null;
    if(k.indexOf('craft:')===0)id=k.slice(6);
    else{const i=FKEYS.indexOf(k);if(i>=0&&forgeList()[i])id=forgeList()[i].id;}
    if(id){craft(id);render();return;}
  }
  if(p==='gear'){
    const rings=RECIPES.filter(r=>r.kind==='ring'&&S.rings[r.id]),pots=potList();
    if(UI.gpot){
      let slot=null;
      if(k.indexOf('tgt:')===0)slot=k.slice(4);else if(/^[1-5]$/.test(k))slot=k==='1'?'you':String(+k-2);
      if(slot!==null){usePotion(UI.gpot,slot==='you'?'you':+slot);UI.gpot=null;UI.gmode=null;render();return;}
    }else{
      if(k==='u'){UI.gmode=UI.gmode==='potion'?null:'potion';render();return;}
      if(k.indexOf('ring:')===0){toggleRing(k.slice(5));render();return;}
      if(k.indexOf('pot:')===0){if(S.pot[k.slice(4)]>0){UI.gpot=k.slice(4);UI.gmode=null;}render();return;}
      if(/^[1-9]$/.test(k)){
        if(UI.gmode==='potion'){if(pots[+k-1]){UI.gpot=pots[+k-1].id;UI.gmode=null;}}
        else if(rings[+k-1])toggleRing(rings[+k-1].id);
        render();return;
      }
    }
  }
  if(p==='shop'){
    const i=parseInt(k,10)-1,id=S.shop[i];
    if(id){
      if(id==='boat'&&S.items.boat>0)log('You already own a skiff.','info');
      else if(S.gold>=IT[id].price){S.gold-=IT[id].price;S.items[id]++;log(id==='boat'?'You buy a Folding Skiff. Walk into open water to board it.':`You buy a ${IT[id].n}.`,'loot');}
      else log('You cannot afford that.','bad');
      render();
    }
    return;
  }
  if(p==='pack'){
    if(k==='t'){UI.tonic=true;render();return;}
    const tok=k[0]==='@'?k:healKeyToTok(k);
    if(tok){UI.tonic=false;const a=healTok(tok);if(a)usePack(a.item,a.slot);render();return;}
    if(UI.tonic){UI.tonic=false;render();return;}
  }
  if(p==='party'){
    const cr=S.cr;
    if(PANEL_KEYS[k]&&k!=='p'){openPanel(PANEL_KEYS[k]);return;}
    if(k==='w')UI.sel=Math.max(0,UI.sel-1);
    else if(k==='s')UI.sel=Math.min(cr.length-1,UI.sel+1);
    else if(k[0]==='#')UI.sel=parseInt(k.slice(1),10);
    else if(/^[1-9]$/.test(k)&&cr[+k-1])UI.sel=+k-1;
    else if(cr[UI.sel]){
      const c=cr[UI.sel];
      if(k==='Enter'||k===' '){
        if(c.p)c.p=false;else if(party().length<4)c.p=true;else log('Your party is full. Move someone to the stable first.','bad');
      }else if(k==='l'){
        if(c.hp<=0)log(`${nm(c)} has fainted and cannot lead. Heal it first.`,'bad');
        else if(!c.p&&party().length>=4)log('Your party is full.','bad');
        else{c.p=true;S.cr.splice(S.cr.indexOf(c),1);S.cr.unshift(c);UI.sel=0;log(`${nm(c)} now leads your party.`,'info');}
      }else if(k==='x'){
        if(UI.rel===c.id){S.cr.splice(S.cr.indexOf(c),1);UI.rel=null;log(`You set ${nm(c)} free.`,'info');UI.sel=0;}
        else{UI.rel=c.id;}
        render();return;
      }
    }
    UI.rel=null;render();return;
  }
  if(p==='menu'){
    if(k==='s'){saveGame();render();return;}
    if(k==='n'){if(UI.newConfirm){wipeSave();newGame(S.hard);}else{UI.newConfirm=true;render();}return;}
    if(k==='?'){openPanel('help');return;}
  }
  if(PANEL_KEYS[k]&&p!=='menu'){openPanel(PANEL_KEYS[k]);return;}
}
/** Key handler in battle. */
function battleKey(k){
  const B=S.battle;if(!B)return;
  if(B.sub==='heal'){
    if(k==='Escape'){B.sub=null;UI.tonic=false;render();return;}
    if(k==='t'){UI.tonic=true;render();return;}
    const tok=k[0]==='@'?k:healKeyToTok(k);
    if(tok){UI.tonic=false;const a=healTok(tok);if(a)bAct('heal',a);return;}
    UI.tonic=false;render();return;
  }
  if(B.sub){
    if(k==='Escape'){B.sub=null;render();return;}
    const i=parseInt(k,10)-1;if(isNaN(i))return;
    if(B.sub==='bind'){const id=['cord','silver','gilded'][i];if(id)bAct('bind',id);}
    else if(B.sub==='swap')bAct('swap',i);
    return;
  }
  if(/^[1-4]$/.test(k))return bAct('move',+k-1);
  if(k==='s')return bAct('strike');
  if(k==='g')return bAct('guard');
  if(k==='r')return bAct('run');
  if(k==='b'||k==='h'||k==='w'){B.sub=({b:'bind',h:'heal',w:'swap'})[k];UI.tonic=false;render();}
}
/** Key handler on the title screen. */
function titleKey(k){
  if(k==='c'&&hasSave()){if(!loadGame())newGame(false);}
  else if(k==='n')newGame(false);
  else if(k==='h')newGame(true);
}
/** Key handler on the death screen. */
function deadKey(k){
  if(k==='r'&&!S.hard)respawn();
  else if(k==='n')newGame(S.hard);
}
const ARROWS={ArrowUp:'w',ArrowDown:'s',ArrowLeft:'a',ArrowRight:'d'};
/** Top-level key dispatcher by game mode. */
function onKey(k){
  if(S&&UI.lockUntil>now())return;
  if(ARROWS[k]){
    /* Arrow keys are for walking. In a fight they do nothing, so they cannot trigger a battle command. */
    if(S&&(S.mode==='battle'||S.mode==='arena'))return;
    k=ARROWS[k];
  }
  if(k==='__save'){if(S&&S.mode==='world'){saveGame();render();}return;}
  if(!S)return titleKey(k);
  if(S.mode==='dead')return deadKey(k);
  if(S.mode==='battle')return battleKey(k);
  if(S.mode==='arena')return arenaKey(k);
  if(S.panel)return panelKey(k);
  worldKey(k);
}
document.addEventListener('keydown',e=>{
  if(e.ctrlKey||e.metaKey||e.altKey)return;
  const tag=e.target.tagName||'';
  if(tag==='INPUT'||tag==='TEXTAREA')return;
  const k=e.key.length===1?e.key.toLowerCase():e.key;
  if(tag==='BUTTON'&&(k==='Enter'||k===' '))return;
  if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' ','Escape'].includes(k))e.preventDefault();
  /* A held key keeps sending repeats. Ignore them in battle, and after a fight starts or ends until the key is released. */
  if(!e.repeat)UI.noRepeat=false;
  else if(S&&(UI.noRepeat||S.mode==='battle'||S.mode==='arena'))return;
  onKey(k);
});
document.addEventListener('keyup',()=>{UI.noRepeat=false;});
/* Keep keyboard focus on the page itself. Scrolling areas and stale buttons must not hold it, or keys stop reaching the game. */
document.addEventListener('focusin',e=>{const t=e.target;if(t&&t!==document.body&&t.tagName&&!/^(BUTTON|INPUT|TEXTAREA)$/.test(t.tagName)&&t.blur)t.blur();});
document.addEventListener('pointerdown',()=>{try{window.focus();}catch(e){}});
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-k]');if(!b||b.disabled)return;
  b.blur();onKey(b.dataset.k);
});
window.addEventListener('resize',()=>{if(S&&S.mode==='world'&&!S.panel)drawMap();});
try{matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>render());}catch(e){}
new MutationObserver(()=>render()).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
build();renderNow();
if(document.fonts&&document.fonts.ready)document.fonts.ready.then(()=>render());
