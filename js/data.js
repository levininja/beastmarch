/**
 * data.js — static game data and balance constants
 *
 * Load order: 1st. Defines the grid/world size constants, the type chart, move
 * table (MV), the 43 creature lines and 100 species (LINES, XZ), zone metadata
 * (ZN), towns, lairs, items and interior room layouts. Nothing here touches
 * the DOM or game state `S`. Note that LAIRS is extended with the outer-ring
 * lairs at the bottom of the lair section, already in final world coordinates.
 *
 * All files are classic scripts sharing one global scope (no modules); see README.
 */
'use strict';
/* The original 160x128 land sits in the middle of a larger map; an outer ring of high-level zones surrounds it. */
const OX=32,OY=24,W=160+OX*2,H=128+OY*2,COLS=15,ROWS=11,SAVE_KEY='beastmarch.save.v1',START=[80+OX,90+OY],VER=4;
const TYPE={Ember:['#D9562B','#FFFFFF'],Tide:['#2C86C4','#FFFFFF'],Gale:['#6FB0A6','#04201C'],Stone:['#8C7B64','#FFFFFF'],Bloom:['#4C9F4F','#FFFFFF'],Gloom:['#7B5CAA','#FFFFFF'],Frost:['#62B8D8','#032230'],Aether:['#D9A82B','#2A1D00'],Plain:['#8A8F8D','#FFFFFF']};
const STRONG={Ember:['Bloom','Frost'],Tide:['Ember','Stone'],Bloom:['Tide','Stone'],Stone:['Gale','Ember'],Gale:['Bloom','Gloom'],Gloom:['Aether','Gale'],Aether:['Gloom','Frost'],Frost:['Gale','Bloom']};
/** Type-effectiveness multiplier of attacking type `a` against defending type `d` (2, 1 or 0.5). */
function tmult(a,d){let m=1;if((STRONG[a]||[]).includes(d))m*=2;if((STRONG[d]||[]).includes(a))m*=.5;return m;}
/* Balance knobs */
const BOND=1.15;          // companions' moves deal this much more damage
const ALPHA_HP=1.35;      // alpha HP multiplier (foes and captured alphas)
const ALPHA_PWR=1.1;      // alpha move power multiplier
const LOCK_START=500;     // ms of ignored input when a fight begins
const LOCK_END=300;       // ms of ignored input when a fight ends
const CATCHUP_PER_LEVEL=.25,CATCHUP_MAX=2; // XP bonus for creatures below your level
const MV={
 Ember:[['Cinder Snap',40],['Flame Lash',60],['Pyre Burst',85]],
 Tide:[['Brine Spray',40],['Undertow',60],['Tidal Crush',85]],
 Gale:[['Gust Peck',40],['Cutting Wind',60],['Skyfall Dive',85]],
 Stone:[['Pebble Toss',40],['Rockslide',60],['Quake Stomp',85]],
 Bloom:[['Thorn Whip',40],['Spore Cloud',60],['Overgrowth',85]],
 Gloom:[['Shade Bite',40],['Night Claw',60],['Umbral Rend',85]],
 Frost:[['Rime Nip',40],['Ice Shard',60],['Whiteout',85]],
 Aether:[['Star Spark',40],['Halo Pulse',60],['Radiant Verdict',85]]};
/** Moves a species knows at level `l` (learned by level, last four kept). */
function movesFor(sp,l){
  const t=MV[sp.t];
  const m=[{n:t[0][0],p:t[0][1],t:sp.t},{n:'Rush',p:45,t:'Plain'}];
  if(l>=5)m.push({n:'Mend',p:0,t:'Plain',heal:.35});
  if(l>=9)m.push({n:t[1][0],p:t[1][1],t:sp.t});
  if(l>=17)m.push({n:t[2][0],p:t[2][1],t:sp.t});
  while(m.length>4){const i=m.findIndex(x=>x.n==='Rush');m.splice(i>=0?i:0,1);}
  return m;
}
/* Moves of power 70+ must rest between uses: floor((power - 55) / 15) turns. */
const moveCd=m=>m.heal?0:Math.max(0,Math.floor((m.p-55)/15));
/* Creature lines. Each line is a family that evolves (every creature belongs to one).
   i ids, n names, t types per stage, s stats [hp,atk,def,spd] for the first stages (later ones are derived), c bind rate, tp temper
   (0 skittish, 1 neutral, 2 hostile), z wild zones of the first form, r rarity (5 = legendary: found only through quests and shrines),
   aq aquatic, e evolution levels, a art: plan/base features/stage 2 additions/stage 3 additions. */
