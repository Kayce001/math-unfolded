import test from 'node:test';
import assert from 'node:assert/strict';
import {model,defaults,scenes,derivative,riemann,sumRectangles,signedLinearArea,absoluteLinearArea,newtonSqrt2} from '../public/math.js';
import {chapters,lessons} from '../public/content.js';
const near=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,`${a} ≠ ${b}`);

test('18 learning units have valid models, controls and independent exercises',()=>{
  assert.equal(chapters.length,6);assert.equal(lessons.length,18);
  assert.equal(new Set(lessons.map(l=>l.route)).size,18);
  for(const l of lessons){assert.ok(scenes[l.scene]);assert.ok(l.question.explain);assert.ok(l.question.choices[l.question.answer]);assert.ok(l.paragraphs.length>=2);}
});
test('secant slopes approach 2a from both sides; zero interval remains undefined',()=>{
  for(const a of [-1.2,0,.7,1.5])for(const sign of [-1,1]){
    const errors=[.1,.01,.001].map(h=>Math.abs(Number(model('secant',{a,h:h*sign}).stats[1].value.replaceAll(',',''))-2*a));
    assert.ok(errors.at(-1)<=errors[0]);
    near(((a+sign*.001)**2-a*a)/(sign*.001),2*a,.0011);
  }
  assert.equal(model('secant',{a:1,h:0}).stats[1].value,'无定义');
});
test('the isolated point does not replace the two-sided limit',()=>{
  const m=model('removable',{x:1});
  assert.equal(m.stats[1].value,'3');assert.equal(m.stats[2].value,'2');
  for(const sign of [-1,1])near(m.curves[0].fn(1+sign*1e-7),2,2e-7);
  assert.ok(Number.isNaN(m.curves[0].fn(1)));
});
test('zero quadratic coefficient is a constant line without a unique vertex',()=>{
  const m=model('parabola',{a:0,h:1,k:2});
  for(const x of [-3,0,1,3])near(m.curves[1].fn(x),2);
  assert.equal(m.stats[1].value,'退化为直线');
  assert.equal(m.points[0].label,'参考点');
});
test('jump function has different one-sided limits',()=>{
  const m=model('jump',{x:0});assert.equal(m.stats[2].value,'不存在');
  assert.equal(m.curves[0].fn(-1e-7),0);assert.equal(m.curves[1].fn(1e-7),2);
});
test('chain rule includes the inner derivative',()=>{
  for(const k of [.5,1,2,3])for(const x of [-2,-.4,0,1.2])near(derivative(t=>Math.sin(k*t),x),k*Math.cos(k*x));
});
test('left and right rectangles bracket the integral; midpoint error converges quadratically',()=>{
  let previous=Infinity;
  for(const n of [2,4,8,16,32,64]){
    const f=x=>x*x,left=sumRectangles(riemann(f,0,1,n,'left')),right=sumRectangles(riemann(f,0,1,n,'right')),mid=sumRectangles(riemann(f,0,1,n,'midpoint'));
    assert.ok(left<1/3&&right>1/3);const err=1/3-mid;near(err,1/(12*n*n));assert.ok(err<previous);previous=err;
  }
  near(sumRectangles(riemann(x=>x*x,0,1,2,'left')),.125);
});
test('signed and geometric areas differ across the axis',()=>{
  near(signedLinearArea(-1,1),0);near(absoluteLinearArea(-1,1),1);
  near(signedLinearArea(-1,0),-.5);near(absoluteLinearArea(-1,0),.5);
  near(signedLinearArea(-1,2),1.5);near(absoluteLinearArea(-1,2),2.5);
  near(absoluteLinearArea(-1,-.5),.375);
});
test('Newton iteration produces 1.5 first and converges to the positive root',()=>{
  near(newtonSqrt2(2,1)[1],1.5);
  for(const initial of [.6,1,1.4,2,2.5]){const history=newtonSqrt2(initial,5);near(history.at(-1),Math.SQRT2);assert.ok(history.every(x=>x>0));}
});
test('rectangle constraint preserves perimeter and has its unique maximum at w = 5',()=>{
  for(let w=.2;w<=9.8;w+=.1){const h=10-w;near(2*w+2*h,20);assert.ok(w*h<=25+1e-10);}
  near(5*(10-5),25);
});
test('accumulation derivatives recover the integrand and endpoint constants cancel',()=>{
  for(const x of [.1,.7,1.4,2.2]){near(derivative(t=>t**3/3,x),x*x);near(derivative(t=>1-Math.cos(t),x),Math.sin(x));}
  for(const c of [-2,0,1,2])for(const b of [.2,1,2])near((b*b+c)-c,b*b);
  near(sumRectangles(riemann(t=>2*t,0,3,200)),9);
});
test('every scene remains renderable at slider boundaries',()=>{
  for(const [name,s] of Object.entries(scenes)){
    const base=defaults(name);const cases=[base,...s.controls.flatMap(c=>c.options?c.options.map(([v])=>({...base,[c.key]:v})):[{...base,[c.key]:c.min},{...base,[c.key]:c.max}])];
    for(const p of cases){const m=model(name,p);assert.ok(m.x[1]>m.x[0]&&m.y[1]>m.y[0]);assert.ok(m.curves.length);for(const q of m.points){assert.ok(Number.isFinite(q.x)&&Number.isFinite(q.y),name);}assert.ok(m.stats.every(s=>!String(s.value).includes('NaN')),name);}
  }
});
