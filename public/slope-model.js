// Original lesson model: y = kx, with the intercept fixed at zero.
export const DURATION = 72;
export const beats = [
  {start:0,end:12,title:'同样一分钟，谁走得更远？',text:'两个人从同一起点出发，匀速向前走。青色每分钟走 1 米，红色每分钟走 2 米。',view:'walk',k:2},
  {start:12,end:24,title:'把运动，留在一张图上',text:'横轴记录时间，纵轴记录走过的路程。同样一分钟，红色增加的路程更多。',view:'motion',k:2},
  {start:24,end:36,title:'直线的陡缓，记录变化的快慢',text:'青线每向右走 1 格，就向上走 1 格；红线每向右走 1 格，就向上走 2 格。两条轴的刻度固定。',view:'motion',k:2},
  {start:36,end:48,title:'横着走多少，竖着变多少',text:'看红线上的两个点：横向增加 1，纵向增加 2。纵向变化除以横向变化，得到 2。这就是这条直线的斜率。',view:'triangle',k:2},
  {start:48,end:60,title:'换两个点，比例还是一样',text:'横向增加 2，纵向就增加 4。4 除以 2 仍然是 2。直线上两点的位置可以改变，斜率不变。',view:'wide',k:2},
  {start:60,end:72,title:'斜率，是每单位横向变化对应的纵向变化',text:'对于 y = kx，斜率就是 k。刚才的路程图中，它的单位是米每分钟。接下来，先预测，再亲手验证。',view:'formula',k:2},
];
export function beatAt(time){const t=Math.min(DURATION,Math.max(0,Number(time)||0));return beats.find(b=>t<b.end)||beats.at(-1);}
export function reading(k,dx=1){
  if(!Number.isFinite(k)||![1,2].includes(dx))throw new RangeError('Invalid slope or interval');
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
