import {initializeApp,getApps,cert} from 'firebase-admin/app';
import {getFirestore} from 'firebase-admin/firestore';
import {randomBytes,createHmac,timingSafeEqual} from 'node:crypto';
import {organisms,validBoard,makeAssignments,getDeck,presentation} from '../lib/data.js';
const fail=(m,s=400)=>Object.assign(new Error(m),{status:s});
function sign(v){return createHmac('sha256',process.env.SESSION_SECRET).update(v).digest('hex');}
function equal(a,b){return typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
function teacher(req){const t=(req.headers.cookie||'').split('; ').find(x=>x.startsWith('teacher='))?.slice(8)||'';const [v,s]=t.split('.');return v&&Number(v)>Date.now()&&equal(s,sign(v));}
export default async function handler(req,res){
res.setHeader('Cache-Control','no-store');
try{
if(!process.env.FIREBASE_SERVICE_ACCOUNT_JSON||!process.env.TEACHER_PASSWORD||!process.env.SESSION_SECRET||process.env.SESSION_SECRET.length<32)throw fail('교사 설정이 필요합니다. 배포안내의 환경변수 3개를 확인해 주세요.',503);
if(req.method!=='POST')throw fail('POST만 사용할 수 있습니다.',405);
const b=typeof req.body==='string'?JSON.parse(req.body):req.body||{};
if(JSON.stringify(b).length>20000)throw fail('입력 내용이 너무 깁니다.');
if(b.action==='login'){if(!equal(b.password,process.env.TEACHER_PASSWORD))throw fail('교사 비밀번호를 확인해 주세요.',401);const v=String(Date.now()+43200000);res.setHeader('Set-Cookie',`teacher=${v}.${sign(v)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200${process.env.VERCEL?'; Secure':''}`);return res.json({ok:true});}
if(b.action==='session'){if(!teacher(req))throw fail('교사 로그인이 필요합니다.',401);return res.json({ok:true});}
if(!getApps().length)initializeApp({credential:cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON))});
const db=getFirestore();
if(['create','teacher','phase','close'].includes(b.action)&&!teacher(req))throw fail('교사 로그인이 필요합니다.',401);
if(b.action==='create'){const room=randomBytes(12).toString('hex');await db.collection('rolesRooms').doc(room).set({phase:0,created:Date.now(),closed:false,assignments:makeAssignments()});return res.json({room});}
if(!/^[a-f0-9]{24}$/.test(b.room||''))throw fail('학생 공통 링크로 입장해 주세요.');
const ref=db.collection('rolesRooms').doc(b.room),snap=await ref.get();if(!snap.exists)throw fail('수업을 찾을 수 없습니다.',404);const room=snap.data();
if(b.action==='teacher'){const groups=await ref.collection('groups').get();const members=await ref.collection('members').get();return res.json({room,groups:groups.docs.map(x=>({id:x.id,...x.data()})),members:members.docs.map(x=>({id:x.id,...x.data(),token:undefined}))});}
if(b.action==='phase'){if(!Number.isInteger(b.phase)||b.phase<0||b.phase>4)throw fail('단계를 확인해 주세요.');await ref.update({phase:b.phase});return res.json({ok:true});}
if(b.action==='close'){await ref.update({closed:true});return res.json({ok:true});}
if(room.closed)throw fail('종료된 수업입니다. 새 학생 링크로 입장해 주세요.',410);
if(b.action==='join'){if(!Number.isInteger(b.group)||b.group<1||b.group>6||typeof b.name!=='string'||!b.name.trim()||b.name.length>20)throw fail('이름과 모둠을 확인해 주세요.');const id=randomBytes(10).toString('hex'),token=randomBytes(24).toString('hex');await ref.collection('members').doc(id).set({name:b.name.trim(),group:b.group,token,board:{},reflection:''});return res.json({id,token});}
if(!/^[a-f0-9]{20}$/.test(b.id||''))throw fail('다시 입장해 주세요.',401);
const memberRef=ref.collection('members').doc(b.id),ms=await memberRef.get();if(!ms.exists||!equal(ms.data().token,b.token))throw fail('다시 입장해 주세요.',401);const me=ms.data();const gr=ref.collection('groups').doc(String(me.group));
if(b.action==='state'){const peers=await ref.collection('members').where('group','==',me.group).get();return res.json({room,me:{...me,token:undefined},peers:peers.docs.map(x=>({id:x.id,name:x.data().name,board:x.data().board})),group:(await gr.get()).data()||{board:{},revision:0}});}
const deck=getDeck(room,me.group),ids=deck.map(o=>o.id);
if(b.action==='edit'){
 if(![0,2].includes(room.phase))throw fail('이 단계에서는 분류를 수정할 수 없습니다.');
 const moves=b.moves||[],reasons=b.reasons||{};
 if(!Array.isArray(moves)||moves.length>16||!moves.every(m=>ids.includes(m.id)&&['p','c','d'].includes(m.role)))throw fail('분류할 생물을 확인해 주세요.');
 if(Object.keys(reasons).some(k=>!['p','c','d'].includes(k)||typeof reasons[k]!=='string'||reasons[k].length>400))throw fail('이유는 역할별 400자 이내로 적어 주세요.');
 if(room.phase===0){if(Object.keys(reasons).length)throw fail('모둠토의에서 이유를 적어 주세요.');const patch={};for(const m of moves)patch['board.'+m.id]=m.role;if(Object.keys(patch).length)await memberRef.update(patch);}
 else await db.runTransaction(async tx=>{const gs=await tx.get(gr),old=gs.data()||{},board={...(old.board||{})},notes={...(old.reasons||{}),...reasons};for(const m of moves)board[m.id]=m.role;tx.set(gr,{...old,board,reasons:notes,reason:presentation(board,notes,deck),revision:(old.revision||0)+1,submitted:false,editor:me.name});});
}
else if(b.action==='submit'){
 if(room.phase!==2)throw fail('모둠토의 단계에서 제출해 주세요.');
 await db.runTransaction(async tx=>{const gs=await tx.get(gr),g=gs.data()||{};
 if(!validBoard(g.board,ids)||ids.some(id=>!g.board[id])||['p','c','d'].some(k=>!(g.reasons?.[k]?.trim().length>=3)))throw fail('8종을 모두 분류하고 세 역할의 이유를 각각 적어 주세요.');
 tx.update(gr,{submitted:true,reason:presentation(g.board,g.reasons,deck),editor:me.name});});
}
else if(b.action==='reflect'){if(room.phase<3)throw fail('정리 단계가 아직 열리지 않았습니다.');if(typeof b.text!=='string'||b.text.length>600)throw fail('600자 이내로 써 주세요.');await memberRef.update({reflection:b.text});}
else throw fail('알 수 없는 요청입니다.');
return res.json({ok:true});
}catch(e){res.status(e.status||500).json({error:e.status?e.message:'연결에 실패했습니다. Firebase 설정과 Firestore 생성 여부를 확인해 주세요.'});}
}