const RAR={1:{n:'Common',w:100,c:'#8A938F'},2:{n:'Uncommon',w:55,c:'#3F9A4A'},3:{n:'Rare',w:25,c:'#2C86C4'},4:{n:'Very rare',w:8,c:'#7B5CAA'},5:{n:'Legendary',w:0,c:'#D9A82B'}};
const LINES=[
 {i:['jackalope','jadehare'],n:['Jackalope','Jade Hare'],t:['Gale','Gale'],s:[[38,44,34,72]],c:.55,tp:0,z:['green'],r:1,e:[14],a:'quad/antlers/tail2,crest'},
 {i:['pooka','phouka','dullahan'],n:['Pooka','Phouka Trickster','Dullahan'],t:['Gloom','Gloom','Gloom'],s:[[42,48,38,62]],c:.5,tp:1,z:['green','wood','mire','gloam'],r:1,e:[20,30],a:'quad/fangs/mane,eyes3/flame'},
 {i:['cusith','gwyllgi'],n:['Cu Sith','Gwyllgi'],t:['Bloom','Bloom'],s:[[52,50,46,52]],c:.45,tp:1,z:['green','wood'],r:1,e:[16],a:'quad/tail2/mane,spikes'},
 {i:['kitsune','tamamo','kyubi'],n:['Kitsune','Tamamo','Kyubi'],t:['Ember','Aether','Aether'],s:[[46,52,40,66],[70,78,62,86]],c:.4,tp:1,z:['green','wood'],r:2,e:[16,28],a:'quad/tail2/tail4,crest/tail9,halo'},
 {i:['wolpertinger','skvader'],n:['Wolpertinger','Skvader'],t:['Stone','Stone'],s:[[44,46,48,58]],c:.5,tp:1,z:['green','dunes'],r:1,e:[15],a:'quad/horns,wings/mane'},
 {i:['barghest','shuck','annwn'],n:['Barghest','Black Shuck','Hound of Annwn'],t:['Gloom','Gloom','Gloom'],s:[[60,66,52,60],[88,96,74,84]],c:.35,tp:2,z:['wood','gloam'],r:2,e:[22,32],a:'quad/fangs,eyes3/spikes/flame'},
 {i:['hodag','hodagelder'],n:['Hodag','Hodag Elder'],t:['Bloom','Bloom'],s:[[66,68,60,46]],c:.33,tp:2,z:['wood','mire','gloam'],r:2,e:[21],a:'quad/spikes/horns,fangs'},
 {i:['whitehart','crownhart'],n:['White Hart','Crowned Hart'],t:['Aether','Aether'],s:[[64,60,58,78]],c:.16,tp:0,z:['wood'],r:4,e:[18],a:'quad/antlers/halo'},
 {i:['tatzel','lindworm'],n:['Tatzelwurm','Lindworm'],t:['Stone','Stone'],s:[[62,64,66,48]],c:.32,tp:1,z:['wood','crag','mire','dunes'],r:2,e:[20],a:'serpent/fangs/spikes'},
 {i:['peryton','skystag'],n:['Peryton','Sky Stag'],t:['Gale','Gale'],s:[[60,66,52,80]],c:.28,tp:2,z:['wood','gloam'],r:2,e:[18],a:'quad/antlers,wings/halo'},
 {i:['gryphling','griffin','gryphking'],n:['Gryphling','Griffin','Gryphon Sovereign'],t:['Gale','Gale','Gale'],s:[[58,66,54,76],[92,100,80,100]],c:.32,tp:1,z:['crag'],r:2,e:[20,30],a:'bird/crest/mane,fangs/halo'},
 {i:['cockatrice','basilisk','basilex'],n:['Cockatrice','Basilisk','Basilex'],t:['Stone','Stone','Stone'],s:[[60,70,58,60],[96,96,100,56]],c:.3,tp:2,z:['crag','dunes'],r:2,e:[19,29],a:'bird/crest,tail2/spikes/eyes3'},
 {i:['salamander','ifrit','efreet'],n:['Salamander','Ifrit','Efreet Sultan'],t:['Ember','Ember','Ember'],s:[[54,64,52,62]],c:.38,tp:1,z:['crag','dunes','cinder'],r:1,e:[24,34],a:'serpent/flame/fangs,spikes/crest,halo'},
 {i:['manticore','mantichora'],n:['Manticore','Mantichora'],t:['Ember','Ember'],s:[[72,80,62,60]],c:.24,tp:2,z:['crag','dunes'],r:3,e:[22],a:'quad/mane,tail2/wings,fangs'},
 {i:['wisp','corpsecandle'],n:["Will-o'-Wisp",'Corpse Candle'],t:['Aether','Aether'],s:[[38,60,34,94]],c:.3,tp:0,z:['mire','gloam'],r:3,e:[20],a:'wisp//eyes3'},
 {i:['fenrirpup','fenrir','garm'],n:['Fenrir Pup','Fenrir','Garm'],t:['Frost','Frost','Frost'],s:[[70,74,62,74],[108,112,90,98]],c:.28,tp:2,z:['frost'],r:2,e:[24,34],a:'quad/fangs/mane,spikes/halo'},
 {i:['yeti','migoi'],n:['Yeti','Migoi'],t:['Frost','Frost'],s:[[88,84,84,44]],c:.24,tp:2,z:['frost'],r:2,e:[24],a:'biped/fangs/horns,spikes'},
 {i:['thunderbird','wakinyan'],n:['Thunderbird','Wakinyan'],t:['Gale','Gale'],s:[[80,90,70,92]],c:.18,tp:1,z:['frost','drake'],r:3,e:[26],a:'bird/crest/halo,flame'},
 {i:['sleipnir','gullfaxi'],n:['Sleipnir','Gullfaxi'],t:['Frost','Aether'],s:[[86,82,78,110]],c:.12,tp:0,z:['frost'],r:4,e:[25],a:'quad/mane/tail2,halo'},
 {i:['wyvern','amphithere'],n:['Wyvern','Amphithere'],t:['Ember','Ember'],s:[[84,92,72,80]],c:.22,tp:2,z:['cinder','drake'],r:2,e:[27],a:'drake/horns/spikes,fangs'},
 {i:['phoenixchick','phoenix','fenghuang'],n:['Phoenix Chick','Phoenix','Fenghuang'],t:['Ember','Aether','Aether'],s:[[72,78,60,84],[104,110,86,106]],c:.14,tp:0,z:['cinder'],r:4,e:[26,36],a:'bird/flame/crest,halo/tail4'},
 {i:['cerberuspup','cerberus','gatewarden'],n:['Cerberus Pup','Cerberus','Gatewarden'],t:['Gloom','Gloom','Gloom'],s:[[86,94,76,76]],c:.2,tp:2,z:['cinder','gloam'],r:3,e:[25,35],a:'quad/eyes3/fangs,spikes/flame'},
 {i:['chimera','typhon'],n:['Chimera','Typhon'],t:['Ember','Gloom'],s:[[96,100,82,72]],c:.18,tp:2,z:['cinder','drake'],r:3,e:[28],a:'quad/mane,tail2/wings,spikes'},
 {i:['drake','wyrm','elderwyrm'],n:['Drake Whelp','Wyrm','Elder Wyrm'],t:['Ember','Ember','Ember'],s:[[100,106,88,78]],c:.12,tp:2,z:['drake'],r:3,e:[28,38],a:'drake/horns/spikes,fangs/crest,halo'},
 {i:['qilin','kirin'],n:['Qilin','Kirin'],t:['Aether','Aether'],s:[[104,96,96,100]],c:.08,tp:0,z:['drake'],r:4,e:[30],a:'quad/horns,mane/halo,flame'},
 {i:['roc','rukh'],n:['Roc','Rukh'],t:['Gale','Gale'],s:[[98,104,80,96]],c:.12,tp:2,z:['drake'],r:3,e:[30],a:'bird/crest/spikes,halo'},
 {i:['sphinxcub','sphinx'],n:['Sphinx Cub','Sphinx'],t:['Stone','Aether'],s:[[56,54,62,56]],c:.35,tp:1,z:['dunes'],r:3,e:[22],a:'quad/crest/wings,halo'},
 {i:['sandworm','olgoi'],n:['Sandworm','Olgoi-Khorkhoi'],t:['Stone','Gloom'],s:[[66,62,56,40]],c:.38,tp:2,z:['dunes'],r:2,e:[20],a:'serpent/fangs/spikes,crest'},
 {i:['beannighe','banshee'],n:['Bean-Nighe','Banshee'],t:['Gloom','Gloom'],s:[[50,48,40,66]],c:.4,tp:1,z:['gloam'],r:2,e:[24],a:'wisp/eyes3/frill'},
 {i:['redcap','bloodcap'],n:['Redcap','Bloodcap'],t:['Gloom','Gloom'],s:[[56,64,44,62]],c:.35,tp:2,z:['gloam'],r:2,e:[22],a:'biped/fangs/spikes,crest'},
 {i:['selkie','benvarrey','sedna'],n:['Selkie','Ben-Varrey','Sedna'],t:['Tide','Tide','Tide'],s:[[44,40,44,64]],c:.55,tp:0,z:['green','frost'],r:1,aq:1,e:[14,24],a:'fish/frill/crest/halo'},
 {i:['nixie','rusalka'],n:['Nixie','Rusalka'],t:['Tide','Tide'],s:[[46,50,38,70]],c:.45,tp:1,z:['green','wood','dunes'],r:1,aq:1,e:[16],a:'fish/frill/crest,halo'},
 {i:['kappa','suiko','suijin'],n:['Kappa','Suiko','Suijin'],t:['Tide','Tide','Tide'],s:[[64,60,76,52]],c:.34,tp:1,z:['wood','crag','mire'],r:1,aq:1,e:[17,27],a:'biped/shell/spikes,crest/halo'},
 {i:['bunyip','mamaragan'],n:['Bunyip','Mamaragan'],t:['Gloom','Gloom'],s:[[72,70,64,56]],c:.28,tp:2,z:['crag','mire','gloam'],r:2,aq:1,e:[22],a:'quad/fangs,fins/spikes,crest'},
 {i:['kelpie','nuck','hippocamp'],n:['Kelpie','Nuckelavee','Hippocamp'],t:['Tide','Gloom','Tide'],s:[[66,66,58,70],[100,104,84,80]],c:.3,tp:2,z:['mire','frost','gloam'],r:2,aq:1,e:[18,28],a:'quad/mane,fins/spikes,fangs/crest,halo'},
 {i:['hydrapup','hydra','lernaean'],n:['Hydra Hatchling','Hydra','Lernaean Terror'],t:['Tide','Tide','Tide'],s:[[74,72,66,52]],c:.22,tp:2,z:['mire','drake'],r:3,aq:1,e:[22,32],a:'serpent/fins/heads3/heads5'},
 {i:['leviathan','leviathanprime'],n:['Leviathan Spawn','Leviathan'],t:['Tide','Tide'],s:[[112,102,98,66]],c:.07,tp:2,z:['drake'],r:4,aq:1,e:[30],a:'serpent/fins/spikes,fangs'},
 {i:['surtling','surtr'],n:['Surtling','Surtr'],t:['Ember','Ember'],s:[[88,96,74,84],[118,132,96,100]],c:.12,tp:2,z:[],r:5,e:[32],a:'biped/flame,horns/crest,spikes'},
 {i:['ryujinspawn','ryujin'],n:['Ryujin Spawn','Ryujin'],t:['Tide','Tide'],s:[[96,88,86,80],[126,116,112,96]],c:.12,tp:2,z:[],r:5,aq:1,e:[32],a:'serpent/fins,horns/crest,halo'},
 {i:['nidhoggling','nidhogg'],n:['Nidhogg Wyrmling','Nidhogg'],t:['Gloom','Gloom'],s:[[92,98,80,76],[124,132,102,90]],c:.12,tp:2,z:[],r:5,e:[32],a:'serpent/fangs,eyes3/spikes,wings'},
 {i:['jotunling','jotun'],n:['Jotunling','Jotun'],t:['Frost','Frost'],s:[[100,92,90,64],[136,124,116,70]],c:.12,tp:2,z:[],r:5,e:[32],a:'biped/horns/spikes,crest'},
 {i:['behemothcalf','behemoth'],n:['Behemoth Calf','Behemoth'],t:['Stone','Stone'],s:[[110,90,104,50],[150,120,130,54]],c:.12,tp:2,z:[],r:5,e:[32],a:'quad/horns,spikes/crest,fangs'},
 {i:['simurghling','simurgh'],n:['Simurgh Fledgling','Simurgh'],t:['Aether','Aether'],s:[[84,86,76,104],[112,116,96,128]],c:.12,tp:0,z:[],r:5,e:[32],a:'bird/crest,halo/tail4,flame'}];
