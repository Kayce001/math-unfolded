import test from 'node:test';
import assert from 'node:assert/strict';
import {DURATION,beats,beatAt,sentences,sentenceAt,animationAt,reading,plotGeometry,tasks,taskMatches,questions,mastery} from '../public/slope-model.js';

test('slope is invariant across fractional horizontal intervals, including negative and zero slopes',()=>{
  for(let k=-3;k<=3;k+=.5)for(let step=5;step<=20;step++){
    const dx=step/10;
    const r=reading(k,dx);
    assert.ok(Math.abs((r.q.y-r.p.y)/(r.q.x-r.p.x)-k)<1e-12);
    assert.equal(r.dy,k*dx);
    for(const {x,y} of r.values)assert.equal(y,k*x);
  }
  assert.throws(()=>reading(1,0),RangeError);
  assert.throws(()=>reading(NaN),RangeError);
});
test('the measured narration timeline has no missing intervals and clamps seeking at both ends',()=>{
  assert.equal(beats[0].start,0);assert.equal(beats.at(-1).end,DURATION);
  for(let i=1;i<beats.length;i++)assert.equal(beats[i-1].end,beats[i].start);
  assert.equal(beatAt(-10),beats[0]);assert.equal(beatAt(beats[1].start),beats[1]);assert.equal(beatAt(DURATION+10),beats.at(-1));
  for(let time=0;time<=DURATION;time+=.25)assert.ok(beatAt(time).text);
});
test('the displayed grid uses equal unit lengths and keeps both comparison points visible',()=>{
  for(let k=-3;k<=3;k+=.5){
    const g=plotGeometry(k),horizontal=Math.abs(g.x(1)-g.x(0));
    assert.equal(Math.abs(g.y(1)-g.y(0)),horizontal);
    assert.equal(Math.abs(g.y(2)-g.y(0)),2*horizontal);
    for(let step=5;step<=20;step++)for(const p of [reading(k,step/10).p,reading(k,step/10).q]){
      assert.ok(g.x(p.x)>=g.left&&g.x(p.x)<=g.right);
      assert.ok(g.y(p.y)>=g.top&&g.y(p.y)<=g.bottom);
    }
    assert.equal(g.unit,plotGeometry(2).unit);
    assert.equal(k<0?g.yMax:g.yMin,0);
  }
});
test('narration captions and geometric cues follow measured sentence boundaries',()=>{
  assert.equal(sentences.length,21);
  for(let i=0;i<sentences.length;i++){
    const s=sentences[i];assert.ok(s.audioEnd>s.start);assert.ok(s.end>=s.audioEnd);
    if(i)assert.equal(sentences[i-1].end,s.start);
    assert.equal(sentenceAt(s.start),s);
    assert.equal(animationAt(s.start).beat.id,s.beat);
  }
  const change=sentences.find(s=>s.id==='B004-S002');
  assert.equal(animationAt(change.start).horizontal,0);
  assert.equal(animationAt(change.start).vertical,0);
  assert.equal(animationAt(change.audioEnd).horizontal,1);
  assert.equal(animationAt(change.audioEnd).vertical,1);
  const wide=sentences.find(s=>s.id==='B005-S001');
  assert.equal(animationAt(wide.start).interval,1);
  assert.equal(animationAt(wide.audioEnd).interval,2);
  assert.equal(sentences.at(-1).end,DURATION);
});
test('tasks demand correct positive, zero and negative slopes; mastery requires all tasks and all correct answers',()=>{
  tasks.forEach((t,i)=>{assert.equal(taskMatches(i,t.target),true);assert.equal(taskMatches(i,t.target+.5),false);});
  assert.equal(taskMatches(9,0),false);
  const correct=questions.map(q=>q.answer);
  assert.equal(mastery([],correct),false);
  assert.equal(mastery([0,1,2],[0,0,0]),false);
  assert.equal(mastery([0,1,2],correct),true);
  assert.equal(mastery([0,1],correct),false);
});
