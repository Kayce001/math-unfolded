export const colors={ink:'#292c30',red:'#ad4e35',blue:'#467c8d',gold:'#a78642',muted:'#8a8b86'};
export const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
export const fmt=(x,n=2)=>Number.isFinite(x)?Number(x.toFixed(n)).toLocaleString('zh-CN',{maximumFractionDigits:n}):'无定义';
export const derivative=(f,x,h=1e-5)=>(f(x+h)-f(x-h))/(2*h);
export function riemann(f,a,b,n,method='midpoint') {
  const dx=(b-a)/n, offset={left:0,right:1,midpoint:.5}[method];
  return Array.from({length:n},(_,i)=>{const x=a+i*dx;return {x,width:dx,height:f(x+offset*dx)};});
}
export const sumRectangles=rects=>rects.reduce((s,r)=>s+r.width*r.height,0);
export const signedLinearArea=(a,b)=>(b*b-a*a)/2;
export const absoluteLinearArea=(a,b)=>a<=0&&b>=0?(a*a+b*b)/2:Math.abs(signedLinearArea(a,b));
export function newtonSqrt2(start,steps) {
  let x=start;const history=[x];
  for(let i=0;i<steps;i++){x=(x+2/x)/2;history.push(x);}return history;
}
const range=(key,label,min,max,step,value,symbol=key)=>({key,label,min,max,step,value,symbol});
export const scenes={
  affine:{controls:[range('a','斜率',-3,3,.1,1),range('b','竖直平移',-3,3,.1,0)],animate:'a'},
  parabola:{controls:[range('a','开口系数',-2,2,.1,1),range('h','水平平移',-2,2,.1,0),range('k','竖直平移',-2,2,.1,0)],animate:'h'},
  sine:{controls:[range('a','振幅',.2,2,.1,1,'A'),range('k','频率系数',.5,3,.1,1)],animate:'k'},
  removable:{controls:[range('x','靠近的位置',0,2,.01,.5)],animate:'x'},
  jump:{controls:[range('x','靠近的位置',-2,2,.01,-.5)],animate:'x'},
  infinity:{controls:[range('x','向右移动',1,50,.1,5)],animate:'x'},
  secant:{controls:[range('a','起点位置',-1.5,1.5,.05,.5),range('h','两点间隔',-1.5,1.5,.01,1)],animate:'h'},
  tangent:{controls:[range('x','曲线上的位置',-3.1,3.1,.02,.8)],animate:'x'},
  chain:{controls:[range('k','内层变化速度',.5,3,.1,2),range('x','观察位置',-2.5,2.5,.02,.4)],animate:'x'},
  monotonic:{controls:[range('x','观察位置',-2,2,.02,-.5)],animate:'x'},
  optimize:{controls:[range('w','矩形的宽',.2,9.8,.1,3,'w')],animate:'w'},
  newton:{controls:[range('start','初始猜测',.6,2.5,.1,2,'x₀'),range('n','迭代次数',0,5,1,1,'n')],animate:null},
  riemann:{controls:[range('n','矩形数量',2,80,1,8,'n'),{key:'method',label:'取样方式',value:'midpoint',options:[['left','左端点'],['midpoint','中点'],['right','右端点']]}],animate:'n'},
  signed:{controls:[range('b','积分上限',-1,2,.02,1,'b')],animate:'b'},
  velocity:{controls:[range('t','经过的时间',0,4,.02,2,'T')],animate:'t'},
  accumulation:{controls:[range('x','面积的右边界',0,2.5,.02,1.5,'x')],animate:'x'},
  ftc:{controls:[range('x','面积的右边界',0,6.28,.02,1.5,'x')],animate:'x'},
  primitives:{controls:[range('c','竖直平移',-2,2,.1,1,'C'),range('b','积分上限',.2,2,.02,1.5,'b')],animate:'c'},
};
export const defaults=scene=>Object.fromEntries(scenes[scene].controls.map(c=>[c.key,c.value]));
const curve=(fn,label,color=colors.ink,extra={})=>({fn,label,color,...extra});
const point=(x,y,label,color=colors.red,extra={})=>({x,y,label,color,...extra});
const stat=(label,value)=>({label,value});
const area=(fn,a,b,color=colors.red)=>({fn,a,b,color});
export function model(scene,p=defaults(scene)) {
  const m={x:[-3.5,3.5],y:[-3.5,4.5],curves:[],points:[],lines:[],areas:[],rectangles:[],stats:[],note:'',xLabel:'x',yLabel:'y'};
  const tangent=(f,x,d,label='切线')=>{const y=f(x);m.lines.push({x1:x-1.2,y1:y-d*1.2,x2:x+1.2,y2:y+d*1.2,color:colors.red,label});m.points.push(point(x,y,'P',colors.red,{drag:'x'}));};
  switch(scene){
    case 'affine':{
      m.curves=[curve(x=>p.a*x+p.b,'y = ax + b')];m.lines=[{x1:0,y1:p.b,x2:1,y2:p.b,color:colors.blue,dashed:true},{x1:1,y1:p.b,x2:1,y2:p.a+p.b,color:colors.red,dashed:true}];m.points=[point(0,p.b,'(0, b)',colors.blue),point(1,p.a+p.b,'向右 1')];m.stats=[stat('斜率 a',fmt(p.a)),stat('纵截距 b',fmt(p.b)),stat('向右 1，向上',fmt(p.a))];m.note=p.a===0?'斜率为零：无论 x 怎样改变，y 都等于 b。':p.a>0?'直线向右上升：x 每增加 1，y 增加 a。':'直线向右下降：x 每增加 1，y 减少 |a|。';break;
    }
    case 'parabola':{
      m.curves=[curve(x=>x*x,'y = x²',colors.muted,{dashed:true}),curve(x=>p.a*(x-p.h)**2+p.k,'y = a(x − h)² + k')];m.points=[point(p.h,p.k,p.a===0?'参考点':'顶点',colors.red,{drag:'h'})];m.stats=[stat(p.a===0?'参考位置':'顶点',`(${fmt(p.h)}, ${fmt(p.k)})`),stat('开口方向',p.a===0?'退化为直线':p.a>0?'向上':'向下')];m.note=p.a===0?'a = 0 时不再是二次函数，而是水平直线 y = k。':'注意括号里的减号：h 增大，顶点反而向右移动。';break;
    }
    case 'sine':{
      m.x=[-6.5,6.5];m.y=[-2.8,2.8];m.curves=[curve(x=>p.a*Math.sin(p.k*x),'y = A sin(kx)')];m.lines=[{x1:0,y1:p.a,x2:2*Math.PI/p.k,y2:p.a,color:colors.blue,dashed:true}];m.stats=[stat('振幅',fmt(p.a)),stat('周期 2π/k',fmt(2*Math.PI/p.k)),stat('x = π/2 时的 y',fmt(p.a*Math.sin(p.k*Math.PI/2)))];m.note='A 改变上下振动的幅度；k 增大，一个完整周期在横轴上占据的长度变短。';break;
    }
    case 'removable':{
      m.x=[-.4,2.4];m.y=[-.3,3.7];m.curves=[curve(x=>x===1?NaN:x+1,'f(x) = (x² − 1)/(x − 1)')];m.points=[point(1,2,'缺口',colors.ink,{open:true}),point(1,3,'f(1) = 3',colors.blue)];if(p.x!==1)m.points.push(point(p.x,p.x+1,'观察点',colors.red,{drag:'x'}));m.stats=[stat('位置 x',fmt(p.x)),stat('函数值',fmt(p.x===1?3:p.x+1)),stat('x → 1 的极限','2')];m.note=p.x===1?'此处单独规定 f(1) = 3；它与两侧逼近的值 2 不同。':'沿直线从两侧靠近缺口，函数值都趋近 2，而不是孤立点的高度 3。';break;
    }
    case 'jump':{
      m.y=[-.7,2.7];m.curves=[curve(x=>x<0?0:NaN,'x < 0：f(x) = 0'),curve(x=>x>0?2:NaN,'x > 0：f(x) = 2',colors.blue)];m.points=[point(0,0,'左侧趋近 0',colors.ink,{open:true}),point(0,2,'右侧趋近 2',colors.blue,{open:true}),point(0,1,'f(0) = 1',colors.gold),point(p.x,p.x===0?1:p.x<0?0:2,'观察点',colors.red,{drag:'x'})];m.stats=[stat('左极限','0'),stat('右极限','2'),stat('两侧极限','不存在')];m.note='函数在 0 处有定义，也不能让两个不同的单侧极限变成同一个值。';break;
    }
    case 'infinity':{
      m.x=[0,52];m.y=[-.2,1.3];m.curves=[curve(x=>x>.15?1/x:NaN,'y = 1/x')];m.points=[point(p.x,1/p.x,'P',colors.red,{drag:'x'})];m.lines=[{x1:0,y1:.1,x2:52,y2:.1,color:colors.blue,dashed:true,label:'y = 0.1'}];m.stats=[stat('x',fmt(p.x)),stat('1/x',fmt(1/p.x,4)),stat('与 0 的距离',fmt(1/p.x,4))];m.note='每个有限的正 x 都对应正函数值；趋近 0 并不意味着必须在某一点等于 0。';break;
    }
    case 'secant':{
      const a=p.a,h=p.h,f=x=>x*x,slope=h===0?NaN:2*a+h;m.y=[-1,10];m.curves=[curve(f,'f(x) = x²')];m.points=[point(a,f(a),'P',colors.blue,{drag:'a'})];m.lines.push({x1:a-1,y1:f(a)-2*a,x2:a+1,y2:f(a)+2*a,color:colors.blue,dashed:true,label:'极限位置的切线'});if(h!==0){m.points.push(point(a+h,f(a+h),'Q',colors.red,{drag:'h',offset:a}));m.lines.push({x1:a-.7,y1:f(a)-.7*slope,x2:a+h+.7,y2:f(a)+(h+.7)*slope,color:colors.red,label:'割线'});}m.stats=[stat('间隔 h',fmt(h)),stat('割线斜率',fmt(slope)),stat('切线斜率 2a',fmt(2*a))];m.note=h===0?'h = 0 时差商是 0/0，没有定义；导数来自 h 趋于 0 的极限。':'把 h 调向 0，也试试负数。两侧割线的斜率都趋近 2a。';break;
    }
    case 'tangent':{
      const f=Math.sin;m.y=[-2,2];m.curves=[curve(f,'f(x) = sin x')];tangent(f,p.x,Math.cos(p.x));m.stats=[stat('x',fmt(p.x)),stat('函数值 sin x',fmt(f(p.x))),stat('斜率 cos x',fmt(Math.cos(p.x)))];m.note='点在波峰或波谷时，切线是水平的。斜率为零表示瞬时不升不降，不表示函数值为零。';break;
    }
    case 'chain':{
      const f=x=>Math.sin(p.k*x),d=p.k*Math.cos(p.k*p.x);m.y=[-3,3];m.curves=[curve(f,'y = sin(kx)')];tangent(f,p.x,d);m.stats=[stat('内层变化率 k',fmt(p.k)),stat('外层变化率 cos(kx)',fmt(Math.cos(p.k*p.x))),stat('总变化率',fmt(d))];m.note='总变化率 = 外层对内层的变化率 × 内层对 x 的变化率。角度使用弧度。';break;
    }
    case 'monotonic':{
      const f=x=>x**3-3*x,d=3*p.x*p.x-3;m.x=[-2.3,2.3];m.y=[-4,4];m.curves=[curve(f,'f(x) = x³ − 3x')];tangent(f,p.x,d);m.points.push(point(-1,2,'局部极大',colors.blue),point(1,-2,'局部极小',colors.blue));m.stats=[stat('x',fmt(p.x)),stat('f′(x)',fmt(d)),stat('局部趋势',Math.abs(d)<1e-9?'驻点':d>0?'递增':'递减')];m.note='导数在 −1 左侧为正、中间为负、1 右侧为正；极值判断要结合驻点两边的符号。';break;
    }
    case 'optimize':{
      const w=p.w,h=10-w;m.x=[-.5,10.5];m.y=[-2,29];m.curves=[curve(x=>x>=0&&x<=10?x*(10-x):NaN,'面积 A(w) = w(10 − w)')];m.points=[point(w,w*h,'当前面积',colors.red,{drag:'w'}),point(5,25,'最大面积',colors.blue)];m.inset={width:w,height:h};m.stats=[stat('宽 / 长',`${fmt(w)} / ${fmt(h)}`),stat('面积',fmt(w*h)),stat('A′(w) = 10 − 2w',fmt(10-2*w))];m.note='周长固定为 20，所以长与宽相加为 10。最优点是正方形，且两边的面积都在变小。';break;
    }
    case 'newton':{
      const history=newtonSqrt2(p.start,p.n),x=history.at(-1),f=x=>x*x-2;m.x=[0,3];m.y=[-2.5,5];m.curves=[curve(f,'f(x) = x² − 2')];history.forEach((x,i)=>m.points.push(point(x,0,i===history.length-1?'xₙ':'',i===history.length-1?colors.red:colors.muted,{small:i!==history.length-1})));m.lines=[{x1:x,y1:f(x),x2:(x+2/x)/2,y2:0,color:colors.red,label:'切线与横轴相交'}];m.points.push(point(x,f(x),'曲线上的点',colors.red));m.stats=[stat('当前近似',fmt(x,6)),stat('方程残差 x² − 2',fmt(f(x),6)),stat('迭代次数',p.n)];m.note='切线与横轴的交点成为下次猜测。本例初值限定为正数；一般方程的牛顿法不保证收敛。';break;
    }
    case 'riemann':{
      m.x=[-.12,1.15];m.y=[-.1,1.2];const f=x=>x*x;m.curves=[curve(f,'f(x) = x²')];m.rectangles=riemann(f,0,1,p.n,p.method);const sum=sumRectangles(m.rectangles);m.stats=[stat('矩形数量',p.n),stat('矩形面积之和',fmt(sum,5)),stat('与 1/3 的误差',fmt(sum-1/3,5))];m.note='比较左端点、中点与右端点取样。矩形数量增加时，三种面积和都趋近同一个积分值 1/3。';break;
    }
    case 'signed':{
      m.x=[-1.7,2.5];m.y=[-1.8,2.8];m.curves=[curve(x=>x,'f(x) = x')];m.areas=[area(x=>x,-1,p.b)];m.points=[point(p.b,p.b,'上限 b',colors.red,{drag:'b'})];m.stats=[stat('有向面积 ∫₋₁ᵇ x dx',fmt(signedLinearArea(-1,p.b))),stat('几何面积',fmt(absoluteLinearArea(-1,p.b))),stat('上限 b',fmt(p.b))];m.note='横轴上方记正、下方记负。b = 1 时，积分为 0，但两块区域的几何面积相加为 1。';break;
    }
    case 'velocity':{
      m.x=[-.3,4.6];m.y=[-.6,9];m.xLabel='t / s';m.yLabel='v / (m/s)';m.curves=[curve(x=>2*x,'v(t) = 2t')];m.areas=[area(x=>2*x,0,p.t)];m.points=[point(p.t,2*p.t,'T',colors.red,{drag:'t'})];m.stats=[stat('时间 T',`${fmt(p.t)} s`),stat('末速度',`${fmt(2*p.t)} m/s`),stat('位移 ∫₀ᵀ 2t dt',`${fmt(p.t*p.t)} m`)];m.note='速度乘时间的单位是米。把每一小段时间里的位移累加，就得到总位移；本例速度非负，所以也等于路程。';break;
    }
    case 'accumulation':{
      m.x=[-.3,2.9];m.y=[-.5,7];m.curves=[curve(x=>x*x,'被积函数 f(t) = t²')];m.areas=[area(x=>x*x,0,p.x)];m.points=[point(p.x,p.x*p.x,'右边界',colors.red,{drag:'x'})];m.stats=[stat('边界 x',fmt(p.x)),stat('累计面积 A(x)',fmt(p.x**3/3,4)),stat('边界高度 f(x)',fmt(p.x*p.x,4))];m.note='右边界向右挪一小段 Δx，新增加的窄条面积约为 f(x)Δx。因此 A 的变化率是边界处的高度。';break;
    }
    case 'ftc':{
      m.x=[-.4,6.7];m.y=[-1.6,2.8];m.curves=[curve(Math.sin,'f(x) = sin x',colors.ink),curve(x=>1-Math.cos(x),'A(x) = 1 − cos x',colors.blue)];m.areas=[area(Math.sin,0,p.x)];m.points=[point(p.x,Math.sin(p.x),'f(x)',colors.red,{drag:'x'}),point(p.x,1-Math.cos(p.x),'A(x)',colors.blue)];m.lines=[{x1:p.x-.6,y1:1-Math.cos(p.x)-.6*Math.sin(p.x),x2:p.x+.6,y2:1-Math.cos(p.x)+.6*Math.sin(p.x),color:colors.blue,label:'A 的切线'}];m.stats=[stat('累计有向面积 A(x)',fmt(1-Math.cos(p.x),4)),stat('A 的斜率',fmt(Math.sin(p.x),4)),stat('原函数高度 f(x)',fmt(Math.sin(p.x),4))];m.note='当 sin x 为负，面积函数开始下降。蓝线的斜率始终等于黑线同一位置的高度。';break;
    }
    case 'primitives':{
      m.x=[-.4,2.6];m.y=[-2.5,7];m.curves=[curve(x=>x*x+p.c,'F(x) = x² + C',colors.blue),curve(x=>2*x,'f(x) = 2x',colors.ink)];m.points=[point(0,p.c,'F(0)',colors.blue),point(p.b,p.b*p.b+p.c,'F(b)',colors.red,{drag:'b'})];m.stats=[stat('F(b)',fmt(p.b*p.b+p.c)),stat('F(0)',fmt(p.c)),stat('F(b) − F(0)',fmt(p.b*p.b))];m.note='改变 C 会把整条原函数曲线抬高或降低，但端点之差保持不变，恰好等于 ∫₀ᵇ 2x dx。';break;
    }
    default:throw new Error(`Unknown scene: ${scene}`);
  }
  return m;
}