/* Evolved forms without listed stats are derived from the form before: weaker bases grow more. */
/** Derives a species stat block from its base weights, scaled by `minMul`/`base`. */
function growStats(p,minMul,base){
  const bst=p[0]+p[1]+p[2]+p[3],m=Math.max(minMul,base-bst/(base>1.5?700:900));
  return[Math.round(p[0]*m),Math.round(p[1]*m),Math.round(p[2]*m),Math.round(p[3]*(1+(m-1)*.6))];
}
/* The twelve outer zones (levels 23 to 50): which first-form species roam them. Evolved forms appear as levels demand. */
const XZ={
 shore:['tatzel','peryton','gryphling','sandworm','wolpertinger','selkie','kappa','kelpie','hydrapup','nixie'],
 mangrove:['hodag','barghest','pooka','cusith','wisp','redcap','kappa','bunyip','kelpie','hydrapup'],
 bonefield:['sandworm','sphinxcub','manticore','cockatrice','tatzel','beannighe','barghest','cerberuspup','nixie'],
 mesa:['thunderbird','gryphling','roc','manticore','salamander','wyvern','sphinxcub','cockatrice'],
 mistvale:['kitsune','whitehart','peryton','qilin','wisp','pooka','cusith','sleipnir','selkie','nixie','kelpie'],
 obsidian:['salamander','wyvern','chimera','phoenixchick','cerberuspup','drake','manticore','redcap'],
 deepwood:['hodag','cusith','barghest','kitsune','peryton','whitehart','wisp','redcap','bunyip','kappa'],
 tors:['gryphling','roc','thunderbird','wyvern','qilin','sphinxcub','yeti','drake','hydrapup'],
 witchfen:['beannighe','redcap','wisp','barghest','pooka','cerberuspup','hodag','kitsune','bunyip','kelpie','hydrapup','kappa','leviathan'],
 glacier:['fenrirpup','yeti','sleipnir','thunderbird','qilin','whitehart','roc','chimera','selkie','kelpie','leviathan'],
 starfall:['qilin','sleipnir','phoenixchick','kitsune','whitehart','roc','thunderbird','wisp','sphinxcub','leviathan','nixie'],
 worldscar:['drake','chimera','cerberuspup','wyvern','phoenixchick','manticore','salamander','thunderbird','roc','qilin']};
