import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync,readdirSync} from 'node:fs';
import {roles,getDeck,sentenceLead} from '../lib/data.js';

const source=readFileSync(new URL('../public/display-20261019-10.js',import.meta.url),'utf8').replace(/^import .*;\n/,'');
function setup(search=''){
 const els=new Map(),root={innerHTML:'',classList:{toggle(){}}},notices={style:{}};
 els.set('#display',root);els.set('#notice',notices);els.set('#full',{addEventListener(){}});
 const intervals=[],requests=[];
 const ctx={roles,getDeck,sentenceLead,URLSearchParams,location:{search},localStorage:{getItem(){return null;}},document:{querySelector(s){return els.get(s)||null;},querySelectorAll(){return [];},hidden:false},setTimeout(){},clearTimeout(){},setInterval(fn,delay){intervals.push({fn,delay});},window:{addEventListener(){}},fetch:async(url,options)=>{requests.push(JSON.parse(options.body));return{ok:true,json:async()=>({room:{phase:2},groups:[]})};}};
 vm.createContext(ctx);vm.runInContext(source,ctx);
 return {ctx,root,notices,intervals,requests,els,run:code=>vm.runInContext(code,ctx)};
}
const submitted=(id,time=1)=>({id:String(id),submitted:true,submittedAt:time,board:Object.fromEntries(getDeck({},id).map(o=>[o.id,o.role])),reasons:{p:'스스로 양분을 만들기',c:'다른 생물을 먹기',d:'죽은 생물을 분해하기'}});
function accept(t,groups){t.ctx.payload={room:{phase:2,closed:false},groups};t.run('accept(payload)');}
test('최초에는 6모둠 전체 보기, 새 제출과 재제출은 해당 모둠 자동 확대',()=>{
 const t=setup();accept(t,[]);assert.match(t.root.innerHTML,/우리 반 생물 분류 결과/);assert.match(t.root.innerHTML,/0<span> \/ 6모둠 제출/);
 accept(t,[submitted(2)]);assert.match(t.root.innerHTML,/2모둠의 탐구 발표/);assert.match(t.root.innerHTML,/assets\/rabbit.jpg/);assert.match(t.root.innerHTML,/스스로 양분을 만들기/);
 t.run('selected=null');accept(t,[submitted(2)]);assert.equal(t.run('selected'),null);
 accept(t,[submitted(2,2)]);assert.equal(t.run('selected'),2);
});
test('발표 중 자동 확대 끄기, 이전·다음 이동, 결과가 없는 모둠에서는 전체 보기',()=>{
 const t=setup();accept(t,[submitted(1)]);t.run('selected=1;autoOpen=false');accept(t,[submitted(1),submitted(3)]);assert.equal(t.run('selected'),1);
 t.run('move(1)');assert.equal(t.run('selected'),3);t.run('move(1)');assert.equal(t.run('selected'),1);t.run('move(-1)');assert.equal(t.run('selected'),3);
 accept(t,[submitted(1)]);assert.equal(t.run('selected'),null);assert.match(t.root.innerHTML,/우리 반 생물 분류 결과/);
});
test('자동 갱신은 기존 확대·글씨 설정을 유지, 이유는 HTML로 실행하지 않음',()=>{
 const t=setup(),group=submitted(1);group.reasons.p='<script>alert(1)</script>';accept(t,[group]);t.run('selected=1;largeText=true;render()');accept(t,[group]);
 assert.equal(t.run('selected'),1);assert.equal(t.run('largeText'),true);assert.ok(!t.root.innerHTML.includes('<script>'));assert.match(t.root.innerHTML,/&lt;script&gt;/);assert.equal(t.intervals[0].delay,2500);
});
test('기존 교사 세션으로 전자칠판 재인증 후 결과 복원',async()=>{
 const t=setup();accept(t,[submitted(1)]);t.run('login()');assert.match(t.root.innerHTML,/전자칠판 시작/);accept(t,[submitted(1)]);assert.match(t.root.innerHTML,/우리 반 생물 분류 결과/);
});
test('네트워크 실패 후 마지막 결과 보존, 로그인 대기 중 자동 요청 안 함',async()=>{
 const t=setup('?room='+('a'.repeat(24)));
 await new Promise(setImmediate);
 accept(t,[submitted(1)]);t.run('selected=1;render()');const html=t.root.innerHTML;
 t.ctx.fetch=async()=>{throw Error('offline');};await t.run('refresh()');
 assert.equal(t.root.innerHTML,html);assert.equal(t.run('state.groups.length'),1);assert.equal(t.run('selected'),1);assert.match(t.run('connection'),/연결 확인 필요/);
 const requests=t.requests.length;t.els.set('#display-login',{});t.intervals[0].fn();assert.equal(t.requests.length,requests);
 t.els.delete('#display-login');t.ctx.fetch=async()=>({ok:true,json:async()=>({room:{phase:2,closed:false},groups:[submitted(1),submitted(2)]})});
 await t.run('refresh()');assert.equal(t.run('selected'),2);assert.match(t.root.innerHTML,/2모둠의 탐구 발표/);
});
test('학생·교사·전자칠판 전체 화면 소스에 한자 없음, 배포 경로 존재',()=>{
 const publicURL=new URL('../public/',import.meta.url);
 for(const name of readdirSync(publicURL)){if(!/\.(js|html|css)$/.test(name))continue;assert.ok(!/\p{Script=Han}/u.test(readFileSync(new URL(name,publicURL),'utf8')),name);}
 const config=JSON.parse(readFileSync(new URL('../vercel.json',import.meta.url),'utf8'));
 for(const path of ['/display.html','/display-20261019-10.js','/display.css']){const route=config.routes.find(r=>new RegExp('^'+r.src+'$').test(path));assert.ok(route,path);}
 const teacher=readFileSync(new URL('../public/app-20261019-10.js',import.meta.url),'utf8');assert.match(teacher,/display.html\?room=/);assert.match(teacher,/전자칠판 링크 복사/);
});

test('수정 중에도 전자칠판은 제출본과 연결 수업 확인 안내를 표시',()=>{
 const t=setup(),g=submitted(1);g.revising=true;accept(t,[g]);
 assert.match(t.root.innerHTML,/제출본 · 수정 중/);assert.match(t.root.innerHTML,/학생 공통 링크/);
 t.run('selected=1;render()');assert.match(t.root.innerHTML,/1모둠의 탐구 발표/);assert.match(t.root.innerHTML,/스스로 양분을 만들기/);
});
