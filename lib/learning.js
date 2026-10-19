export const learningQuestions=[
 {id:'light',image:'maple',question:'단풍나무는 잎에서 빛을 이용해 스스로 양분을 만듭니다. 어떤 생물의 역할에 해당할까요?',answer:'p',hint:'분류 기준은 양분을 얻는 방법이에요.',explanation:'단풍나무는 빛을 이용해 스스로 양분을 만드는 생산자입니다.'},
 {id:'rabbit',image:'rabbit',question:'토끼는 풀과 나뭇잎을 먹어서 양분을 얻습니다. 어떤 생물의 역할에 해당할까요?',answer:'c',hint:'식물을 먹는 동물도 다른 생물에게서 양분을 얻어요.',explanation:'토끼는 다른 생물을 먹어서 양분을 얻는 소비자입니다.'},
 {id:'mold',image:'mold',question:'죽은 생물이나 남은 음식물을 분해하여 양분을 얻는 곰팡이는 어떤 역할을 할까요?',answer:'d',hint:'죽은 생물이 자연에서 어떻게 분해되는지 생각해 보세요.',explanation:'이 문제의 곰팡이는 죽은 생물 등을 분해하여 양분을 얻는 분해자입니다.'}
];
export const learningOptions={p:'생산자',c:'소비자',d:'분해자',n:'비생물요소'};
export const reflectionLabels={learned:'오늘 알게 된 것',felt:'오늘 느낀 것',wonder:'더 알아보고 싶은 것'};
export function makeLearningSubmission(answers,reflections,now=Date.now()){
 if(!answers||typeof answers!=='object'||Array.isArray(answers)||Object.keys(answers).length!==learningQuestions.length||learningQuestions.some(q=>!Object.hasOwn(learningOptions,answers[q.id])))throw Error('퀴즈 3문항의 답을 모두 골라 주세요.');
 if(!reflections||typeof reflections!=='object'||Array.isArray(reflections)||Object.keys(reflectionLabels).some(k=>typeof reflections[k]!=='string'||!reflections[k].trim()||reflections[k].trim().length>200))throw Error('세 가지 생각을 각각 한 문장씩, 200자 이내로 적어 주세요.');
 const feedback=learningQuestions.map(q=>({id:q.id,correct:answers[q.id]===q.answer,answer:q.answer,explanation:q.explanation}));
 return {version:1,answers:Object.fromEntries(learningQuestions.map(q=>[q.id,answers[q.id]])),reflections:Object.fromEntries(Object.keys(reflectionLabels).map(k=>[k,reflections[k].trim()])),score:feedback.filter(f=>f.correct).length,total:learningQuestions.length,feedback,submittedAt:now};
}
