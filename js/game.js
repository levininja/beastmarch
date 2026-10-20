/**
 * game.js — core game state and rules
 *
 * Load order: 4th. Owns the global save object `S`, player/creature stats,
 * movement, wild encounters, battles, binding (capture), crafting, potions,
 * saving/loading with version migration, and the quest engine. Rendering lives
 * in ui.js; this file only mutates state and writes to the message log.
 *
 * All files are classic scripts sharing one global scope (no modules); see README.
 */
'use strict';
let S=null,LOG=[];
const rand=(a,b)=>a+Math.floor(Math.random()*(b-a+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
/* Equipped rings and potion bonuses feed into your stats. */
const fx=k=>{if(!S||!S.equip)return 0;let t=0;for(const id of S.equip){const r=RC[id];if(r&&r.fx&&r.fx[k])t+=r.fx[k];}return t;};
const pbo=k=>S&&S.bonus?(S.bonus[k]||0):0;
const pMax=l=>Math.floor((24+5*l)*(1+pbo('hp')+fx('hp')));
const pAtk=l=>Math.floor((4+Math.floor(1.2*l))*(1+pbo('atk')));
const pDef=l=>Math.floor((6+Math.floor(1.5*l))*(1+pbo('def')));
const bondMult=()=>BOND*(1+fx('bond'));
const rageC=c=>c&&c.rage>0?1.3:1;
const needP=l=>18*l+6*l*l,needC=l=>14*l+5*l*l;
const now=()=>(typeof performance!=='undefined'?performance.now():Date.now());
/** Stat block (hp, atk, def, spd) of species `id` at level `l`; `alpha` applies the alpha multipliers. */
function cstat(id,l,alpha){
  const b=SP[id].b,m=alpha?ALPHA_HP:1;
  return{hp:Math.floor((b[0]*2*l/100+l+10)*m),atk:Math.floor(b[1]*2*l/100+5),def:Math.floor(b[2]*2*l/100+5),spd:Math.floor(b[3]*2*l/100+5)};
}
const cs=c=>{const s=cstat(c.sp,c.lvl,c.alpha),b=c.bonus;if(!b)return s;return{hp:Math.floor(s.hp*(1+(b.hp||0))),atk:Math.floor(s.atk*(1+(b.atk||0))),def:Math.floor(s.def*(1+(b.def||0))),spd:s.spd};};
const cmax=c=>cs(c).hp;
const nm=c=>SP[c.sp].n;
const party=()=>S.cr.filter(c=>c.p);
const lead=()=>S.cr.find(c=>c.p&&c.hp>0)||null;
/** Appends a line to the message log (kept to 120 lines). `k` is a CSS class: good, bad, loot. */
function log(t,k){LOG.push({t,k:k||''});if(LOG.length>120)LOG.shift();}
/** Like log() but skips the line when it repeats the previous message. */
function hint(t,k){if(!LOG.length||LOG[LOG.length-1].t!==t)log(t,k||'info');}
const dmgRaw=(L,P,A,D,m)=>((2*L/5+2)*P*A/Math.max(1,D)/50+2)*m;
/** Rolled damage (85–100% of the raw formula, minimum 1). */
function dmgCalc(L,P,A,D,m){return Math.max(1,Math.floor(dmgRaw(L,P,A,D,m)*(0.85+Math.random()*0.15)));}
/** [min,max] damage the formula can roll; used for UI estimates. */
function dmgRange(L,P,A,D,m){const r=dmgRaw(L,P,A,D,m);return[Math.max(1,Math.floor(r*.85)),Math.max(1,Math.floor(r))];}
const effText=m=>m>1?' It is very effective.':m<1?' It is resisted.':'';
const zoneKey=()=>S.pos.room?S.pos.room.split(':')[0]:zoneKeyAt(S.pos.x,S.pos.y);
const isSafe=()=>!!S.pos.room||!!ZN[zoneKeyAt(S.pos.x,S.pos.y)].safe;
const entAt=(x,y)=>S.ents.find(e=>e.x===x&&e.y===y);
const day=()=>Math.floor(S.turn/CYCLE)+1;
const cdKey=(c,m)=>c.id+':'+m.n;
const catchUp=(c,pl)=>clamp(1+CATCHUP_PER_LEVEL*Math.max(0,pl-c.lvl),1,CATCHUP_MAX);

/** Resets the global state `S` for a new game (`hard` = no healing safety net). */
function newGame(hard){
  S={hard:!!hard,lvl:1,xp:0,gold:20,hp:pMax(1),items:{cord:0,silver:0,gilded:0,salve:0,tonic:0,boat:0},cr:[],uid:1,
    pos:{room:'th:cottage',x:2,y:4},face:{x:1,y:0},turn:0,steps:0,kills:0,cool:0,boating:false,
    haven:{room:'th:cottage',x:2,y:4},seen:{},caught:{},lairs:{},vis:new Uint8Array(W*H),met:false,ver:VER,shrines:{},relics:{},
    mode:'world',panel:null,ents:[],battle:null,dead:null,arm:null,
    q:{},mats:{},recipes:{},rings:{},equip:[],pot:{},bonus:{},metNpc:{},rage:0,musk:0,talk:null,rank:0,lg:{rec:{},squad:[],ent:{},titles:{}},tour:null,evoQ:[]};
  LOG=[];
  log("You wake on a straw pallet in a stranger's cottage. Your head aches and you remember nothing of this place.",'info');
  log('A woman by the hearth is watching you. Walk over and press E to talk.','info');
  UI.sel=0;UI.tonic=false;render();
}
/** Serialises `S` to localStorage; `quiet` suppresses the log message. */
function saveGame(quiet){
  if(!S||S.mode!=='world')return false;
  try{
    const o=Object.assign({},S);o.battle=null;o.panel=null;o.arm=null;o.talk=null;o.tour=null;o.evoQ=[];o.ver=VER;o.vis=null;o.vb=packVis(S.vis);
    localStorage.setItem(SAVE_KEY,JSON.stringify(o));
    if(!quiet)log('Game saved.','info');
    return true;
  }catch(e){if(!quiet)log('Saving is not available in this browser.','bad');return false;}
}
/* The explored map is one bit per tile, so a save stays small and quick even on a big world. */
/** Compresses the explored-tiles array for saving. */
function packVis(v){
  const n=Math.ceil(v.length/8),b=new Uint8Array(n);
  for(let i=0;i<v.length;i++)if(v[i])b[i>>3]|=1<<(i&7);
  let s='';for(let i=0;i<n;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));
  return btoa(s);
}
/** Inverse of packVis. */
function unpackVis(str){
  const v=new Uint8Array(W*H);
  try{const bin=atob(str);for(let i=0;i<v.length&&(i>>3)<bin.length;i++)if(bin.charCodeAt(i>>3)&(1<<(i&7)))v[i]=1;}catch(e){}
  return v;
}
/** True when a save exists in localStorage. */
function hasSave(){try{return !!localStorage.getItem(SAVE_KEY);}catch(e){return false;}}
/* The world is regenerated from fixed seeds, so an old save can put you inside water or rock after an update. */
/** Moves the player to a walkable tile if a loaded position is blocked (after world changes). */
function fixPosition(){
  if(S.pos.room){if(!ROOMS[roomKind(S.pos.room)])S.pos={room:null,x:START[0],y:START[1]};else return;}
  const t=inb(S.pos.x,S.pos.y)?TILES[S.pos.y*W+S.pos.x]:TL.ROCK;
  if(S.boating&&t===TL.WATER)return;
  S.boating=false;
  if(!BLK[t]&&!NPCAT[S.pos.x+','+S.pos.y])return;
  const reach=reachFrom(START[0],START[1]);
  for(let r=1;r<60;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
    if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;
    const x=S.pos.x+dx,y=S.pos.y+dy;
    if(inb(x,y)&&reach[y*W+x]){S.pos.x=x;S.pos.y=y;log('The land has shifted since you last played. You come to on open ground nearby.','info');return;}
  }
  S.pos={room:null,x:START[0],y:START[1]};
}
/** Loads and migrates a save (see VER). Old saves are upgraded step by step; exploration data is dropped on a version mismatch. */
function loadGame(){
  try{
    const o=JSON.parse(localStorage.getItem(SAVE_KEY));
    let v;
    if(o.ver===VER&&o.vb)v=unpackVis(o.vb);
    else{
      /* An older save came from a smaller world: carry your place over, but the map starts unexplored. */
      v=new Uint8Array(W*H);
      if((o.ver||1)<2){if(o.pos&&!o.pos.room){o.pos.x*=2;o.pos.y*=2;}
      if(o.haven&&!o.haven.room){o.haven.x*=2;o.haven.y*=2;}}
      /* The original land now sits inside a larger world, so every coordinate moves over. */
      if((o.ver||1)<4){if(o.pos&&!o.pos.room){o.pos.x+=OX;o.pos.y+=OY;}if(o.haven&&!o.haven.room){o.haven.x+=OX;o.haven.y+=OY;}}
      o.lairs={};
    }
    o.vis=v;delete o.vb;o.ver=VER;o.shrines=o.shrines||{};o.relics=o.relics||{};o.mode='world';o.panel=null;o.battle=null;o.dead=null;o.arm=null;o.ents=[];
    o.items=Object.assign({cord:0,silver:0,gilded:0,salve:0,tonic:0,boat:0},o.items);o.boating=!!o.boating;
    o.q=o.q||{};o.mats=o.mats||{};o.recipes=o.recipes||{};o.rings=o.rings||{};o.equip=(o.equip||[]).filter(id=>RC[id]&&o.rings[id]).slice(0,2);o.pot=o.pot||{};o.bonus=o.bonus||{};o.metNpc=o.metNpc||{};o.rage=o.rage||0;o.musk=o.musk||0;o.talk=null;o.tour=null;o.evoQ=[];o.rank=o.rank||0;o.lg=Object.assign({rec:{},squad:[],ent:{},titles:{}},o.lg);
    S=o;LOG=[];
    log('You pick up where you left off.','info');
    fixPosition();UI.sel=0;UI.tonic=false;render();return true;
  }catch(e){return false;}
}
/** Deletes the save. */
function wipeSave(){try{localStorage.removeItem(SAVE_KEY);}catch(e){}}

/* ---------- experience ---------- */
/** Gives the player XP and handles level-ups. */
function addXpPlayer(x){
  S.xp+=x;
  while(S.xp>=needP(S.lvl)){
    S.xp-=needP(S.lvl);S.lvl++;const m=pMax(S.lvl);S.hp=Math.min(m,S.hp+Math.ceil(m*.5));
    log(`You reach level ${S.lvl}.`,'good');
  }
}
/** Gives a companion XP, handles level-ups, move learning and evolution (cap level 50). */
function addXpC(c,x){
  c.xp+=x;
  while(c.xp>=needC(c.lvl)&&c.lvl<50){
    c.xp-=needC(c.lvl);c.lvl++;c.hp=Math.min(cmax(c),c.hp+Math.ceil(cmax(c)*.4));
    log(`${nm(c)} grows to level ${c.lvl}.`,'good');
    const e=SP[c.sp].evo;
    if(e&&c.lvl>=e[0]){
      const from=c.sp,b4=cs(c),mv4=movesFor(SP[from],c.lvl).map(m=>m.n),hp4=c.hp,fresh=!S.caught[e[1]];
      log(`${nm(c)} evolves into ${SP[e[1]].n}.`,'good');
      c.sp=e[1];S.seen[c.sp]=1;S.caught[c.sp]=Math.max(1,S.caught[c.sp]||0);c.hp=Math.min(cmax(c),c.hp+Math.ceil(cmax(c)*.3));
      evoRecord(c,from,b4,mv4,hp4,fresh);
    }
  }
}

/* ---------- movement and the turn clock ---------- */
/** Moves the player inside an interior (cottage, healer, shop, hall...). */
function enterRoom(id){S.pos={room:id,x:5,y:ROOMS[roomKind(id)].length-2};S.ents=[];S.arm=null;S.boating=false;}
/** Returns the player outside the door of the current interior. */
function exitRoom(){const [dx,dy]=doorPos(S.pos.room);S.pos={room:null,x:dx,y:dy+1};S.arm=null;reveal();}
/** Marks tiles around the player as explored for the world map. */
function reveal(){
  const px=S.pos.x,py=S.pos.y;
  for(let y=py-7;y<=py+7;y++)for(let x=px-7;x<=px+7;x++)if(inb(x,y)&&(x-px)*(x-px)+(y-py)*(y-py)<=49)S.vis[y*W+x]=1;
}
/** Moves the player by (dx,dy): collision, boats, doors, signs, NPC/lair/shrine bumping, encounters, then end of turn. */
function move(dx,dy){
  S.face={x:dx,y:dy};S.arm=null;
  const nx=S.pos.x+dx,ny=S.pos.y+dy;
  if(S.pos.room){
    const ch=roomCh(S.pos.room,nx,ny);
    if(ch===undefined){render();return;}
    if(ch==='D'){exitRoom();endTurn();return;}
    if(roomBlocked(ch)){render();return;}
    S.pos.x=nx;S.pos.y=ny;endTurn();return;
  }
  if(!inb(nx,ny)){render();return;}
  const e=entAt(nx,ny);
  if(e){engage(e,false);return;}
  const nid=npcAt(nx,ny);
  if(nid){talkTo(nid);return;}
  const t=TILES[ny*W+nx];
  if(t===TL.WATER){
    if(!S.boating){
      if(!S.items.boat){hint('Deep water. You would need a boat to cross it.');render();return;}
      S.boating=true;log('You unfold your skiff and push off.','info');
    }
  }else{
    if(BLK[t]){render();return;}
    if(S.boating){S.boating=false;log('You fold the skiff away and step ashore.','info');}
  }
  S.pos.x=nx;S.pos.y=ny;S.steps++;reveal();
  if(S.boating&&t===TL.WATER)qSail();
  qVisit();
  if(t===TL.DOOR){enterRoom(DOORS[nx+','+ny]);endTurn();return;}
  const zk=zoneKeyAt(nx,ny);
  if(t===TL.TALL&&!ZN[zk].safe&&S.cool<=0&&Math.random()<.10*(1-fx('hush'))){
    const f=wildFor(zk);
    if(f&&ambushOK(f)){log('The undergrowth rustles. Something was waiting for you.','bad');startBattle(f,{ambush:true,zone:zk});return;}
  }
  if(t===TL.WATER&&!ZN[zk].safe&&S.cool<=0&&Math.random()<.09*(1-fx('hush'))){
    const f=wildFor(zk,true);
    if(f&&ambushOK(f)){log('The water churns. Something was waiting beneath the surface.','bad');startBattle(f,{ambush:true,zone:zk});return;}
  }
  endTurn();
}
/** Advances time one turn: entity AI, regeneration, day/night, cooldowns. */
function endTurn(){
  S.turn++;
  if(S.turn%(fx('regen')?4:12)===0&&S.hp<pMax(S.lvl))S.hp++;
  if(S.cool>0)S.cool--;
  if(S.mode==='world')tickEnts();
  render();
}
/* Land and water beasts come from separate pools: water=true picks an aquatic species for the zone's waters. */
/* Creatures that would be trivial for you no longer jump you, unless you have never met their kind. */
const ambushOK=f=>!f||!S.seen[f.sp]||foeLevelDiff(f)>-6;
const foeLevelDiff=f=>f.lvl-S.lvl;
/** Picks a wild species and level for a zone: honours water vs land lists, level range, evolved forms by level, elder variants and night-only species. */
function wildFor(zk,water,lvlBonus){
  /* Gloom beasts only come out at night. */
  const z=ZN[zk],all=WILDBY[zk+'|'+(water?'w':'l')],night=isNight(),pool=all&&all.filter(e=>night||SP[e.id].t!=='Gloom');
  if(!pool||!pool.length)return null;
  let tot=0;for(const e of pool)tot+=e.w;
  let x=Math.random()*tot,id=pool[0].id;
  for(const e of pool){x-=e.w;if(x<=0){id=e.id;break;}}
  let l=rand(z.lv[0],z.lv[1]);if(Math.random()<.12)l++;l+=(lvlBonus||0);
  /* Wild beasts are shown in the form their level calls for, so evolved forms roam the higher lands. Now and then a
     beast a few levels short of evolving turns up already grown ("elder"), at the level it evolves. */
  const base=id;let sp=SP[id];
  while(sp.evo&&l>=sp.evo[0])sp=SP[sp.evo[1]];
  if(sp.evo&&sp.evo[0]-l<=5&&Math.random()<.3){l=sp.evo[0];sp=SP[sp.evo[1]];}
  if(!night&&sp.t==='Gloom'&&SP[base].t!=='Gloom'){sp=SP[base];}
  return mkFoe(sp.id,l,false);
}
/** Builds a foe object for species `id` at level `l` (`elite` = alpha). */
function mkFoe(id,l,elite){const st=cstat(id,l,elite);return{sp:id,lvl:l,elite:!!elite,hp:st.hp,max:st.hp,atk:st.atk,def:st.def,spd:st.spd};}
const foeName=f=>(f.elite?'Alpha ':'')+SP[f.sp].n;
/* Creatures never enter towns, never leave the zone they spawned in, and aquatic ones never leave the water. */
/** True if a wandering entity may step on (x,y). */
function entPassable(x,y,self,aq){
  if(!inb(x,y))return false;
  const t=TILES[y*W+x],water=self?self.aq:aq;
  if(water){if(t!==TL.WATER)return false;}else if(BLK[t])return false;
  const zk=zoneKeyAt(x,y);
  if(ZN[zk].safe)return false;
  if(self&&self.home&&zk!==self.home)return false;
  if(S.pos.x===x&&S.pos.y===y)return false;
  if(NPCAT[x+','+y])return false;
  return !S.ents.some(o=>o!==self&&o.x===x&&o.y===y);
}
/** Spawns, moves and despawns wandering creatures; handles ambushes (gated by ambushOK). */
function tickEnts(){
  if(S.pos.room)return;
  const px=S.pos.x,py=S.pos.y,safeP=isSafe();
  const night=isNight();
  S.ents=S.ents.filter(e=>Math.abs(e.x-px)+Math.abs(e.y-py)<=22&&(night||SP[e.sp].t!=='Gloom'));
  for(const e of S.ents.slice()){
    if(e.stun>0){e.stun--;continue;}
    const sp=SP[e.sp],d=Math.abs(e.x-px)+Math.abs(e.y-py);
    let mx=0,my=0,chase=false;
    if(sp.tp===2&&d<=5&&!safeP&&(e.lvl>S.lvl-6||!S.seen[e.sp])&&Math.random()<.78){
      chase=true;const dx=px-e.x,dy=py-e.y;
      if(Math.abs(dx)>=Math.abs(dy)){mx=Math.sign(dx);if(!mx||!entPassable(e.x+mx,e.y,e)&&!(e.x+mx===px&&e.y===py)){mx=0;my=Math.sign(dy);}}
      else{my=Math.sign(dy);if(!my||!entPassable(e.x,e.y+my,e)&&!(e.x===px&&e.y+my===py)){my=0;mx=Math.sign(dx);}}
    }else if(sp.tp===0&&d<=4&&Math.random()<.7){
      const dx=e.x-px,dy=e.y-py;if(Math.abs(dx)>=Math.abs(dy))mx=Math.sign(dx)||1;else my=Math.sign(dy)||1;
    }else if(Math.random()<.45){const m=pick(D4);mx=m[0];my=m[1];}
    if(!mx&&!my)continue;
    const nx=e.x+mx,ny=e.y+my;
    /* A creature may still strike you when you stand next to it, even across a zone border. */
    if(chase&&nx===px&&ny===py){
      log(`A level ${e.lvl} ${SP[e.sp].n} ${e.aq?'surges at you':'springs at you'}.`,'bad');
      startBattle(entFoe(e),{ambush:true,ent:e,zone:zoneKeyAt(e.x,e.y)});return;
    }
    if(entPassable(nx,ny,e)){e.x=nx;e.y=ny;}
  }
  if(S.ents.length<4&&Math.random()<.14){
    for(let a=0;a<12;a++){
      const x=px+rand(-9,9),y=py+rand(-9,9);
      if(Math.abs(x-px)+Math.abs(y-py)<6||!inb(x,y))continue;
      const aq=TILES[y*W+x]===TL.WATER;
      if(!entPassable(x,y,null,aq))continue;
      const zk=zoneKeyAt(x,y),f=wildFor(zk,aq);
      if(!f)continue;
      S.ents.push({sp:f.sp,lvl:f.lvl,x,y,stun:0,home:zk,aq});break;
    }
  }
}
const entFoe=e=>mkFoe(e.sp,e.lvl,false);
/** Starts a battle with entity `e`; `ambush` gives the foe the first strike. */
function engage(e,ambush){
  startBattle(entFoe(e),{ambush:!!ambush,ent:e,zone:zoneKeyAt(e.x,e.y)});
}

/* ---------- interaction ---------- */
/** Handles the interact key against the tile or NPC the player faces. */
function interact(){
  const {x,y}=S.pos,f=S.face;
  const cand=[[x+f.x,y+f.y],[x,y-1],[x,y+1],[x-1,y],[x+1,y]];
  for(const [cx,cy] of cand){
    if(S.pos.room){
      const ch=roomCh(S.pos.room,cx,cy);
      if(ch==='N'){npcTalk();return;}
      if(ch==='B'){restAtBed();return;}
    }else{
      if(!inb(cx,cy))continue;
      const e=entAt(cx,cy);if(e){engage(e,false);return;}
      const nid=npcAt(cx,cy);if(nid){talkTo(nid);return;}
      const t=TILES[cy*W+cx];
      if(t===TL.BENCH){S.panel='forge';UI.ftab='ring';UI.sel=0;render();return;}
      if(t===TL.SIGN){readSign(cx,cy);return;}
      if(t===TL.LAIR){lairAction(cx,cy);return;}
      if(t===TL.SHRINE){shrineAction(cx,cy);return;}
    }
  }
  log('There is nothing to use here.','info');render();
}
/** Shows the sign text at (x,y). */
function readSign(x,y){
  S.sign=SIGNS[x+','+y];S.panel='sign';UI.sel=0;render();
}
/** Fully heals player and companions. */
function healAll(){
  S.hp=pMax(S.lvl);for(const c of S.cr)c.hp=cmax(c);
  S.haven={room:S.pos.room,x:S.pos.x,y:S.pos.y};
}
/** Rests at a bed: heals and advances time. */
function restAtBed(){
  healAll();saveGame(true);
  log('You rest on the bed. You and your companions are fully healed, and your progress is saved.','good');render();
}
/** Opens dialogue with the adjacent NPC. */
function npcTalk(){
  const k=roomKind(S.pos.room);
  if(k==='cottage'){
    if(!S.met){
      S.met=true;S.items.cord+=5;S.items.salve+=3;
      log('Marra: "Awake at last. I found you face down in the Greenmoor reeds with a hunting knife and no name."','info');
      log('Marra: "Take these. A hemp cord binds a beast to you, but only once you have worn it down. Hurt it first, then throw the cord from the Bind menu."','info');
      log('You receive 5 Hemp Cords and 3 Herbal Salves.','loot');
      log('Marra: "Mind the tall grass outside the walls. Nothing can touch you in Thistledown, and the bed here is yours whenever you need it."','info');
      talkTo('marra');return;
    }
    talkTo('marra');
  }else if(k==='healer'){
    healAll();saveGame(true);
    log('The healer tends your wounds and those of your companions. Everyone is fully healed. Progress saved.','good');render();
  }else if(k==='hall'){
    openHall();
  }else{
    const T=TOWNS.find(t=>t.id===zoneKey());S.shop=T.stock;S.panel='shop';render();
  }
}
/** Challenges the legendary at a lair at (x,y) if requirements are met. */
function lairAction(x,y){
  const L=LAIRS.find(l=>l.x===x&&l.y===y),key=x+','+y;
  if(S.lairs[key]!==undefined&&S.turn-S.lairs[key]<480){log('The lair is empty for now. Something will return.','info');render();return;}
  if(SP[L.sp].t==='Gloom'&&!isNight()){log('The lair is silent. Whatever dwells here only stirs after dark.','info');render();return;}
  const lvl=ZN[L.z].lv[1]+3;
  if(!S.arm||S.arm!==key){
    S.arm=key;
    const dg=danger(lvl,S.lvl);
    log(`A level ${lvl} Alpha ${SP[L.sp].n} dwells in this lair (${dg.n} for you). Press E again to challenge it.`,'bad');render();return;
  }
  S.arm=null;
  startBattle(mkFoe(L.sp,lvl,true),{ambush:false,lair:key,zone:L.z});
}
/** Uses the shrine altar at (x,y): relic offering, blessing. */
function shrineAction(x,y){
  const h=SHRINES.find(s=>s.x===x&&s.y===y);if(!h)return;
  const key='shrine:'+h.id,st=S.shrines[h.id]||(S.shrines[h.id]={});
  if(st.done){log('The altar is quiet. Whatever slept here left with you.','info');render();return;}
  if(!h.need.every(r=>S.relics[r]>0)){log(`${h.n}. ${h.need.length} hollows are carved into the stone, shaped for things you do not hold.`,'info');render();return;}
  if(S.lairs[key]!==undefined&&S.turn-S.lairs[key]<480){log('The altar is still. Whatever answered has withdrawn for now. Come back later.','info');render();return;}
  if(S.arm!==key){S.arm=key;log('Your relics hum and slip into the hollows on their own. Something huge stirs below. Press E again to wake it, or walk away.','bad');render();return;}
  S.arm=null;
  log(`${SP[h.sp].n} rises from the stone.`,'bad');
  startBattle(mkFoe(h.sp,h.lvl,false),{ambush:false,lair:key,zone:h.zone});
}
/** Camps in the wild: partial heal at the cost of time and ambush risk. */
function campOut(){
  if(isSafe()){log('You are safe within these walls. Rest on a bed to heal and save.','info');render();return;}
  if(S.boating){log('You cannot camp on open water. Come ashore first.','info');render();return;}
  S.turn+=8;
  S.hp=Math.min(pMax(S.lvl),S.hp+Math.ceil(pMax(S.lvl)*.4));
  for(const c of party())c.hp=Math.min(cmax(c),c.hp+Math.ceil(cmax(c)*.4));
  const zk=zoneKeyAt(S.pos.x,S.pos.y);
  if(Math.random()<.35*(1-fx('hush'))){{const f=wildFor(zk);if(f&&ambushOK(f)){log('You camp, but something finds you in the dark.','bad');startBattle(f,{ambush:true,zone:zk});return;}}}
  log('You camp for a while and recover about two fifths of your health. Camping outside the walls is a gamble.','info');
  tickEnts();render();
}
/* slot is 'you' or an index into party(). Returns true when an item was used. */
/** Uses a pack item (`kind`) on party slot `slot`. */
function usePack(kind,slot){
  if(kind==='salve'){
    if(S.items.salve<1){log('You have no salves left.','info');return false;}
    if(slot==='you'){
      if(S.hp>=pMax(S.lvl)){log('You are already at full health.','info');return false;}
      S.items.salve--;const h=Math.max(20,Math.ceil(pMax(S.lvl)/3));S.hp=Math.min(pMax(S.lvl),S.hp+h);log(`You apply a salve and recover ${h} HP.`,'good');return true;
    }
    const c=party()[slot];
    if(!c){log('There is no companion in that slot.','info');return false;}
    if(c.hp<=0){log(`${nm(c)} has fainted. A salve will not wake it. Use a revive tonic.`,'info');return false;}
    if(c.hp>=cmax(c)){log(`${nm(c)} is already at full health.`,'info');return false;}
    S.items.salve--;const h=Math.max(20,Math.ceil(cmax(c)/3));c.hp=Math.min(cmax(c),c.hp+h);log(`${nm(c)} recovers ${h} HP.`,'good');return true;
  }
  if(kind==='tonic'){
    if(S.items.tonic<1){log('You have no revive tonics left.','info');return false;}
    const c=party()[slot];
    if(!c){log('There is no companion in that slot.','info');return false;}
    if(c.hp>0){log(`${nm(c)} has not fainted.`,'info');return false;}
    S.items.tonic--;c.hp=Math.ceil(cmax(c)/2);log(`${nm(c)} wakes with new strength.`,'good');return true;
  }
  return false;
}

/* ---------- battle ---------- */
/** Creates battle state `B` against foe `f` with options `o` and switches mode. */
function startBattle(f,o){
  S.battle={foe:f,sub:null,guard:false,over:false,cd:{},ent:o.ent||null,lair:o.lair||null,zone:o.zone||zoneKey()};
  S.mode='battle';S.panel=null;S.seen[f.sp]=1;UI.tonic=false;qLive();
  setLock(LOCK_START);UI.noRepeat=true;
  if(!o.ambush)log(`You face a level ${f.lvl} ${foeName(f)}.`,'bad');
  if(o.ambush){foeAct();if(S.hp<=0){die();return;}S.battle.guard=false;}
  render();
}
/** The foe takes its turn in a battle. */
function foeAct(){
  const B=S.battle,f=B.foe,sp=SP[f.sp],c=lead(),you=!c||Math.random()<.28;
  const mvs=movesFor(sp,f.lvl),ttype=you?'Plain':SP[c.sp].t;
  let mv;
  if(f.hp<f.max*.35&&mvs.some(m=>m.heal)&&Math.random()<.35)mv=mvs.find(m=>m.heal);
  else{
    const att=mvs.filter(m=>!m.heal),w=att.map(m=>1+(tmult(m.t,ttype)>1?1.5:0));
    let t=w.reduce((a,b)=>a+b,0)*Math.random();mv=att[0];
    for(let i=0;i<att.length;i++){t-=w[i];if(t<=0){mv=att[i];break;}}
  }
  const fn=foeName(f),pw=f.elite?ALPHA_PWR:1;
  if(mv.heal){const h=Math.ceil(f.max*mv.heal);f.hp=Math.min(f.max,f.hp+h);log(`${fn} uses Mend and recovers ${h} HP.`,'info');return;}
  if(you){
    let d=dmgCalc(f.lvl,mv.p*pw,f.atk,pDef(S.lvl),1);
    d=Math.max(1,Math.floor(d*(1-fx('guard'))));
    if(B.guard)d=Math.ceil(d/2);
    S.hp=Math.max(0,S.hp-d);log(`${fn} uses ${mv.n} on you for ${d} damage${B.guard?' (guarded)':''}.`,'bad');
  }else{
    const m=tmult(mv.t,ttype),d=dmgCalc(f.lvl,mv.p*pw,f.atk,cs(c).def,m);
    c.hp=Math.max(0,c.hp-d);log(`${fn} uses ${mv.n} on ${nm(c)} for ${d} damage.${effText(m)}`,'bad');
    if(c.hp<=0)log(`${nm(c)} collapses.`,'bad');
  }
}
/** Cleans up temporary battle effects and returns to the map. */
function battleDone(){if(S.rage>0)S.rage--;for(const c of S.cr)if(c.rage>0)c.rage--;S.battle=null;S.mode='world';S.cool=4;setLock(LOCK_END);UI.noRepeat=true;UI.tonic=false;render();}
/** Reduces all move cooldowns of a battle by one. */
function tickCd(B){for(const k in B.cd)if(B.cd[k]>0)B.cd[k]--;}
/** Executes a player battle action (`kind` strike/command/bind/run/...). */
function bAct(kind,arg){
  const B=S.battle;if(!B||B.over)return;
  const f=B.foe,c=lead();let used=true;
  if(kind==='move'){
    if(!c)return;const mv=movesFor(SP[c.sp],c.lvl)[arg];if(!mv)return;
    const key=cdKey(c,mv);
    if((B.cd[key]||0)>0){log(`${mv.n} is still recharging.`,'info');render();return;}
    if(mv.heal){const h=Math.ceil(cmax(c)*mv.heal);c.hp=Math.min(cmax(c),c.hp+h);log(`${nm(c)} uses Mend and recovers ${h} HP.`,'good');}
    else{
      const m=tmult(mv.t,SP[f.sp].t),P=mv.p*(c.alpha?ALPHA_PWR:1);
      const d=dmgCalc(c.lvl,P,cs(c).atk,f.def,m*bondMult()*rageC(c));
      f.hp=Math.max(0,f.hp-d);log(`${nm(c)} uses ${mv.n} for ${d} damage.${effText(m)}`,'good');
    }
    const cd=moveCd(mv);if(cd>0)B.cd[key]=cd+1;
  }else if(kind==='strike'){
    let d=dmgCalc(S.lvl,35,pAtk(S.lvl),f.def,(1+fx('strike'))*(S.rage>0?1.3:1));const crit=Math.random()<.08;if(crit)d=Math.floor(d*1.5);
    f.hp=Math.max(0,f.hp-d);log(`You strike with your knife for ${d} damage${crit?' (critical)':''}.`,'good');
  }else if(kind==='guard'){B.guard=true;log('You brace yourself. Incoming blows against you are halved this turn.','info');}
  else if(kind==='bind')used=tryBind(arg);
  else if(kind==='heal'){used=!!arg&&usePack(arg.item,arg.slot);}
  else if(kind==='swap'){
    const p=party()[arg];if(!p||p.hp<=0||p===c)return;
    S.cr.splice(S.cr.indexOf(p),1);S.cr.unshift(p);log(`${nm(p)} steps forward.`,'info');
  }else if(kind==='run')used=tryRun();
  if(!used){render();return;}
  B.sub=null;UI.tonic=false;
  if(B.over){return;}
  if(f.hp<=0){victory();return;}
  foeAct();
  if(S.hp<=0){die();return;}
  B.guard=false;tickCd(B);render();
}
/** XP value of a foe. */
function foeXp(f){
  const mult=clamp(1+0.12*(f.lvl-S.lvl),.1,2);
  return Math.max(1,Math.floor((8*f.lvl+12)*mult*(f.elite?3:1)));
}
/** Awards XP, gold, loot and materials for a victory, split by `share`. */
function rewards(f,share){
  const xp=Math.max(1,Math.floor(foeXp(f)*share*(1+fx('xp')))),pl=S.lvl;
  addXpPlayer(xp);
  const act=lead();
  /* Companions below your level earn bonus XP: +25% per level behind, up to double. */
  for(const c of party()){if(c.hp>0){const base=c===act?xp:Math.ceil(xp/2);addXpC(c,Math.ceil(base*catchUp(c,pl)));}}
  const g=Math.floor((Math.floor(f.lvl*(2+Math.random()*3))*(f.elite?3:1)+1)*(1+fx('gold')));
  S.gold+=g;log(`You gain ${xp} experience and ${g} gold.`,'loot');
  if(Math.random()<(f.elite?1:.12)){const k=f.elite?'silver':'cord';S.items[k]++;log(`You find a ${IT[k].n}.`,'loot');}
  if(Math.random()<.07){S.items.salve++;log('You find an Herbal Salve.','loot');}
  lootMats(f);
}
/** Processes a won battle: rewards, quest events, evolution checks. */
function victory(){
  const B=S.battle,f=B.foe;B.over=true;S.kills++;
  log(`The ${foeName(f)} is defeated.`,'good');rewards(f,1);qEvent('kill',f,B.zone);
  if(B.ent)S.ents=S.ents.filter(e=>e!==B.ent);
  if(B.lair)S.lairs[B.lair]=S.turn;
  battleDone();
}
/** Probability that binding item `item` succeeds on the current foe. */
function bindChance(item){
  const f=S.battle.foe,sp=SP[f.sp];
  const base=sp.c*(f.elite?.6:1)*(1.15-.85*(f.hp/f.max))*IT[item].p*clamp(1-.06*(f.lvl-S.lvl),.35,1.15);
  return clamp(base*(1+fx('bind'))*(S.musk>0?1.4:1),.02,.95);
}
/** Attempts to bind (capture) the foe with `item`. */
function tryBind(item){
  if(!IT[item]||!IT[item].p||S.items[item]<1)return false;
  const B=S.battle,f=B.foe;S.items[item]--;
  log(`You hurl a ${IT[item].n} at the ${foeName(f)}.`,'info');
  const held=Math.random()<bindChance(item);
  if(S.musk>0)S.musk--;
  if(held){
    const c={id:S.uid++,sp:f.sp,lvl:f.lvl,xp:0,hp:1,p:party().length<4,alpha:!!f.elite};
    c.hp=Math.max(1,Math.round(cmax(c)*(f.hp/f.max)));
    S.cr.push(c);S.caught[f.sp]=(S.caught[f.sp]||0)+1;
    log(`The cord holds. ${f.elite?'Alpha ':''}${SP[f.sp].n} is now bound to you${c.p?'.':' and waits in the stable.'}`,'good');
    B.over=true;rewards(f,.5);qEvent('bind',f,B.zone);qLive();
    if(B.lair&&B.lair.indexOf('shrine:')===0){
      const h=SHB[B.lair.slice(7)];for(const r of h.need)S.relics[r]--;
      S.shrines[h.id]={done:1,known:1};log('The relics crumble to dust in your pack. The altar goes quiet.','good');
    }
    if(B.ent)S.ents=S.ents.filter(e=>e!==B.ent);
    if(B.lair)S.lairs[B.lair]=S.turn;
    battleDone();return true;
  }
  log('The cord snaps loose. The beast is still free.','bad');return true;
}
/** Attempts to flee the battle. */
function tryRun(){
  const B=S.battle,f=B.foe;
  const ch=clamp(.5+(S.lvl-f.lvl)*.08+fx('flee'),.15,.95);
  if(Math.random()<ch){
    log('You break away and escape.','info');B.over=true;
    if(B.ent){B.ent.stun=6;S.ents=S.ents.filter(e=>e!==B.ent);}
    battleDone();return true;
  }
  log('You cannot get away.','bad');return true;
}
/** Handles the player being knocked out. */
function die(){
  const B=S.battle,f=B?B.foe:null;
  const cause=f?`Slain by a level ${f.lvl} ${foeName(f)} in ${ZN[B.zone].n}.`:'You did not survive.';
  S.dead={cause};S.mode='dead';S.battle=null;S.panel=null;
  if(S.hard)wipeSave();
  render();
}
/** Returns the player to the last healer with a penalty. */
function respawn(){
  S.gold=Math.floor(S.gold*.75);S.hp=pMax(S.lvl);
  for(const c of S.cr)c.hp=Math.max(1,Math.ceil(cmax(c)*.5));
  const h=S.haven;S.pos={room:h.room,x:h.x,y:h.y};S.ents=[];S.dead=null;S.mode='world';S.cool=4;S.boating=false;
  log('You wake at your last resting place, shaken. A quarter of your gold is gone, and your companions are only half healed.','bad');
  render();
}

/* ---------- materials, recipes, rings and potions ---------- */
/** Adds materials to the inventory. */
function giveMats(m){
  for(const id in m){S.mats[id]=(S.mats[id]||0)+m[id];log(`You receive ${MATS[id].n}${m[id]>1?' ×'+m[id]:''}.`,'loot');}
  checkRecipes();
}
/** True when the inventory holds every material in `need`. */
function hasAll(need){for(const id in need)if((S.mats[id]||0)<need[id])return false;return true;}
/* A formula reveals itself only once you hold every ingredient it calls for. */
/** Unlocks recipes whose ingredients are all held. */
function checkRecipes(){
  for(const r of RECIPES){
    if(S.recipes[r.id]||!hasAll(r.need))continue;
    S.recipes[r.id]=1;
    log(`Recipe unlocked: ${r.n}. Make it at a work table in any town.`,'good');
  }
}
/** Rolls material drops for foe `f` from the zone DROPS table. */
function lootMats(f){
  const B=S.battle,tbl=B&&DROPS[B.zone];if(!tbl)return;
  const ids=Object.keys(tbl),tot=ids.reduce((a,k)=>a+tbl[k],0);
  const rolls=f.elite?2:(Math.random()<.10*(1+fx('forage'))?1:0);
  for(let r=0;r<rolls;r++){
    let x=Math.random()*tot,id=ids[0];
    for(const k of ids){x-=tbl[k];if(x<=0){id=k;break;}}
    giveMats({[id]:1});
  }
}
/** Crafts recipe `id` (ring or potion) if affordable. */
function craft(id){
  const r=RC[id];if(!r||!S.recipes[id])return false;
  if(r.kind==='ring'&&S.rings[id]){log(`You already forged the ${r.n}.`,'info');return false;}
  if(!hasAll(r.need)){log('You are missing ingredients.','bad');return false;}
  for(const k in r.need)S.mats[k]-=r.need[k];
  if(r.kind==='ring'){S.rings[id]=1;log(`You forge the ${r.n}. Put it on from Gear (G).`,'good');}
  else{S.pot[id]=(S.pot[id]||0)+1;log(`You brew a ${r.n}. Use it from Gear (G).`,'good');}
  return true;
}
/** Equips or unequips ring `id` (limited slots). */
function toggleRing(id){
  if(!S.rings[id])return;
  const i=S.equip.indexOf(id);
  if(i>=0){S.equip.splice(i,1);log(`You take off the ${RC[id].n}.`,'info');}
  else if(S.equip.length>=2){log('You can wear two rings at most. Take one off first.','bad');return;}
  else{S.equip.push(id);log(`You put on the ${RC[id].n}.`,'good');}
  S.hp=Math.min(S.hp,pMax(S.lvl));
}
/* slot is 'you' or an index into party(). */
/** Drinks potion `id` on party slot `slot`. */
function usePotion(id,slot){
  const r=RC[id];if(!r||!(S.pot[id]>0))return false;
  const you=slot==='you',c=you?null:party()[slot];
  if(!you&&!c){log('There is no companion in that slot.','info');return false;}
  const who=you?'You':nm(c),k=r.pot;
  if(k==='heal'){
    if(you){if(S.hp>=pMax(S.lvl)){log('You are already at full health.','info');return false;}S.hp=pMax(S.lvl);}
    else{
      if(c.hp<=0){log(`${nm(c)} has fainted. Use a Phoenix Philter or a revive tonic.`,'info');return false;}
      if(c.hp>=cmax(c)){log(`${nm(c)} is already at full health.`,'info');return false;}
      c.hp=cmax(c);
    }
    log(`${who} drink${you?'':'s'} a Sunroot Draught and ${you?'are':'is'} fully healed.`,'good');
  }else if(k==='revive'){
    if(you||c.hp>0){log('That only works on a fainted companion.','info');return false;}
    c.hp=cmax(c);log(`${nm(c)} rises, bright-eyed, at full health.`,'good');
  }else if(k==='hp'||k==='atk'||k==='def'){
    const tgt=you?S.bonus:(c.bonus||(c.bonus={})),tag='p_'+k;
    if(tgt[tag]){log(`${who} ${you?'have':'has'} already benefited from that.`,'info');return false;}
    const before=you?pMax(S.lvl):cmax(c);
    tgt[k]=(tgt[k]||0)+.08;tgt[tag]=1;
    const after=you?pMax(S.lvl):cmax(c);
    if(k==='hp'){if(you)S.hp+=after-before;else if(c.hp>0)c.hp+=after-before;}
    log(`${who} ${you?'feel':'looks'} ${k==='hp'?'sturdier':k==='atk'?'fiercer':'tougher'} for good.`,'good');
  }else if(k==='rage'){
    if(you)S.rage=3;else c.rage=3;
    log(`${who} ${you?'burn':'burns'} with fury. Damage is up 30% for the next 3 fights.`,'good');
  }else if(k==='growth'){
    if(you)addXpPlayer(Math.floor(needP(S.lvl)*.5));else addXpC(c,Math.floor(needC(c.lvl)*.6));
    log(`${who} ${you?'feel':'looks'} wiser.`,'good');
  }else if(k==='musk'){
    if(!you){log('The musk is for you to drink. The beasts would only be insulted.','info');return false;}
    S.musk=3;log('You smell like an old friend to every beast in the wild. Your next 3 bind attempts are likelier to hold.','good');
  }
  S.pot[id]--;return true;
}

/* ---------- quests ---------- */
const npcAt=(x,y)=>NPCAT[x+','+y]||null;
/** Required count for a quest objective. */
function objNeed(o){return o.t==='visit'?1:(o.n||1);}
/** Current progress of objective `i` of quest `q`. */
function objHave(q,i){
  const o=q.obj[i],st=S.q[q.id];
  if(o.t==='seen')return Object.keys(S.seen).length;
  if(o.t==='caught')return Object.keys(S.caught).filter(k=>S.caught[k]>0).length;
  return st?(st.p[i]||0):0;
}
const objDone=(q,i)=>objHave(q,i)>=objNeed(q.obj[i]);
const qComplete=q=>q.obj.every((o,i)=>objDone(q,i));
const qAvail=q=>!S.q[q.id]&&(!q.after||(S.q[q.after]&&S.q[q.after].st==='done'));
const qOpen=q=>qAvail(q)&&S.lvl>=(q.min||1);
const qActive=q=>S.q[q.id]&&S.q[q.id].st==='active';
/** Logs progress when a quest objective changes. */
function qNotify(q){
  const st=S.q[q.id];
  if(st&&st.st==='active'&&!st.r&&qComplete(q)){st.r=1;const id=q.turnin||q.giver;log(`Quest ready: ${q.title}. Hand it in to ${NPCS[id].n} (${NPCS[id].place}).`,'good');}
}
/** True when a battle/event matches objective `o`. */
function qMatch(o,f,zone){
  if(o.sp&&![].concat(o.sp).includes(f.sp))return false;
  if(o.zone&&![].concat(o.zone).includes(zone))return false;
  if(o.aq!=null&&!!SP[f.sp].aq!==o.aq)return false;
  if(o.elite&&!f.elite)return false;
  if(o.minLvl&&f.lvl<o.minLvl)return false;
  return true;
}
/** Feeds a game event (kill, item, bind...) into all active quests. */
function qEvent(mode,f,zone){
  for(const q of QUESTS){
    if(!qActive(q))continue;const st=S.q[q.id];
    q.obj.forEach((o,i)=>{
      if(!qMatch(o,f,zone))return;
      if(o.t===mode&&st.p[i]<objNeed(o)){st.p[i]++;log(`Quest: ${q.title}. ${o.label} ${st.p[i]}/${objNeed(o)}.`,'info');}
      else if(o.t==='item'&&st.p[i]<o.n&&Math.random()<o.chance*(mode==='kill'?1:.6)){st.p[i]++;log(`You find: ${o.name} (${st.p[i]}/${o.n}).`,'loot');}
    });
    qNotify(q);
  }
}
/** Re-evaluates live objectives (seen/caught counts). */
function qLive(){for(const q of QUESTS)if(qActive(q)&&q.obj.some(o=>o.t==='seen'||o.t==='caught'))qNotify(q);}
/** Completes visit objectives when the player stands on the target. */
function qVisit(){
  if(S.pos.room)return;
  const zk=zoneKeyAt(S.pos.x,S.pos.y);
  for(const q of QUESTS){
    if(!qActive(q))continue;const st=S.q[q.id];
    q.obj.forEach((o,i)=>{
      if(o.t!=='visit'||st.p[i]>=1)return;
      const hit=o.zone?zk===o.zone:Math.max(Math.abs(S.pos.x-o.x),Math.abs(S.pos.y-o.y))<=o.r;
      if(hit){st.p[i]=1;log(`Quest: ${q.title}. ${o.label}: done.`,'info');}
    });
    qNotify(q);
  }
}
/** Counts sailing progress for sail objectives. */
function qSail(){
  for(const q of QUESTS){
    if(!qActive(q))continue;const st=S.q[q.id];
    q.obj.forEach((o,i)=>{
      if(o.t!=='sail'||st.p[i]>=o.n)return;
      st.p[i]++;if(st.p[i]===o.n||st.p[i]%10===0)log(`Quest: ${q.title}. ${o.label} ${st.p[i]}/${o.n}.`,'info');
    });
    qNotify(q);
  }
}
/** Marks a quest as complete-ready. */
function qMark(id){
  let m='';
  for(const q of QUESTS){
    if(qActive(q)&&(q.turnin||q.giver)===id&&qComplete(q))return'?';
    if(q.giver===id&&qOpen(q))m='!';
  }
  return m;
}
/** Opens dialogue with NPC `id`: offers, progress or turn-in. */
function talkTo(id){
  const n=NPCS[id];S.metNpc[id]=1;
  const ready=QUESTS.find(q=>qActive(q)&&(q.turnin||q.giver)===id&&qComplete(q));
  let t;
  if(ready)t={mode:'turnin',qid:ready.id,text:ready.done};
  else{
    const act=QUESTS.find(q=>qActive(q)&&(q.giver===id||q.turnin===id));
    const open=QUESTS.find(q=>q.giver===id&&qOpen(q));
    if(open)t={mode:'offer',qid:open.id,text:open.ask};
    else if(act)t={mode:'remind',qid:act.id,text:act.prog};
    else{
      const low=QUESTS.find(q=>q.giver===id&&qAvail(q));
      t=low?{mode:'low',qid:low.id,text:`${n.low} (Needs level ${low.min}.)`}:{mode:'idle',qid:null,text:pick(n.idle)};
    }
  }
  t.npc=id;S.talk=t;S.panel='talk';S.arm=null;render();
}
/** Accepts quest `id`. */
function qAccept(id){
  const q=QB[id];if(!qAvail(q))return;
  S.q[id]={st:'active',p:q.obj.map(()=>0)};
  log(`Quest accepted: ${q.title}.`,'good');
  qVisit();qNotify(q);
}
/** Hands in quest `id` and pays the reward. */
function qTurnIn(id){
  const q=QB[id];if(!qActive(q)||!qComplete(q))return false;
  S.q[id].st='done';
  log(`Quest complete: ${q.title}.`,'good');
  log(`You gain ${q.xp} experience.`,'loot');addXpPlayer(q.xp);
  if(q.gold){S.gold+=q.gold;log(`You receive ${q.gold} gold.`,'loot');}
  for(const k in (q.items||{})){S.items[k]+=q.items[k];log(`You receive ${IT[k].n}${q.items[k]>1?' ×'+q.items[k]:''}.`,'loot');}
  if(q.mats)giveMats(q.mats);
  for(const k in (q.relics||{})){S.relics[k]=(S.relics[k]||0)+q.relics[k];log(`You receive a relic: ${RELICS[k]}.`,'loot');}
  if(q.reveal){S.shrines[q.reveal]=Object.assign(S.shrines[q.reveal]||{},{known:1});log(`You now know where ${SHB[q.reveal].n} stands. Mark it on your map.`,'good');}
  saveGame(true);
  return true;
}
