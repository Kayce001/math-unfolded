import {DURATION,beats,beatAt,reading,tasks,taskMatches,questions,mastery} from './slope-model.js';

const root=document.getElementById('lesson'),KEY='math-unfolded-slope-v1';
let mode='watch',time=0,playing=false,frame=0,previous=0,k=2,dx=1,task=0,prediction=null;
let passed=[],answers=[],watchSeconds=0;
try{const s=JSON.parse(localStorage.getItem(KEY)||'{}');passed=Array.isArray(s.passed)?s.passed.filter(i=>Number.isInteger(i)&&i>=0&&i<tasks.length):[];answers=Array.isArray(s.answers)?questions.map((q,i)=>Number.isInteger(s.answers[i])&&s.answers[i]>=0&&s.answers[i]<q.choices.length?s.answers[i]:null):[];watchSeconds=Math.max(0,Math.min(DURATION,Number(s.watchSeconds)||0));}catch{}
function save(){try{localStorage.setItem(KEY,JSON.stringify({passed,answers,watchSeconds}));}catch{}}
const n=v=>Number(v.toFixed(2)).toString().replace('-','−');
const clock=t=>`${Math.floor(t/60)}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const line=(x1,y1,x2,y2,color,width=1,dash='')=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}" ${dash?`stroke-dasharray="${dash}"`:''}/>`;
const txt=(x,y,t,cls='',anchor='middle')=>`<text x="${x}" y="${y}" text-anchor="${anchor}" class="${cls}">${t}</text>`;
const red='#ad4e35',blue='#467c8d',grid='#e4e3dc';
function plot(slope,interval=1,{motion=false,comparison=false,triangle=true,reveal=1,triangleProgress=1}={}){
  const X=x=>56+x*115,Y=y=>178-y*10.5;
  const m=reading(slope,interval);let s='';
  for(let x=0;x<=4;x++){s+=line(X(x),38,X(x),310,grid);s+=txt(X(x),335,x);}
  const yticks=[-12,-6,0,6,12];
  for(const y of yticks){s+=line(56,Y(y),516,Y(y),grid);s+=txt(44,Y(y)+5,y,'','end');}
  s+=line(56,Y(0),526,Y(0),'#a1a197',1.2)+line(56,28,56,313,'#a1a197',1.2);
  s+=txt(516,360,motion?'时间（分钟）':'x','','end')+txt(56,19,motion?'路程（米）':'y','axis-title','start');
  if(comparison)s+=line(X(0),Y(0),X(4*reveal),Y(4*reveal),blue,2.5)+txt(X(3.65),Y(3.65)-13,'每分钟 1 米','','end');
  s+=line(X(0),Y(0),X(4*reveal),Y(slope*4*reveal),red,3);
  if(triangle){
    s+=`<path d="M${X(1)},${Y(m.p.y)}H${X(1+interval)}V${Y(m.q.y)}Z" fill="${red}" opacity=".07"/>`;
    const horizontal=Math.min(1,triangleProgress*2),vertical=Math.max(0,triangleProgress*2-1);
    s+=line(X(1),Y(m.p.y),X(1+interval*horizontal),Y(m.p.y),blue,2,'5 4')+line(X(1+interval),Y(m.p.y),X(1+interval),Y(m.p.y+(m.q.y-m.p.y)*vertical),red,2,'5 4');
    s+=txt(X(1+interval/2),Y(m.p.y)+23,`Δx = ${interval}`,'point-text');
    s+=txt(X(1+interval)+10,(Y(m.p.y)+Y(m.q.y))/2-6,`Δy = ${n(m.dy)}`,'point-text','start');
    for(const [label,p] of [['P',m.p],['Q',m.q]])s+=`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="5" fill="${red}" stroke="#fcfbf8" stroke-width="2"/>`+txt(X(p.x)-12,Y(p.y)-12,label,'point-text');
  }
  s+=txt(510,44,motion?'固定刻度':'一般坐标图 · 固定刻度','','end');
  return `<svg class="slope-visual" viewBox="0 0 570 380" role="img" aria-label="${motion?'路程时间图':'坐标图'}：斜率 ${slope}，横向变化 ${interval}，纵向变化 ${n(m.dy)}。${comparison?'青线斜率为 1。':''}">${s}</svg>`;
}
function walkers(t){
  let s='';const mins=Math.min(4,t/3);
  for(const [row,speed,color,name] of [[0,1,blue,'青色'],[1,2,red,'红色']]){
    const yy=112+row*137,pos=65+speed*mins/8*435,leg=Math.sin(t*7)*9;
    s+=txt(65,yy-46,`${name} · 每分钟 ${speed} 米`,'track-name','start');
    s+=line(65,yy+28,500,yy+28,grid,2);
    for(let a=0;a<=8;a+=2)s+=line(65+a/8*435,yy+24,65+a/8*435,yy+33,'#bfbfb6')+txt(65+a/8*435,yy+54,`${a}`);
    s+=`<g transform="translate(${pos},${yy})" stroke="${color}" stroke-width="3" stroke-linecap="round" fill="none"><circle cy="-22" r="7" fill="${color}"/><path d="M0 -14V5M0 -6L-10 ${4+leg/2}M0 -6L10 ${4-leg/2}M0 5L${-8-leg/2} 25M0 5L${8+leg/2} 25"/></g>`;
  }
  s+=txt(500,360,'刻度：米','','end')+txt(65,27,`经过 ${n(mins)} 分钟`,'math-label','start');
  return `<svg class="slope-visual" viewBox="0 0 570 380" role="img" aria-label="两人匀速行走，${n(mins)} 分钟后分别走过 ${n(mins)} 米与 ${n(2*mins)} 米。">${s}</svg>`;
}
function pause(){playing=false;cancelAnimationFrame(frame);frame=0;syncTransport();save();}
function syncTransport(){const b=document.getElementById('movie-play');if(b){b.textContent=playing?'Ⅱ 暂停':time>=DURATION?'↺ 重新播放':'▷ 播放动画';b.setAttribute('aria-pressed',String(playing));}}
function movieFrame(){
  const b=beatAt(time),idx=beats.indexOf(b),stage=document.getElementById('visual');if(!stage)return;
  stage.innerHTML=b.view==='walk'?walkers(time):plot(2,b.view==='wide'||b.view==='formula'?2:1,{motion:true,comparison:idx<3,triangle:idx>=3,reveal:idx===1?Math.min(1,(time-12)/10):1,triangleProgress:Math.min(1,(time-b.start)/4)});
  document.getElementById('movie-title').textContent=b.title;document.getElementById('movie-caption').textContent=b.text;
  document.getElementById('movie-clock').textContent=`${clock(time)} / 1:12`;
  document.getElementById('movie-timeline').value=time;
  document.getElementById('formula-readout').innerHTML=idx>=3?`<span>斜率 = <b>Δy / Δx</b></span><span>${idx>=4?'4 / 2':'2 / 1'} = <b>2</b></span>`:'<span>同一起点 · 匀速运动 · 固定刻度</span>';
  for(const el of root.querySelectorAll('[data-beat]')){const active=Number(el.dataset.beat)===idx;el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','true');else el.removeAttribute('aria-current');}
  document.getElementById('movie-end').hidden=time<DURATION;
}
function tick(now){if(!playing||mode!=='watch')return;const elapsed=Math.min((now-previous)/1000,.15);previous=now;time=Math.min(DURATION,time+elapsed);watchSeconds=Math.min(DURATION,watchSeconds+elapsed);movieFrame();if(time>=DURATION){pause();return;}frame=requestAnimationFrame(tick);}
function togglePlay(){if(playing){pause();return;}if(time>=DURATION)time=0;root.querySelector('.pilot-workspace').scrollIntoView({block:'start',behavior:'instant'});playing=true;previous=performance.now();syncTransport();frame=requestAnimationFrame(tick);}
function renderWatch(){
  root.innerHTML=`<div class="pilot-workspace"><section class="visual-column" aria-label="斜率字幕动画"><div class="visual-label"><span>一段运动，变成一条直线</span><span>72 秒 · 无声字幕</span></div><div id="visual"></div><div id="formula-readout" class="formula-strip"></div><div class="transport"><button class="action" id="movie-play" aria-pressed="false">▷ 播放动画</button><button class="action outline" id="movie-back">后退 10 秒</button><span class="clock" id="movie-clock"></span></div><label class="timeline-label" for="movie-timeline"><span>动画进度 · 可以拖动回看</span><span>1:12</span></label><input class="timeline" id="movie-timeline" type="range" min="0" max="72" step="0.1" value="${time}"><div class="caption" aria-label="当前讲解字幕"><h2 id="movie-title"></h2><p id="movie-caption"></p></div><p id="movie-end" class="feedback" hidden>动画已到结尾。现在先预测，再用同一组图形验证。</p></section><aside class="lesson-sidebar"><div class="eyebrow">01 / 先形成一个印象</div><h2>为什么有的直线<br>更陡一些？</h2><p>先看两个人怎样行走，再看图像怎样把变化留下来。</p><ol aria-label="动画六个片段">${beats.map((b,i)=>`<li class="beat" data-beat="${i}"><span>${clock(b.start)}</span>${b.title}</li>`).join('')}</ol><div class="aside-bottom"><button class="action" data-mode="explore">去预测与探索 →</button><p class="hint-note">可以直接探索；需要时随时回看。动画不会自动播放。</p></div></aside></div>`;movieFrame();syncTransport();
}
function exploreDrawing(){const m=reading(k,dx);document.getElementById('visual').innerHTML=plot(k,dx);document.getElementById('slope-value').textContent=n(k);document.getElementById('interval-value').textContent=dx;document.getElementById('live-formula').textContent=`${n(m.dy)} / ${dx} = ${n(k)}`;document.getElementById('live-explain').textContent=k===0?'x 改变时，y 不变。斜率为 0，这条直线与横轴重合。':`x 每增加 1，y ${k>0?'增加':'减少'} ${n(Math.abs(k))}。${k<0?'负号表示变化的方向。':'正号表示 y 随 x 增加而增加。'}`;document.getElementById('table-values').innerHTML=`<tr><th scope="row">x</th>${m.values.map(v=>`<td>${v.x}</td>`).join('')}</tr><tr><th scope="row">y</th>${m.values.map(v=>`<td>${n(v.y)}</td>`).join('')}</tr>`;}
function taskHTML(){return `<div class="task-box"><div class="task-dots" aria-label="已完成 ${passed.length} / 3 个操作任务">${tasks.map((_,i)=>`<span class="${passed.includes(i)?'done':''}"></span>`).join('')}</div><div class="eyebrow">操作任务 ${task+1} / 3</div><h3>${tasks[task].title}</h3><p>${tasks[task].hint}</p><button class="action" id="task-check">检查我的图形</button><div id="task-feedback" class="feedback" aria-live="polite"></div><button class="action outline" id="task-next" ${passed.includes(task)?'':'hidden'}>${task<2?'下一个操作任务 →':'去检验理解 →'}</button></div>`;}
function renderExplore(){
  root.innerHTML=`<div class="prediction"><h3>先别动手：把斜率从 2 改成 1，会发生什么？</h3><p>仍是同一起点，坐标轴的刻度也不变。想一想，再选一个答案。</p><div class="prediction-options">${['直线更平缓，每单位横向变化对应的纵向变化减半','直线更陡，每单位纵向变化翻倍','直线只会整体向上移动'].map((s,i)=>`<button data-predict="${i}" aria-pressed="${prediction===i}">${s}</button>`).join('')}</div><div class="feedback" id="prediction-feedback" aria-live="polite"></div><button class="action" id="prediction-try" ${prediction===null?'hidden':''}>把斜率设为 1，验证预测 ↓</button></div><div class="pilot-workspace"><section class="visual-column" aria-label="斜率交互实验"><div class="visual-label"><span>和动画同一组刻度 · 现在由你改变</span><span>y = kx</span></div><div id="visual"></div><div class="formula-strip"><span>斜率 = Δy / Δx</span><b id="live-formula"></b></div><table class="data-table" aria-label="函数值表"><tbody id="table-values"></tbody></table><p id="live-explain" class="feedback" aria-live="polite"></p><p class="hint-note">现在是一般坐标图。负的 y 可以表示温度、位置等量，不表示负的路程。两点 P、Q 的横向间隔始终不为零。</p></section><aside class="lesson-sidebar"><div class="eyebrow">02 / 用变化，验证你的想法</div><h2>改变斜率，<br>观察同一张图。</h2><div class="parameter"><label for="slope-k">斜率 k <output id="slope-value"></output></label><input id="slope-k" type="range" min="-3" max="3" step="0.5" value="${k}"><div class="preset-row"><button data-k="2">正斜率 2</button><button data-k="0">零斜率</button><button data-k="-1.5">负斜率 −1.5</button></div></div><div class="parameter"><label for="slope-dx">两点的横向间隔 Δx <output id="interval-value"></output></label><input id="slope-dx" type="range" min="1" max="2" step="1" value="${dx}"><p class="hint-note">换一个间隔，比较变化量与它们的比值。</p></div><div id="task-container" style="width:100%">${taskHTML()}</div><div class="skip-row"><button class="action outline" id="explore-reset">重置图形</button><button class="action outline" data-mode="check">去检验理解 →</button></div></aside></div>`;
  exploreDrawing();if(prediction!==null)predictionFeedback();
}
function predictionFeedback(){document.getElementById('prediction-feedback').textContent=prediction===0?'你的预测正确：从 2 变成 1，同样横向增加 1，纵向增加从 2 变成 1。点击下方按钮亲自验证。':'再对照一下：k 从 2 变成 1，表示每单位横向变化对应的纵向变化减半。它改变直线的倾斜程度；截距仍为 0。点击下方按钮验证。';}
function renderCheck(){
  const correct=questions.filter((q,i)=>answers[i]===q.answer).length,done=mastery(passed,answers);
  root.innerHTML=`<p class="step-intro">换一组条件，看看这个理解能否带走。题目与探索页当前参数独立；可以修改答案。</p><div class="check-layout"><div class="quiz-list">${questions.map((q,i)=>`<section class="quiz-card"><h2>${q.title}</h2><p>${q.text}</p><div class="quiz-options">${q.choices.map((c,j)=>`<button data-question="${i}" data-answer="${j}" aria-pressed="${answers[i]===j}" class="${answers[i]===j?(j===q.answer?'correct':'wrong'):''}">${String.fromCharCode(65+j)} · ${c}</button>`).join('')}</div>${answers[i]!=null?`<div class="feedback" role="status"><strong>${answers[i]===q.answer?'回答正确。':'再想一想，可以修改答案。'}</strong> ${q.explain}</div>`:''}</section>`).join('')}</div><aside class="check-summary"><div class="eyebrow">03 / 带走一个理解</div><h2>${done?'你完成了这一节。':'会看，也要会解释。'}</h2><div class="summary-number">${correct} / 3</div><p>理解题答对 ${correct} 道；探索页操作任务完成 ${passed.length} / 3 个。</p><p class="${done?'completion-note':''}">${done?'三项操作任务与三道理解题都已完成。试着不用公式，用自己的话解释一次斜率。':'完成三项操作任务，并答对三道理解题后，才会记录本节完成。答错也可以回到图形重新验证。'}</p><p>记住：斜率 = 纵向变化 ÷ 横向变化。对 y = kx，斜率就是 k；横向变化不能为 0。</p><div class="summary-actions"><button class="action" data-mode="explore">回到图形验证</button><button class="action outline" data-mode="watch">回看动画</button><button class="action outline" id="clear-progress">清除本节进度</button></div><p class="hint-note">记录仅存于当前浏览器。完成任务不等于已证明长期掌握。</p></aside></div>`;
}
function changeMode(next){pause();mode=next;for(const b of document.querySelectorAll('[data-mode]')){if(b.closest('.learning-steps')){if(b.dataset.mode===mode)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');}}if(mode==='watch')renderWatch();else if(mode==='explore')renderExplore();else renderCheck();}
document.addEventListener('click',e=>{
  const b=e.target.closest('button');if(!b)return;
  if(b.dataset.mode){changeMode(b.dataset.mode);document.querySelector(`.learning-steps [data-mode="${mode}"]`).focus({preventScroll:true});return;}
  if(b.id==='movie-play')togglePlay();
  if(b.id==='movie-back'){pause();time=Math.max(0,time-10);movieFrame();syncTransport();}
  if(b.dataset.predict!==undefined){prediction=Number(b.dataset.predict);for(const v of root.querySelectorAll('[data-predict]'))v.setAttribute('aria-pressed',String(Number(v.dataset.predict)===prediction));predictionFeedback();document.getElementById('prediction-try').hidden=false;}
  if(b.id==='prediction-try'){k=1;document.getElementById('slope-k').value=k;exploreDrawing();document.getElementById('slope-k').focus();}
  if(b.dataset.k!==undefined){k=Number(b.dataset.k);document.getElementById('slope-k').value=k;exploreDrawing();clearTaskFeedback();}
  if(b.id==='explore-reset'){k=2;dx=1;document.getElementById('slope-k').value=k;document.getElementById('slope-dx').value=dx;exploreDrawing();clearTaskFeedback();}
  if(b.id==='task-check'){const success=taskMatches(task,k);if(success&&!passed.includes(task))passed.push(task);passed.sort();save();document.getElementById('task-feedback').textContent=success?`验证通过。${tasks[task].explain}`:`还没满足条件。当前 k = ${n(k)}，请根据“x 每增加 1，y 怎样变化”再调整。`;document.getElementById('task-next').hidden=!success;const dots=root.querySelector('.task-dots');dots.setAttribute('aria-label',`已完成 ${passed.length} / 3 个操作任务`);for(const [i,el] of [...dots.children].entries())el.classList.toggle('done',passed.includes(i));}
  if(b.id==='task-next'){if(task<2){task++;document.getElementById('task-container').innerHTML=taskHTML();}else changeMode('check');}
  if(b.dataset.question!==undefined){const i=Number(b.dataset.question),j=Number(b.dataset.answer);answers[i]=j;save();renderCheck();root.querySelector(`[data-question="${i}"][data-answer="${j}"]`).focus({preventScroll:true});}
  if(b.id==='clear-progress'){passed=[];answers=[];watchSeconds=0;task=0;save();renderCheck();document.getElementById('clear-progress').focus({preventScroll:true});}
});
function clearTaskFeedback(){document.getElementById('task-feedback').textContent='';document.getElementById('task-next').hidden=!passed.includes(task);}
root.addEventListener('input',e=>{
  if(e.target.id==='movie-timeline'){pause();time=Number(e.target.value);movieFrame();syncTransport();}
  if(e.target.id==='slope-k'){k=Number(e.target.value);exploreDrawing();clearTaskFeedback();}
  if(e.target.id==='slope-dx'){dx=Number(e.target.value);exploreDrawing();clearTaskFeedback();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();});
window.addEventListener('pagehide',pause);window.addEventListener('blur',()=>{if(playing)pause();});
renderWatch();