for(const L of LINES)for(const zk in XZ)if(XZ[zk].includes(L.i[0]))L.z=L.z.concat(zk);
const SP={},SPL=[],WILDBY={};
for(const L of LINES){
  const art=L.a.split('/'),st=[];
  L.i.forEach((id,k)=>{
    let b=L.s[k];
    if(!b)b=k===1?growStats(st[0],1.2,1.6):growStats(st[k-1],1.12,1.45);
    st.push(b);
    const feats=[].concat(art[1],k>=1?art[2]:'',k>=2?art[3]:'').join(',').split(',').filter(Boolean);
    SP[id]={id,n:L.n[k],t:L.t[k],g:k?L.n[k].charAt(0).toUpperCase():L.n[k].charAt(0).toLowerCase(),b,c:k?+(L.c*.3).toFixed(3):L.c,tp:L.tp,
      z:k?[]:L.z,evo:k<L.i.length-1?[L.e[k],L.i[k+1]]:null,aq:!!L.aq,rar:L.r,stage:k+1,stages:L.i.length,line:L.i[0],prev:k?L.i[k-1]:null,next:L.i[k+1]||null,
      legend:L.r===5,art:{plan:art[0],feats}};
    SPL.push(id);
  });
  if(L.r<5)for(const zk of L.z){const key=zk+'|'+(L.aq?'w':'l');(WILDBY[key]=WILDBY[key]||[]).push({id:L.i[0],w:RAR[L.r].w});}
}
const NAQ=SPL.filter(id=>SP[id].aq).length;
const ZK=['green','wood','crag','mire','dunes','frost','gloam','cinder','drake','shore','mangrove','bonefield','mesa','mistvale','obsidian','deepwood','tors','witchfen','glacier','starfall','worldscar','th','cw','rh','ew','dm'];
const ZN={
 green:{n:'Greenmoor',lv:[1,3]},wood:{n:'Whisperwood',lv:[3,6]},crag:{n:'Ashen Crags',lv:[6,9]},mire:{n:'Mirelow Fen',lv:[8,11]},
 dunes:{n:'Sunscour Dunes',lv:[10,13]},frost:{n:'Frostspine',lv:[11,14]},gloam:{n:'Gloamwood',lv:[13,16]},cinder:{n:'Cinder Barrens',lv:[14,18]},
 drake:{n:'Drakefall',lv:[18,22]},
 shore:{n:'Saltglass Shore',lv:[23,25]},mangrove:{n:'Mangrove Maze',lv:[25,27]},bonefield:{n:'Whitebone Reach',lv:[27,29]},
 mesa:{n:'Thundermesa',lv:[29,32]},mistvale:{n:'Mistvale',lv:[31,34]},obsidian:{n:'Obsidian Wastes',lv:[34,37]},
 deepwood:{n:'The Deepwood',lv:[36,39]},tors:{n:'Skyreach Tors',lv:[39,42]},witchfen:{n:'Witchfen',lv:[41,44]},
 glacier:{n:'Glacier Maw',lv:[44,46]},starfall:{n:'Starfall Plains',lv:[46,48]},worldscar:{n:'The Worldscar',lv:[48,50]},
 th:{n:'Thistledown',safe:1},cw:{n:'Cragwatch',safe:1},rh:{n:'Rimehold',safe:1},ew:{n:'Emberwatch',safe:1},dm:{n:'Dunmarch',safe:1}};
