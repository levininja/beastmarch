/**
 * art.js — procedural SVG portraits for every creature
 *
 * Load order: 6th. artBuild(id) draws a creature from its species definition
 * (body shape, colours, features) as an SVG string; results are cached by the
 * caller.
 *
 * All files are classic scripts sharing one global scope (no modules); see README.
 */
'use strict';
/* ---------- creature artwork ----------
   Every creature is drawn from a body plan plus a few features that pile up as it evolves, in the colors of its type.
   Artwork appears on the battle, companion, bestiary and similar screens. The main map never uses it. */
/** Parses #RRGGBB into [r,g,b]. */
function hexRGB(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16)];}
/** Lightens/darkens a hex colour by amount `a`. */
function shade(h,a){
  const r=hexRGB(h).map(v=>Math.max(0,Math.min(255,Math.round(a<0?v*(1+a):v+(255-v)*a))));
  return `rgb(${r[0]},${r[1]},${r[2]})`;
}
/** Stable string hash used for per-species variation. */
function strHash(s){let h=7;for(let i=0;i<s.length;i++)h=(Math.imul(h,31)+s.charCodeAt(i))|0;return h>>>0;}
const TYPELIST=Object.keys(TYPE).filter(k=>k!=='Plain');
/* anchors: head [x,y,r], back [x,y], tail [x,y], spine points for spikes */
const PLANS={
 quad:{head:[76,44,11],back:[45,46],tail:[22,54],spine:[[30,47],[38,45],[46,44],[54,45]]},
 drake:{head:[80,32,10],back:[46,46],tail:[20,56],spine:[[28,48],[38,45],[48,44],[58,42]]},
 bird:{head:[70,38,9],back:[48,46],tail:[30,62],spine:[[40,48],[48,46],[56,48]]},
 serpent:{head:[86,44,10],back:[50,60],tail:[12,78],spine:[[28,60],[40,68],[56,68],[70,56]]},
 fish:{head:[68,52,10],back:[48,38],tail:[20,54],spine:[[36,40],[44,38],[52,38],[60,41]]},
 biped:{head:[50,28,12],back:[50,40],tail:[36,78],spine:[[38,44],[62,44],[44,38],[56,38]]},
 wisp:{head:[50,52,14],back:[50,20],tail:[50,88],spine:[[50,18],[40,26],[60,26]]}};
