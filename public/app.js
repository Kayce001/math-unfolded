import {chapters,lessons,reference} from './content.js';
import {scenes,defaults,model,fmt,clamp} from './math.js';
import {graph,clientToX} from './graph.js';

const app=document.getElementById('app');
let current=null,params={},layers={area:true,lines:true},playing=false,frame=0,lastTime=0,phase=0,answered=null,heroParams={a:.7,h:1};
const completed=new Set();
try{for(const id of JSON.parse(localStorage.getItem('calculus-progress-v1')||'[]'))completed.add(id);}catch{}
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
function stop(){playing=false;cancelAnimationFrame(frame);frame=0;const b=document.getElementById('play');if(b){b.setAttribute('aria-pressed','false');b.textContent='▷ 播放变化';}}
function saveProgress(){try{localStorage.setItem('calculus-progress-v1',JSON.stringify([...completed]));}catch{}}
const chapterRoute=c=>`#/${c.id}/${c.lessons[0].id}`;
function home(){
  current=null;document.title='数学展开 · 把公式变成眼前的变化';document.getElementById('breadcrumb').textContent='一本可以动手读的数学书';
  app.innerHTML=`<div class="home"><section class="hero"><div><div class="eyebrow">从直觉出发 · 走进微积分</div><h1>让公式，变成<br>眼前的<em>变化。</em></h1><p>移动一个点，转动一条切线，累加一片面积。<br>在可以操作的图形里，读懂微积分为什么成立。</p><div class="hero-actions"><a class="primary" href="${lessons[0].route}">从函数开始 <span>→</span></a><a class="text-link" href="${lessons.find(l=>l.scene==='secant').route}">先试试：从割线到切线 ↗</a></div></div><div class="hero-figure"><div class="figure-top"><span>图 01 · 两点，逐渐靠近</span><span>f(x) = x²</span></div><div id="hero-plot"></div><div class="hero-bottom"><span id="hero-readout"></span><button class="soft-button" id="hero-approach">让两点更靠近 →</button></div></div></section><section aria-labelledby="contents-title"><div class="section-head"><h2 id="contents-title">循着变化，读六章</h2><p>06 章 / 18 个交互单元</p></div><div class="chapter-grid">${chapters.map((c,i)=>`<a class="chapter-card" href="${chapterRoute(c)}"><div class="card-top"><span>第 0${i+1} 章</span><span>${c.lessons.filter(l=>completed.has(`${c.id}/${l.id}`)).length} / 3 已练习</span></div><h3>${c.title}</h3><p>${c.subtitle}</p><div class="card-plot" aria-hidden="true">${miniature(i)}</div><div class="card-bottom"><span>阅读与操作</span><span>↗</span></div></a>`).join('')}</div></section><section class="approach" aria-label="怎样阅读这本书"><div><span>01 / 先动手</span><h3>让图形回答一个问题</h3><p>改变参数，拖动观察点。先看变化，再为它寻找数学语言。</p></div><div><span>02 / 再理解</span><h3>每条公式都有来处</h3><p>从有限的例子走向一般的规律，同时说清适用的条件与边界。</p></div><div><span>03 / 试着解释</span><h3>用一道题检验直觉</h3><p>选择答案后查看解释。答错也能帮你分清两个相似的概念。</p></div></section><footer class="home-footer"><span>数学展开 · 可视化微积分第一版</span><span>建议先熟悉坐标系、代数运算与弧度。图形帮助理解，结论仍需条件。</span></footer></div>`;
  drawHero();
}
function miniature(i){
  const fns=[x=>.32*x*x,x=>x<0?-.5:.6,x=>Math.sin(x),x=>.2*(x*x*x-3*x),x=>.3*x*x,x=>1-Math.cos(x)];
  const fn=fns[i],x=v=>150+v*44,y=v=>82-v*29;
  const pts=Array.from({length:101},(_,k)=>{const a=-2.8+k*5.6/100;return `${k?'L':'M'}${x(a)},${y(fn(a))}`;}).join(' ');
  const color=['#292c30','#467c8d','#ad4e35','#a78642','#467c8d','#ad4e35'][i];
  return `<svg viewBox="0 0 300 140" focusable="false"><path d="M20 82H280M150 16V127" stroke="#d4d4cc" fill="none"/><path d="${pts}" fill="none" stroke="${color}" stroke-width="1.8"/><circle cx="${x(.8)}" cy="${y(fn(.8))}" r="3.5" fill="${color}"/>${i===2?`<path d="M135 97L236 31" stroke="${color}" opacity=".4"/>`:''}${i===4?`<path d="M150 82L150 82L172 82L172 78L194 78L194 64L216 64L216 42L238 42L238 82Z" fill="${color}" opacity=".1"/>`:''}</svg>`;
}
function drawHero(){const m=model('secant',heroParams);document.getElementById('hero-plot').innerHTML=graph(m,'hero');document.getElementById('hero-readout').innerHTML=`h = ${fmt(heroParams.h)}　<span>斜率 <strong>${fmt(heroParams.h===0?NaN:2*heroParams.a+heroParams.h)}</strong></span>`;}
function controlsHTML(){return scenes[current.scene].controls.map(c=>`<div class="control"><label class="control-label" for="param-${c.key}"><span>${c.label}${c.symbol?` <span class="eyebrow">${c.symbol}</span>`:''}</span><output id="value-${c.key}">${c.options?'':fmt(params[c.key])}</output></label>${c.options?`<select id="param-${c.key}" data-param="${c.key}">${c.options.map(([v,l])=>`<option value="${v}" ${params[c.key]===v?'selected':''}>${l}</option>`).join('')}</select>`:`<input type="range" id="param-${c.key}" data-param="${c.key}" min="${c.min}" max="${c.max}" step="${c.step}" value="${params[c.key]}">`}</div>`).join('');}
function renderLesson(l){
  current=l;params=defaults(l.scene);layers={area:true,lines:true};answered=null;
  document.title=`${l.title} · 数学展开`;document.getElementById('breadcrumb').textContent=`第 ${l.chapterIndex+1} 章 / ${l.chapter.title}`;
  const k=lessons.indexOf(l),prev=lessons[k-1],next=lessons[k+1];
  app.innerHTML=`<nav class="chapter-nav" aria-label="章节">${chapters.map((c,i)=>`<a href="${chapterRoute(c)}" ${c===l.chapter?'aria-current="true"':''}><span>0${i+1}</span>${c.title}</a>`).join('')}</nav><div class="reader"><div class="book"><article class="reading"><nav class="lesson-index" aria-label="本章单元">${l.chapter.lessons.map((v,i)=>`<a href="#/${l.chapter.id}/${v.id}" aria-label="${i+1}：${v.title}" ${i===l.index?'aria-current="true"':''}>${i+1}</a>`).join('')}<span>阅读 · 操作 · 练习</span></nav><div class="eyebrow">${l.number} / ${l.chapter.title}</div><h1 tabindex="-1">${l.title}</h1><p class="sub">${l.sub}</p><div class="prose"><p class="lead">${l.lead}</p>${l.paragraphs.map(p=>`<p>${p}</p>`).join('')}</div><div class="formula" aria-label="本节公式">${l.formula}</div><div class="activity"><div class="eyebrow">试着操作图形 ↗</div><p>${l.activity}</p></div><div class="takeaway"><span>带走一个理解</span>${l.takeaway}</div></article><section class="figure-page" aria-label="交互图形"><div class="figure-top"><span>图 ${l.number} · ${model(l.scene,params).points.some(p=>p.drag)?'拖动实心观察点':'用下方控件改变图形'}</span><span>实时计算</span></div><div id="figure-stage" class="figure-stage"></div><div id="legend" class="legend"></div><div id="stats" class="stats" aria-label="图形实时读数"></div><div class="controls" aria-label="图形参数">${controlsHTML()}</div><div class="controls-footer">${scenes[l.scene].animate?'<button id="play" aria-pressed="false">▷ 播放变化</button>':''}<button class="reset" id="reset">↺ 重置</button></div><div class="layer-options">${model(l.scene,params).lines.length?'<label><input type="checkbox" data-layer="lines" checked> 辅助线</label>':''}${['riemann','signed','velocity','accumulation','ftc'].includes(l.scene)?'<label><input type="checkbox" data-layer="area" checked> 面积图层</label>':''}</div><p class="observation" id="observation"></p></section></div><section class="exercise" aria-labelledby="exercise-title"><div><div class="eyebrow">停一下，检验直觉</div><h2 id="exercise-title">一题，确认你读懂了</h2><p>${l.question.text}</p><small>本题使用题干给定的参数，与当前滑块设置独立。</small></div><div><div class="choices">${l.question.choices.map((v,i)=>`<button class="choice" data-choice="${i}"><span class="letter">${'ABCD'[i]}</span><span>${v}</span></button>`).join('')}</div><div id="answer" class="answer" aria-live="polite" hidden></div></div></section><nav class="pager" aria-label="单元翻页">${prev?`<a href="${prev.route}"><small>← 上一单元</small>${prev.title}</a>`:'<a href="#/"><small>← 回到目录</small>从这里出发</a>'}<span>${k+1} / ${lessons.length}</span>${next?`<a href="${next.route}"><small>下一单元 →</small>${next.title}</a>`:'<a href="#/"><small>六章读完了 ↗</small>回到目录，再看一遍</a>'}</nav><p class="reader-note">拖动滑块或图中的观察点 · 输入控件获得焦点时可用方向键微调 · 页面空白处按 ← → 翻页 · 读数已四舍五入</p></div>`;
  draw();
}
function draw(){
  if(!current)return;const m=model(current.scene,params);
  document.getElementById('figure-stage').innerHTML=graph(m,'lesson',layers);
  document.getElementById('legend').innerHTML=m.curves.map(c=>`<span><i style="background:${c.color}"></i>${escape(c.label)}</span>`).join('');
  document.getElementById('stats').innerHTML=m.stats.map(s=>`<div class="stat"><span class="stat-label">${escape(s.label)}</span><span class="stat-value">${escape(s.value)}</span></div>`).join('');
  document.getElementById('observation').innerHTML=`<b>此刻看见：</b>${m.note}`;
  for(const c of scenes[current.scene].controls){const el=document.getElementById(`param-${c.key}`);if(document.activeElement!==el)el.value=params[c.key];if(!c.options)document.getElementById(`value-${c.key}`).textContent=fmt(params[c.key],c.step<.01?3:2);}
}
function setParam(key,value,fromDrag=false){
  if(!current)return;const c=scenes[current.scene].controls.find(v=>v.key===key);if(!c)return;
  params[key]=c.options?value:clamp(Math.round(Number(value)/c.step)*c.step,c.min,c.max);
  if(fromDrag)document.getElementById(`param-${key}`).value=params[key];draw();
}
function tick(time){if(!playing||!current)return;const c=scenes[current.scene].controls.find(c=>c.key===scenes[current.scene].animate);const dt=Math.min((time-lastTime)/1000,.05);lastTime=time;phase+=dt*.32;setParam(c.key,c.min+(Math.sin(phase)+1)/2*(c.max-c.min));frame=requestAnimationFrame(tick);}
function answer(choice){if(answered!==null)return;answered=choice;const q=current.question;for(const b of app.querySelectorAll('[data-choice]')){const i=Number(b.dataset.choice);b.disabled=true;b.classList.toggle('correct',i===q.answer);b.classList.toggle('wrong',i===choice&&i!==q.answer);}const area=document.getElementById('answer');area.hidden=false;area.innerHTML=`<strong>${choice===q.answer?'回答正确。':'再比较一下：'}正确答案是 ${'ABCD'[q.answer]}。</strong><p>${q.explain}</p><button type="button" id="retry">重新作答</button>`;completed.add(`${current.chapter.id}/${current.id}`);saveProgress();}
function route(){stop();const value=location.hash||'#/';if(value==='#/'||value==='#'){home();}else{const l=lessons.find(l=>l.route===value);if(l)renderLesson(l);else{current=null;document.title='没有找到这个单元 · 数学展开';app.innerHTML='<section class="error-page"><h1>这一页还没有展开。</h1><p>链接可能不完整。<a href="#/">回到目录，选择一个单元。</a></p></section>';}}window.scrollTo({top:0,behavior:'instant'});const heading=app.querySelector('h1');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}}
app.addEventListener('input',e=>{if(e.target.dataset.param){stop();setParam(e.target.dataset.param,e.target.value);}if(e.target.dataset.layer){layers[e.target.dataset.layer]=e.target.checked;draw();}});
app.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.choice!==undefined)answer(Number(b.dataset.choice));
  if(b.id==='retry'){answered=null;for(const v of app.querySelectorAll('[data-choice]')){v.disabled=false;v.classList.remove('correct','wrong');}document.getElementById('answer').hidden=true;}
  if(b.id==='reset'){stop();params=defaults(current.scene);layers={area:true,lines:true};for(const input of app.querySelectorAll('[data-layer]'))input.checked=true;draw();for(const c of scenes[current.scene].controls)document.getElementById(`param-${c.key}`).value=params[c.key];}
  if(b.id==='play'){if(playing){stop();return;}const c=scenes[current.scene].controls.find(c=>c.key===scenes[current.scene].animate);phase=Math.asin(clamp((params[c.key]-c.min)/(c.max-c.min)*2-1,-1,1));playing=true;b.setAttribute('aria-pressed','true');b.textContent='Ⅱ 暂停变化';lastTime=performance.now();frame=requestAnimationFrame(tick);}
  if(b.id==='hero-approach'){heroParams.h=heroParams.h>.2?.05:1;drawHero();b.textContent=heroParams.h>.2?'让两点更靠近 →':'回到两点分开 ↺';}
});
let drag=null;
app.addEventListener('pointerdown',e=>{
  const handle=e.target.closest('[data-drag]');if(!handle)return;
  const stage=handle.closest('#figure-stage,#hero-plot');if(!stage)return;
  stop();drag={key:handle.dataset.drag,offset:Number(handle.dataset.offset||0),stage,pointer:e.pointerId};stage.setPointerCapture(e.pointerId);e.preventDefault();
});
app.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pointer)return;const isHero=drag.stage.id==='hero-plot',m=model(isHero?'secant':current.scene,isHero?heroParams:params),svg=drag.stage.querySelector('svg');const value=clientToX(svg,e.clientX,m)-drag.offset;
  if(isHero){heroParams[drag.key]=clamp(Math.round(value*100)/100,drag.key==='a'?-1.5:-1.5,1.5);drawHero();}else setParam(drag.key,value,true);
});
function endDrag(){drag=null;}
app.addEventListener('pointerup',endDrag);app.addEventListener('pointercancel',endDrag);window.addEventListener('blur',()=>{endDrag();stop();});document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
app.addEventListener('keydown',e=>{
  const handle=e.target.closest('[data-drag]');if(!handle||!['ArrowLeft','ArrowRight'].includes(e.key))return;e.preventDefault();stop();
  const key=handle.dataset.drag,dir=e.key==='ArrowRight'?1:-1,isHero=!!handle.closest('#hero-plot');
  if(isHero){heroParams[key]=clamp(heroParams[key]+dir*.05,-1.5,1.5);drawHero();document.querySelector(`#hero-plot [data-drag="${key}"]`)?.focus();}
  else{const c=scenes[current.scene].controls.find(c=>c.key===key);setParam(key,params[key]+dir*c.step,true);document.querySelector(`#figure-stage [data-drag="${key}"]`)?.focus();}
});
document.addEventListener('keydown',e=>{if(!current||document.getElementById('reference').open||e.defaultPrevented||e.target.closest('input,select,button,a,[data-drag]')||e.ctrlKey||e.altKey||e.metaKey)return;const i=lessons.indexOf(current),next=lessons[i+(e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0)];if(next&&next!==current){e.preventDefault();location.hash=next.route.slice(1);}});
document.getElementById('reference-body').innerHTML=reference.map(([title,formula,description])=>`<section class="reference-item"><h3>${title}</h3><p class="ref-formula">${formula}</p><p>${description}</p></section>`).join('');
document.getElementById('reference-open').addEventListener('click',()=>{stop();document.getElementById('reference').showModal();});
document.getElementById('reference-close').addEventListener('click',()=>document.getElementById('reference').close());
document.getElementById('reference').addEventListener('click',e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.currentTarget.close();}});
addEventListener('hashchange',route);route();