const TOWNS=[
 {id:'th',x0:74,y0:82,w:12,h:10,cottage:1,stock:['cord','salve','tonic','boat']},
 {id:'cw',x0:132,y0:92,w:12,h:10,stock:['cord','silver','salve','tonic','boat']},
 {id:'rh',x0:74,y0:18,w:12,h:10,stock:['cord','silver','gilded','salve','tonic','boat']},
 {id:'ew',x0:116,y0:38,w:12,h:10,stock:['cord','silver','gilded','salve','tonic','boat']},
 {id:'dm',x0:14,y0:110,w:12,h:10,stock:['cord','silver','salve','tonic','boat']}];
const LAIRS=[
 {z:'green',x:60,y:68,sp:'kitsune'},{z:'wood',x:16,y:88,sp:'barghest'},{z:'crag',x:144,y:64,sp:'cockatrice'},
 {z:'mire',x:76,y:118,sp:'hodag'},{z:'frost',x:100,y:12,sp:'yeti'},{z:'cinder',x:132,y:24,sp:'chimera'},{z:'drake',x:20,y:20,sp:'drake'},
 {z:'dunes',x:34,y:118,sp:'sphinxcub'},{z:'gloam',x:140,y:120,sp:'redcap'}];
for(const t of TOWNS){t.x0+=OX;t.y0+=OY;}
for(const L of LAIRS){L.x+=OX;L.y+=OY;}
/* One Alpha's lair in each outer zone, in final map coordinates. */
LAIRS.push({z:'shore',x:110,y:164,sp:'lindworm'},{z:'mangrove',x:172,y:164,sp:'hodagelder'},{z:'bonefield',x:50,y:164,sp:'olgoi'},
 {z:'mesa',x:208,y:134,sp:'wakinyan'},{z:'mistvale',x:16,y:134,sp:'kyubi'},{z:'obsidian',x:208,y:95,sp:'efreet'},
 {z:'deepwood',x:16,y:95,sp:'crownhart'},{z:'tors',x:208,y:56,sp:'gryphking'},{z:'witchfen',x:16,y:56,sp:'banshee'},
 {z:'glacier',x:188,y:13,sp:'garm'},{z:'starfall',x:36,y:13,sp:'kirin'},{z:'worldscar',x:112,y:12,sp:'elderwyrm'});