/** SVG triangle polygon string. */
function tri(a,b,c,d,e,f,fill){return `<polygon points="${a},${b} ${c},${d} ${e},${f}" fill="${fill}"/>`;}
/** Builds the SVG portrait for species `id`. */
function artBuild(id){
  const sp=SP[id],plan=PLANS[sp.art.plan],F=new Set(sp.art.feats),h=strHash(id);
  const base=TYPE[sp.t][0],dk=shade(base,-.32),lt=shade(base,.38);
  const others=TYPELIST.filter(k=>k!==sp.t),acc=TYPE[others[h%others.length]][0],accDk=shade(acc,-.25);
  const [hx,hy,hr]=plan.head,[bx,by]=plan.back,[tx,ty]=plan.tail;
  const back=[],body=[],front=[];
  const kind=sp.art.plan,ink='#15211E';
  /* behind the body */
  if(F.has('wings')||kind==='drake'){
    back.push(`<path d="M${bx},${by} L${bx-30},${by-34} L${bx-10},${by-10} L${bx-22},${by-4} L${bx+6},${by+6}Z" fill="${acc}" stroke="${accDk}" stroke-width="1.5"/>`);
  }
  if(F.has('mane'))back.push(`<ellipse cx="${hx-4}" cy="${hy+1}" rx="${hr+8}" ry="${hr+8}" fill="${acc}"/>`);
  if(F.has('frill'))back.push(`<ellipse cx="${hx-4}" cy="${hy}" rx="${hr+9}" ry="${hr+6}" fill="${acc}" opacity=".75"/>`);
  if(F.has('shell'))back.push(`<ellipse cx="${bx}" cy="${by+14}" rx="25" ry="21" fill="${accDk}"/><path d="M${bx-14},${by+14} h28 M${bx},${by} v28" stroke="${acc}" stroke-width="2"/>`);
  const tails=F.has('tail9')?9:F.has('tail4')?4:F.has('tail2')?2:0;
  for(let k=0;k<tails;k++){
    const a=(k-(tails-1)/2)*(tails>4?.22:.4);
    const ex=tx-18*Math.cos(a)-4,ey=ty-14-20*Math.sin(a)*-1;
    back.push(`<path d="M${tx+4},${ty} Q${tx-12},${ty-18+k*5-tails*2} ${Math.max(2,ex-4)},${Math.max(4,ey-6)}" stroke="${k%2?lt:acc}" stroke-width="7" fill="none" stroke-linecap="round"/>`);
  }
  if(F.has('flame')){
    for(let k=0;k<3;k++){const fx=tx+k*5-2,fy=ty-6-k*5;back.push(`<path d="M${fx},${fy} q-9,-12 -2,-24 q3,10 9,12 q-2,6 -7,12z" fill="${k===1?'#F7D547':'#F4A23A'}"/>`);}
  }
  /* body by plan */
  if(kind==='quad'||kind==='drake'){
    body.push(`<path d="M22,54 Q10,42 6,30" stroke="${base}" stroke-width="8" fill="none" stroke-linecap="round"/>`);
    for(const lx of [26,34,56,64])body.push(`<rect x="${lx}" y="60" width="7" height="24" rx="3" fill="${dk}"/>`);
    body.push(`<ellipse cx="45" cy="58" rx="25" ry="14" fill="${base}"/><ellipse cx="45" cy="64" rx="19" ry="7" fill="${lt}"/>`);
    if(kind==='drake')body.push(`<path d="M62,48 Q74,44 ${hx-4},${hy+6}" stroke="${base}" stroke-width="13" fill="none" stroke-linecap="round"/>`);
    body.push(`<circle cx="${hx}" cy="${hy}" r="${hr}" fill="${base}"/><ellipse cx="${hx+9}" cy="${hy+4}" rx="7" ry="5" fill="${lt}"/>`);
    if(!F.has('horns')&&!F.has('antlers'))body.push(tri(hx-8,hy-8,hx-4,hy-20,hx,hy-9,dk)+tri(hx+1,hy-9,hx+5,hy-20,hx+8,hy-7,dk));
  }else if(kind==='bird'){
    body.push(`<path d="M32,60 L8,52 L10,60 L6,68 L12,70 L32,66Z" fill="${acc}"/>`);
    body.push(`<path d="M44,74 V88 M54,74 V88 M40,89 h8 M50,89 h8" stroke="${dk}" stroke-width="3.5" stroke-linecap="round" fill="none"/>`);
    body.push(`<ellipse cx="48" cy="60" rx="22" ry="17" fill="${base}"/><ellipse cx="50" cy="68" rx="14" ry="8" fill="${lt}"/>`);
    body.push(`<path d="M46,48 Q28,62 44,72 Q60,66 56,50Z" fill="${acc}" stroke="${accDk}" stroke-width="1.5"/>`);
    body.push(`<circle cx="${hx}" cy="${hy}" r="${hr}" fill="${base}"/>${tri(hx+7,hy-2,hx+20,hy+3,hx+7,hy+8,'#E8B84A')}`);
  }else if(kind==='serpent'){
    const heads=F.has('heads5')?5:F.has('heads3')?3:1;
    body.push(`<path d="M10,80 C28,46 46,100 64,64 S80,40 ${hx-2},${hy+2}" stroke="${base}" stroke-width="15" fill="none" stroke-linecap="round"/>`);
    body.push(`<path d="M10,80 C28,46 46,100 64,64 S80,40 ${hx-2},${hy+2}" stroke="${lt}" stroke-width="5" fill="none" stroke-linecap="round" opacity=".8"/>`);
    for(let k=1;k<heads;k++){
      const ang=(k%2?-1:1)*Math.ceil(k/2)*.34,ex=64+Math.sin(ang)*26,ey=64-26*Math.cos(ang)*.9;
      body.push(`<path d="M64,64 Q${64+Math.sin(ang)*10},${64-14} ${ex},${ey}" stroke="${base}" stroke-width="8" fill="none" stroke-linecap="round"/><circle cx="${ex}" cy="${ey}" r="6" fill="${base}"/><circle cx="${ex+1}" cy="${ey-1}" r="1.8" fill="#fff"/>`);
    }
    body.push(`<circle cx="${hx}" cy="${hy}" r="${hr}" fill="${base}"/>`);
  }else if(kind==='fish'){
    body.push(`<path d="M22,54 L4,38 L8,54 L4,70Z" fill="${acc}"/>`);
    body.push(`<ellipse cx="48" cy="54" rx="29" ry="17" fill="${base}"/><ellipse cx="50" cy="62" rx="22" ry="8" fill="${lt}"/>`);
    body.push(`<path d="M40,40 L52,20 L62,42Z" fill="${acc}"/><path d="M44,62 L34,80 L56,68Z" fill="${acc}"/>`);
  }else if(kind==='biped'){
    body.push(`<path d="M36,50 L16,72 M64,50 L84,72" stroke="${base}" stroke-width="10" stroke-linecap="round"/>`);
    body.push(`<rect x="38" y="70" width="9" height="22" rx="4" fill="${dk}"/><rect x="53" y="70" width="9" height="22" rx="4" fill="${dk}"/>`);
    body.push(`<ellipse cx="50" cy="56" rx="18" ry="23" fill="${base}"/><ellipse cx="50" cy="64" rx="11" ry="12" fill="${lt}"/>`);
    body.push(`<circle cx="${hx}" cy="${hy}" r="${hr}" fill="${base}"/>`);
    if(!F.has('horns'))body.push(`<path d="M40,22 Q50,14 60,22" stroke="${dk}" stroke-width="5" fill="none" stroke-linecap="round"/>`);
  }else{
    body.push(`<path d="M50,10 C80,44 84,78 50,92 C16,78 20,44 50,10Z" fill="${base}"/><path d="M50,32 C66,52 66,74 50,84 C34,74 34,52 50,32Z" fill="${lt}" opacity=".85"/>`);
  }
  /* markings: a few spots so lines of the same type do not all look alike */
  const spots=h%4;
  for(let k=0;k<spots;k++)body.push(`<circle cx="${bx-10+k*9+(h>>k)%5}" cy="${by+10+((h>>(k+3))%9)}" r="${3+(h>>k)%3}" fill="${dk}" opacity=".35"/>`);
  /* face and extras above the body */
  if(F.has('fangs'))front.push(tri(hx+hr-4,hy+4,hx+hr-1,hy+11,hx+hr+3,hy+4,'#FFFFFF')+tri(hx+hr-9,hy+5,hx+hr-6,hy+11,hx+hr-3,hy+5,'#FFFFFF'));
  if(F.has('horns'))front.push(`<path d="M${hx-7},${hy-8} Q${hx-16},${hy-20} ${hx-8},${hy-26} Q${hx-6},${hy-16} ${hx-1},${hy-9}Z" fill="${lt}" stroke="${dk}" stroke-width="1.2"/><path d="M${hx+3},${hy-9} Q${hx+8},${hy-22} ${hx+16},${hy-24} Q${hx+12},${hy-14} ${hx+8},${hy-7}Z" fill="${lt}" stroke="${dk}" stroke-width="1.2"/>`);
  if(F.has('antlers'))front.push(`<path d="M${hx-3},${hy-9} L${hx-9},${hy-26} M${hx-7},${hy-19} L${hx-15},${hy-23} M${hx-8},${hy-24} L${hx-4},${hy-30} M${hx+3},${hy-9} L${hx+7},${hy-27} M${hx+6},${hy-19} L${hx+14},${hy-24}" stroke="#D8C08A" stroke-width="3" stroke-linecap="round" fill="none"/>`);
  if(F.has('crest'))front.push(`<path d="M${hx-3},${hy-10} L${hx-9},${hy-24} L${hx-1},${hy-14} L${hx+3},${hy-27} L${hx+4},${hy-13} L${hx+12},${hy-22} L${hx+7},${hy-9}Z" fill="${acc}" stroke="${accDk}" stroke-width="1"/>`);
  if(F.has('spikes')){
    for(const p of plan.spine)front.push(tri(p[0]-3.5,p[1]+3,p[0],p[1]-9,p[0]+3.5,p[1]+3,acc));
  }
  if(F.has('fins')&&kind!=='fish')front.push(`<path d="M${bx-16},${by} L${bx-8},${by-17} L${bx+2},${by-2} L${bx+10},${by-15} L${bx+16},${by}Z" fill="${acc}" opacity=".9"/>`);
  if(F.has('eyes3'))front.push(`<circle cx="${hx-1}" cy="${hy-8}" r="2.8" fill="#fff" stroke="${ink}" stroke-width="1"/><circle cx="${hx-1}" cy="${hy-8}" r="1.2" fill="${ink}"/>`);
  if(F.has('halo'))front.push(`<ellipse cx="${hx}" cy="${Math.max(7,hy-24)}" rx="14" ry="4.5" fill="none" stroke="#F2C94C" stroke-width="3"/>`);
  /* eye */
  const ex=kind==='wisp'?bx-8:kind==='fish'?hx+4:hx+3,ey=kind==='wisp'?hy-2:hy-2;
  front.push(`<circle cx="${ex}" cy="${ey}" r="3.2" fill="#fff"/><circle cx="${ex+1}" cy="${ey}" r="1.5" fill="${ink}"/>`);
  if(kind==='wisp')front.push(`<circle cx="${bx+8}" cy="${hy-2}" r="3.2" fill="#fff"/><circle cx="${bx+9}" cy="${hy-2}" r="1.5" fill="${ink}"/>`);
  const sc=.76+.07*sp.stage;
  return `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><g transform="translate(50 56) scale(${sc}) translate(-50 -56)">${back.join('')}${body.join('')}${front.join('')}</g></svg>`;
}
const ARTC={};
const artSVG=id=>ARTC[id]||(ARTC[id]=artBuild(id));
const artHTML=(id,px,cls)=>`<span class="art ${cls||''}" style="width:${px}px;height:${px}px">${artSVG(id)}</span>`;
