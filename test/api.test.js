import test from 'node:test';import assert from 'node:assert/strict';import vm from 'node:vm';import {readFileSync} from 'node:fs';import {createHmac,timingSafeEqual,randomBytes} from 'node:crypto';import {organisms,validBoard,makeAssignments,getDeck,presentation} from '../lib/data.js';
import {makeLearningSubmission,reflectionLabels} from '../lib/learning.js';
function setup(){const store=new Map([['rolesRooms/'+('a'.repeat(24)),{phase:2,closed:false}],['rolesRooms/'+('a'.repeat(24))+'/members/'+('b'.repeat(20)),{group:1,name:'학생',token:'secret',board:{}}]]);const clone=x=>x===undefined?undefined:structuredClone(x);function ref(path){return{path,collection:n=>ref(path+'/'+n),doc:n=>ref(path+'/'+n),get:async()=>({exists:store.has(path),data:()=>clone(store.get(path)),docs:[...store].filter(([key])=>key.startsWith(path+'/')&&key.split('/').length===path.split('/').length+1).map(([key,value])=>({id:key.split('/').at(-1),data:()=>clone(value)}))}),set:async d=>store.set(path,clone(d)),update:async d=>{const old=clone(store.get(path));for(const [k,v]of Object.entries(d)){if(k.startsWith('board.'))old.board[k.slice(6)]=v;else old[k]=v;}store.set(path,old);}};}let tail=Promise.resolve();const db={collection:n=>ref(n),runTransaction(fn){const run=tail.then(()=>fn({get:r=>r.get(),set:(r,d)=>r.set(d),update:(r,d)=>r.update(d)}));tail=run.catch(()=>{});return run;}};const code=readFileSync(new URL('../api/classroom.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export default async function handler','async function handler');const ctx={makeLearningSubmission,reflectionLabels,organisms,validBoard,makeAssignments,getDeck,presentation,createHmac,timingSafeEqual,randomBytes,Buffer,getApps:()=>[{}],getFirestore:()=>db,process:{env:{FIREBASE_SERVICE_ACCOUNT_JSON:'{}',TEACHER_PASSWORD:'pass',SESSION_SECRET:'x'.repeat(40)}}};vm.createContext(ctx);vm.runInContext(code,ctx);return{store,async call(b,headers={}){let status=200,out;const responseHeaders={};await ctx.handler({method:'POST',headers,body:{room:'a'.repeat(24),id:'b'.repeat(20),token:'secret',...b}},{setHeader(k,v){responseHeaders[k]=v;},status(n){status=n;return this;},json(x){out=x;}});return{status,out,headers:responseHeaders};}};}
test('서로 다른 카드 동시 이동과 이유 저장이 서로 덮어쓰지 않음',async()=>{const t=setup();await Promise.all([t.call({action:'edit',moves:[{id:'rabbit',role:'c'}]}),t.call({action:'edit',moves:[{id:'maple',role:'p'}],reasons:{p:'빛으로 양분을 만들기'}})]);const g=t.store.get('rolesRooms/'+('a'.repeat(24))+'/groups/1');assert.deepEqual(g.board,{rabbit:'c',maple:'p'});assert.equal(g.reasons.p,'빛으로 양분을 만들기');assert.equal(g.revision,2);});
test('미배정 카드와 미완성 제출 차단',async()=>{const t=setup();assert.equal((await t.call({action:'edit',moves:[{id:'pine',role:'p'}]})).status,400);assert.equal((await t.call({action:'submit'})).status,400);});
test('예상 단계 개인 카드만 수정, 다른 역할 이유 제출 차단',async()=>{const t=setup();t.store.get('rolesRooms/'+('a'.repeat(24))).phase=0;assert.equal((await t.call({action:'edit',moves:[{id:'rabbit',role:'c'}]})).status,200);assert.equal(t.store.get('rolesRooms/'+('a'.repeat(24))+'/members/'+('b'.repeat(20))).board.rabbit,'c');assert.equal((await t.call({action:'edit',reasons:{p:'이유'}})).status,400);});

test('전자칠판은 교사 인증 필요, 제출된 모둠 결과만 제공하고 개인 정보 제외',async()=>{
 const t=setup(),prefix='rolesRooms/'+('a'.repeat(24));
 t.store.set(prefix+'/groups/1',{board:{rabbit:'c'},reasons:{c:'다른 생물을 먹어서'},submitted:true,submittedAt:123,editor:'숨길 이름'});
 t.store.set(prefix+'/groups/2',{board:{maple:'p'},reasons:{p:'아직 초안'},submitted:false});
 assert.equal((await t.call({action:'display'})).status,401);
 const login=await t.call({action:'login',password:'pass'}),cookie=login.headers['Set-Cookie'].split(';')[0];
 const response=await t.call({action:'display'},{cookie});
 assert.equal(response.status,200);assert.equal(response.out.groups.length,1);assert.equal(response.out.groups[0].id,'1');
 assert.equal(response.out.groups[0].board.rabbit,'c');assert.equal(response.out.groups[0].submittedAt,123);
 const json=JSON.stringify(response.out);for(const value of ['token','members','editor','숨길 이름','아직 초안','reflection'])assert.ok(!json.includes(value));
 t.store.get(prefix).closed=true;assert.equal((await t.call({action:'display'},{cookie})).status,200);
});
test('최종 제출 시각 기록, 수정 후 재제출 전에는 전자칠판에서 제외',async()=>{
 const t=setup(),prefix='rolesRooms/'+('a'.repeat(24)),deck=getDeck({},1);
 t.store.set(prefix+'/groups/1',{board:Object.fromEntries(deck.map(o=>[o.id,o.role])),reasons:{p:'스스로 양분을 만들기',c:'다른 생물을 먹기',d:'죽은 생물을 분해하기'}});
 assert.equal((await t.call({action:'submit'})).status,200);
 assert.equal(typeof t.store.get(prefix+'/groups/1').submittedAt,'number');
 const login=await t.call({action:'login',password:'pass'}),cookie=login.headers['Set-Cookie'].split(';')[0];
 assert.equal((await t.call({action:'display'},{cookie})).out.groups.length,1);
 await t.call({action:'edit',moves:[{id:'rabbit',role:'p'}]});
 assert.equal((await t.call({action:'display'},{cookie})).out.groups.length,0);
});

test('개인 퀴즈·성찰은 정리 단계에만 제출, 서버 채점 후 교사에게 전달',async()=>{
 const t=setup(),prefix='rolesRooms/'+('a'.repeat(24));const body={action:'learning',answers:{light:'p',rabbit:'c',mold:'p'},reflections:{learned:'양분을 얻는 방법으로 분류해요.',felt:'모든 생물이 중요하다고 느꼈어요.',wonder:'다른 분해자도 궁금해요.'},score:999};
 for(const phase of [0,2,3]){t.store.get(prefix).phase=phase;assert.equal((await t.call(body)).status,400);}
 t.store.get(prefix).phase=4;
 assert.equal((await t.call({...body,token:'wrong'})).status,401);
 assert.equal((await t.call({...body,reflections:{...body.reflections,wonder:' '}})).status,400);
 assert.equal((await t.call({...body,answers:{light:'p'}})).status,400);
 assert.equal((await t.call({...body,reflections:{...body.reflections,learned:'가'.repeat(201)}})).status,400);
 assert.ok(!t.store.get(prefix+'/members/'+('b'.repeat(20))).learning);
 const result=await t.call(body);assert.equal(result.status,200);assert.equal(result.out.learning.score,2);assert.equal(result.out.learning.feedback[2].correct,false);
 const login=await t.call({action:'login',password:'pass'}),cookie=login.headers['Set-Cookie'].split(';')[0];const teacher=await t.call({action:'teacher'},{cookie});assert.equal(teacher.out.members[0].learning.score,2);assert.equal(teacher.out.members[0].learning.reflections.wonder,body.reflections.wonder);
 const display=await t.call({action:'display'},{cookie});assert.ok(!JSON.stringify(display.out).includes(body.reflections.learned));
 const retry=await t.call({...body,answers:{light:'p',rabbit:'c',mold:'d'}});assert.equal(retry.out.learning.score,3);
});
