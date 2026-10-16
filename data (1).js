export const organisms=[
{id:'maple',name:'단풍나무',role:'p',hint:'잎에서 빛을 이용하여 살아가는 데 필요한 양분을 스스로 만듭니다.'},
{id:'clover',name:'토끼풀',role:'p',hint:'땅에서 물 등을 흡수하고, 초록색 잎에서 빛을 이용하여 양분을 만듭니다.'},
{id:'flower',name:'구절초',role:'p',hint:'꽃이 피는 풀입니다. 잎에서 빛을 이용하여 스스로 양분을 만듭니다.'},
{id:'chipmunk',name:'다람쥐',role:'c',hint:'도토리와 씨앗, 열매 등을 먹어서 양분을 얻습니다.'},
{id:'rabbit',name:'토끼',role:'c',hint:'풀과 나뭇잎 등 다른 생물을 먹어서 양분을 얻습니다.'},
{id:'raccoon',name:'너구리',role:'c',hint:'열매나 곤충, 작은 동물 등 다른 생물을 먹어서 양분을 얻습니다.'},
{id:'mold',name:'곰팡이',role:'d',hint:'이 활동의 곰팡이는 죽은 생물이나 남은 음식물 등을 분해하고 양분을 흡수합니다.'},
{id:'bacteria',name:'세균',role:'d',hint:'이 활동에서 살펴보는 세균은 죽은 생물이나 배출물을 분해하여 양분을 얻습니다. 모든 세균이 같은 역할을 하는 것은 아닙니다.'}
];
export const roles={p:'생산자',c:'소비자',d:'분해자'};
export function validBoard(b){return b && typeof b==='object' && Object.keys(b).every(k=>organisms.some(o=>o.id===k)&&['p','c','d'].includes(b[k]));}
