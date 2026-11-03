// Original lesson model: y = kx, with the intercept fixed at zero.
import {narrationTiming} from './slope-timing.js';
export const DURATION = narrationTiming.duration;
export const beats = narrationTiming.beats;
export const sentences = narrationTiming.sentences;
export function sentenceAt(time){return sentences.find(s=>time<s.end)||sentences.at(-1);}
const progress=(time,start,end)=>Math.max(0,Math.min(1,(time-start)/Math.max(.01,end-start)));
export function animationAt(time){
  const b=beatAt(time),rows=sentences.filter(s=>s.beat===b.id);
  const interval=b.view==='wide'?1+progress(time,rows[0].start,rows[0].audioEnd):b.view==='formula'?2:1;
  const change=rows[1]||rows[0],mid=(change.start+change.audioEnd)/2;
  return {beat:b,sentence:sentenceAt(time),interval,
    walkMinutes:4*progress(time,rows[0].start,b.end),
    reveal:b.id==='B002'?progress(time,rows[0].start,b.end):1,
    horizontal:b.id==='B004'?progress(time,change.start,mid):1,
    vertical:b.id==='B004'?progress(time,mid,change.audioEnd):1};
}
export function beatAt(time){const t=Math.min(DURATION,Math.max(0,Number(time)||0));return beats.find(b=>t<b.end)||beats.at(-1);}
export function reading(k,dx=1){
  if(!Number.isFinite(k)||!Number.isFinite(dx)||dx<=0||dx>3)throw new RangeError('Invalid slope or interval');
  return {k,dx,dy:k*dx,p:{x:1,y:k},q:{x:1+dx,y:k*(1+dx)},values:[0,1,2,3,4].map(x=>({x,y:k*x}))};
}
export const tasks=[
  {target:2,title:'让 y 每次增加 2',hint:'x 每增加 1，y 就增加 2。请调整斜率。',explain:'k = 2：横向增加 1，纵向增加 2。'},
  {target:0,title:'让 y 保持不变',hint:'x 在变化，y 始终为 0。这样的直线斜率是多少？',explain:'k = 0：横向变化时，纵向变化为 0。直线与横轴重合。'},
  {target:-1.5,title:'让 y 每次减少 1.5',hint:'现在看一般坐标图，不再把 y 当作走过的路程。x 每增加 1，y 减少 1.5。',explain:'k = −1.5：负号表示 y 随 x 增加而减少；变化量之比是 −1.5。'},
];
export function taskMatches(index,k){return !!tasks[index]&&Number.isFinite(k)&&Math.abs(tasks[index].target-k)<1e-8;}
export const questions=[
  {title:'01 / 从读数判断',text:'一条直线上，x 从 1 增加到 3，y 从 3 增加到 9。斜率是多少？',choices:['3，因为 (9 − 3) ÷ (3 − 1) = 3','6，因为 y 增加了 6','9，因为终点的 y 是 9'],answer:0,explain:'横向变化是 2，纵向变化是 6。斜率是 6 ÷ 2 = 3，不能只看纵向变化或终点高度。'},
  {title:'02 / 解释负号',text:'在一般坐标系中，直线斜率为 −2。x 增加 1 时，y 怎样变化？',choices:['增加 2','减少 2','保持不变'],answer:1,explain:'斜率 −2 表示 Δy ÷ Δx = −2。横向增加 1，纵向变化为 −2，也就是减少 2。这里的 y 是一般变量。'},
  {title:'03 / 换一个横向间隔',text:'在 y = 1.5x 上，x 增加 2，y 会增加多少？',choices:['1.5','2','3'],answer:2,explain:'纵向变化 = 斜率 × 横向变化 = 1.5 × 2 = 3。斜率 1.5 描述每单位横向变化，不是所有间隔的纵向变化。'},
];
export function mastery(passed,answers){return tasks.every((_,i)=>passed.includes(i))&&questions.every((q,i)=>answers[i]===q.answer);}
