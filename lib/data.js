export const organisms=[
{id:'maple',name:'단풍나무',role:'p',hint:'잎에서 빛을 이용하여 살아가는 데 필요한 양분을 스스로 만듭니다.'},
{id:'pine',name:'소나무',role:'p',hint:'바늘 모양의 잎에서 빛을 이용해 스스로 양분을 만듭니다.'},
{id:'oak',name:'참나무',role:'p',hint:'뿌리로 물 등을 흡수하고 잎에서 빛을 이용하여 양분을 만듭니다.'},
{id:'clover',name:'토끼풀',role:'p',hint:'초록색 잎에서 빛을 이용하여 양분을 만듭니다.'},
{id:'flower',name:'구절초',role:'p',hint:'꽃이 피는 풀입니다. 잎에서 빛을 이용하여 스스로 양분을 만듭니다.'},
{id:'fern',name:'고사리',role:'p',hint:'꽃은 피지 않지만 초록색 잎에서 빛을 이용하여 양분을 만듭니다.'},
{id:'dandelion',name:'민들레',role:'p',hint:'땅에서 물 등을 흡수하고 잎에서 빛을 이용하여 양분을 만듭니다.'},
{id:'reed',name:'갈대',role:'p',hint:'물가에서 자라는 풀입니다. 잎에서 빛을 이용하여 스스로 양분을 만듭니다.'},
{id:'lotus',name:'연꽃',role:'p',hint:'물 위로 펼친 초록색 잎에서 빛을 이용하여 양분을 만듭니다.'},
{id:'chipmunk',name:'다람쥐',role:'c',hint:'도토리와 씨앗, 열매 등을 먹어서 양분을 얻습니다.'},
{id:'rabbit',name:'토끼',role:'c',hint:'풀과 나뭇잎 등 다른 생물을 먹어서 양분을 얻습니다.'},
{id:'raccoon',name:'너구리',role:'c',hint:'열매나 곤충, 작은 동물 등 다른 생물을 먹어서 양분을 얻습니다.'},
{id:'deer',name:'사슴',role:'c',hint:'풀과 나뭇잎 등 다른 생물을 먹어서 양분을 얻습니다.'},
{id:'grasshopper',name:'여치',role:'c',hint:'풀과 잎, 작은 곤충 등 다른 생물을 먹어서 양분을 얻습니다.'},
{id:'frog',name:'개구리',role:'c',hint:'곤충 등 작은 동물을 잡아먹어서 양분을 얻습니다.'},
{id:'butterfly',name:'나비',role:'c',hint:'꽃에서 만든 꿀을 먹어 양분을 얻습니다. 스스로 양분을 만들지는 않습니다.'},
{id:'bird',name:'박새',role:'c',hint:'곤충이나 씨앗 등을 먹어서 양분을 얻습니다.'},
{id:'dragonfly',name:'잠자리',role:'c',hint:'모기나 작은 날벌레 등을 잡아먹어 양분을 얻습니다.'},
{id:'mold',name:'곰팡이',role:'d',hint:'이 활동의 곰팡이는 죽은 생물이나 남은 음식물 등을 분해하고 양분을 흡수합니다.'},
{id:'bacteria',name:'세균',role:'d',hint:'이 활동의 세균은 죽은 생물이나 배출물을 분해하여 양분을 얻습니다. 모든 세균이 같은 역할을 하는 것은 아닙니다.'}
];
export const roles={p:'생산자',c:'소비자',d:'분해자'};
export const legacyIds=['maple','clover','flower','chipmunk','rabbit','raccoon','mold','bacteria'];
export function getDeck(room,group){const ids=room?.assignments?.[String(group)]||legacyIds;return ids.map(id=>organisms.find(o=>o.id===id)).filter(Boolean);}
export function makeAssignments(random=Math.random){const shuffle=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};const p=shuffle(organisms.filter(o=>o.role==='p').map(o=>o.id)),c=shuffle(organisms.filter(o=>o.role==='c').map(o=>o.id));const result={};for(let i=0;i<6;i++)result[i+1]=shuffle([...Array.from({length:3},(_,j)=>p[(i*2+j)%p.length]),...Array.from({length:3},(_,j)=>c[(i*2+j)%c.length]),'mold','bacteria']);return result;}
export function validBoard(b,ids=organisms.map(o=>o.id)){return !!b&&typeof b==='object'&&!Array.isArray(b)&&Object.keys(b).every(k=>ids.includes(k)&&['p','c','d'].includes(b[k]));}
export function sentenceLead(role,board,deck=organisms){const names=deck.filter(o=>board[o.id]===role).map(o=>o.name).join(', ');const last=names.charCodeAt(names.length-1);const particle=last>=0xac00&&last<=0xd7a3&&(last-0xac00)%28!==0?'을':'를';return `우리 모둠은 ${names||'___'}${names?particle:'을/를'} ${roles[role]}로 분류했습니다.`;}
export function presentation(board,reasons={},deck=organisms){return Object.keys(roles).map(r=>`${sentenceLead(r,board,deck)} 이유는 ${reasons[r]||'___'} 때문입니다.`).join('\n');}