const IT={
 cord:{n:'Hemp Cord',p:1,price:12,d:'Knotted hemp with a binding rune inked on it. Works best on a wounded beast.'},
 silver:{n:'Silvered Cord',p:1.7,price:45,d:'Hemp braided with silver thread. Binds stubborn beasts more often.'},
 gilded:{n:'Gilded Cord',p:2.8,price:130,d:'A cord of gold wire and rare dye. The best binding available.'},
 salve:{n:'Herbal Salve',price:15,d:'Restores about a third of health to you or a companion.'},
 tonic:{n:'Revive Tonic',price:40,d:'Rouses a fainted companion at half health.'},
 boat:{n:'Folding Skiff',price:150,d:'Ash ribs and oiled hide that fold into your pack. Walk into open water to board it, and step onto land to fold it away. You only need to buy it once.'}};
const ROOMS={
 cottage:['###########','#SS.H.S.TT#','#.........#','#B..R.R.N.#','#B........#','#.........#','#####D#####'],
 healer:['###########','#S.S.H.S.S#','#.........#','#..R.N.R..#','#B.......B#','#.........#','#####D#####'],
 shop:['###########','#SSSSSSSSS#','#.........#','#.CCCNCCC.#','#.........#','#.T.....T.#','#####D#####'],
 hall:['###########','#T.T...T.T#','#.........#','#..RRNRR..#','#.........#','#S.......S#','#####D#####']};
const ROOMNAME={cottage:"Marra's Cottage",healer:"Healer's Hall",shop:'Provisioner',hall:'Proving Hall'};
const DG=[
 {k:'trivial',n:'Trivial',c:'#8A938F'},{k:'easy',n:'Easy',c:'#3F9A4A'},{k:'even',n:'Even match',c:'#C9A40F'},
 {k:'hard',n:'Hard',c:'#E07A1F'},{k:'danger',n:'Dangerous',c:'#D6402F'},{k:'deadly',n:'Deadly',c:'#A3195B'}];
/** Colour/label describing how threatening a foe of level `foeLv` is to a player of level `myLv`. */
function danger(foeLv,myLv){
  const d=foeLv-myLv;
  return d<=-6?DG[0]:d<=-3?DG[1]:d<=1?DG[2]:d<=3?DG[3]:d<=5?DG[4]:DG[5];
}
