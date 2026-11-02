import {colors,fmt} from './math.js';
const W=640,H=430,P={left:58,right:25,top:28,bottom:44};
export const plotSize={W,H,P};
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function step(span){const raw=span/6,p=10**Math.floor(Math.log10(raw));return [1,2,5,10].find(x=>x*p>=raw)*p;}
export function graph(m,id='plot',layers={}) {
  const sx=x=>P.left+(x-m.x[0])/(m.x[1]-m.x[0])*(W-P.left-P.right);
  const sy=y=>H-P.bottom-(y-m.y[0])/(m.y[1]-m.y[0])*(H-P.top-P.bottom);
  const path=pts=>pts.map(([x,y],i)=>`${i?'L':'M'}${sx(x).toFixed(2)},${sy(y).toFixed(2)}`).join(' ');
  const sample=(fn,a=m.x[0],b=m.x[1],n=250)=>Array.from({length:n+1},(_,i)=>{const x=a+(b-a)*i/n;return [x,fn(x)];});
  const curvePath=fn=>{let d='',pen=false;for(const [x,y] of sample(fn)){if(!Number.isFinite(y)||Math.abs(sy(y))>H*20){pen=false;continue;}d+=`${pen?'L':'M'}${sx(x).toFixed(2)},${sy(y).toFixed(2)} `;pen=true;}return d;};
  let grid='',ticks='';
  const dx=step(m.x[1]-m.x[0]),dy=step(m.y[1]-m.y[0]);
  for(let x=Math.ceil(m.x[0]/dx)*dx;x<=m.x[1];x+=dx){grid+=`<line x1="${sx(x)}" x2="${sx(x)}" y1="${P.top}" y2="${H-P.bottom}"/>`;ticks+=`<text x="${sx(x)}" y="${H-P.bottom+23}" text-anchor="middle">${fmt(x)}</text>`;}
  for(let y=Math.ceil(m.y[0]/dy)*dy;y<=m.y[1];y+=dy){grid+=`<line x1="${P.left}" x2="${W-P.right}" y1="${sy(y)}" y2="${sy(y)}"/>`;ticks+=`<text x="${P.left-12}" y="${sy(y)+4}" text-anchor="end">${fmt(y)}</text>`;}
  let fills='';
  if(layers.area!==false) for(const a of m.areas){
    for(const sign of [1,-1]){const pts=sample(x=>sign*a.fn(x)>0?a.fn(x):0,a.a,a.b,200);fills+=`<path d="${path([[a.a,0],...pts,[a.b,0]])} Z" fill="${sign>0?a.color:colors.blue}" fill-opacity=".14"/>`;}
  }
  if(layers.area!==false) for(const r of m.rectangles){fills+=`<rect x="${sx(r.x)}" y="${sy(Math.max(0,r.height))}" width="${Math.max(.1,sx(r.x+r.width)-sx(r.x))}" height="${Math.abs(sy(r.height)-sy(0))}" fill="${colors.red}" fill-opacity=".12" stroke="${colors.red}" stroke-opacity=".5" stroke-width=".7"/>`;}
  const axes=`${m.y[0]<=0&&m.y[1]>=0?`<line x1="${P.left}" x2="${W-P.right}" y1="${sy(0)}" y2="${sy(0)}"/>`:''}${m.x[0]<=0&&m.x[1]>=0?`<line x1="${sx(0)}" x2="${sx(0)}" y1="${P.top}" y2="${H-P.bottom}"/>`:''}`;
  let curves=m.curves.map(c=>`<path d="${curvePath(c.fn)}" fill="none" stroke="${c.color}" stroke-width="2.5" ${c.dashed?'stroke-dasharray="6 6"':''}/>`).join('');
  if(layers.lines!==false)curves+=m.lines.map(l=>`<line x1="${sx(l.x1)}" y1="${sy(l.y1)}" x2="${sx(l.x2)}" y2="${sy(l.y2)}" stroke="${l.color}" stroke-width="1.8" ${l.dashed?'stroke-dasharray="5 5"':''}/>`).join('');
  const dots=m.points.map((p,i)=>`<g ${p.drag?`class="plot-handle" data-drag="${p.drag}" data-offset="${p.offset||0}" role="button" tabindex="0" aria-label="拖动${escape(p.label)}，或用方向键调整"`:''} transform="translate(${sx(p.x)},${sy(p.y)})"><circle r="17" fill="transparent"/><circle r="${p.small?3:5.5}" fill="${p.open?'var(--paper)':p.color}" stroke="${p.color}" stroke-width="2"/><text class="point-label" x="${sx(p.x)>W-130?-12:12}" y="${i%2?22:-13}" text-anchor="${sx(p.x)>W-130?'end':'start'}" fill="${p.color}">${escape(p.label)}</text></g>`).join('');
  let inset='';
  if(m.inset){const w=m.inset.width*10,h=m.inset.height*10;inset=`<g class="plot-inset" transform="translate(486,42)"><rect x="-12" y="-18" width="130" height="145" rx="6" fill="var(--paper)" fill-opacity=".94"/><text x="52" y="0" text-anchor="middle" class="inset-title">同一周长的矩形</text><rect x="${(104-w)/2}" y="20" width="${w}" height="${h}" fill="${colors.blue}" fill-opacity=".1" stroke="${colors.blue}" stroke-width="1.5"/><text x="52" y="${h+37}" text-anchor="middle">${fmt(m.inset.width)} × ${fmt(m.inset.height)}</text></g>`;}
  return `<svg class="math-plot" viewBox="0 0 ${W} ${H}" aria-labelledby="${id}-title ${id}-desc" role="group"><title id="${id}-title">${escape(m.curves.map(c=>c.label).join('；'))}</title><desc id="${id}-desc">${escape(m.note)}当前读数：${escape(m.stats.map(s=>`${s.label} ${s.value}`).join('；'))}</desc><defs><clipPath id="${id}-clip"><rect x="${P.left}" y="${P.top}" width="${W-P.left-P.right}" height="${H-P.top-P.bottom}"/></clipPath></defs><g class="plot-grid">${grid}</g><g class="plot-ticks">${ticks}<text x="${W-P.right}" y="${H-5}" text-anchor="end">${escape(m.xLabel)}</text><text x="${P.left}" y="15">${escape(m.yLabel)}</text></g><g clip-path="url(#${id}-clip)">${fills}<g class="plot-axes">${axes}</g>${curves}${dots}</g>${inset}</svg>`;
}
export function clientToX(svg,clientX,m){const r=svg.getBoundingClientRect();return m.x[0]+((clientX-r.left)/r.width*W-P.left)/(W-P.left-P.right)*(m.x[1]-m.x[0]);}
