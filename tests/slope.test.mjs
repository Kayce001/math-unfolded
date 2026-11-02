import test from 'node:test';
import assert from 'node:assert/strict';
import {DURATION,beats,beatAt,reading,tasks,taskMatches,questions,mastery} from '../public/slope-model.js';

test('slope is invariant under two nonzero horizontal intervals, including negative and zero slopes',()=>{
  for(let k=-3;k<=3;k+=.5)for(const dx of [1,2]){
    const r=reading(k,dx);
    assert.equal((r.q.y-r.p.y)/(r.q.x-r.p.x),k);
    assert.equal(r.dy,k*dx);
    for(const {x,y} of r.values)assert.equal(y,k*x);
  }
  assert.throws(()=>reading(1,0),RangeError);
  assert.throws(()=>reading(NaN),RangeError);
});
test('the full 72-second animation has no missing intervals and clamps seeking at both ends',()=>{
  assert.equal(beats[0].start,0);assert.equal(beats.at(-1).end,DURATION);
  for(let i=1;i<beats.length;i++)assert.equal(beats[i-1].end,beats[i].start);
  assert.equal(beatAt(-10),beats[0]);assert.equal(beatAt(12),beats[1]);assert.equal(beatAt(500),beats.at(-1));
  for(let time=0;time<=DURATION;time+=.25)assert.ok(beatAt(time).text);
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
