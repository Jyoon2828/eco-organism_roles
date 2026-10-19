// Keep the last submitted result separate from a group's working draft.
export function getSubmission(group){
 if(!group)return null;
 const saved=group.submission?.board?group.submission:group.submitted?group:null;
 if(!saved)return null;
 return {board:{...(saved.board||{})},reasons:{...(saved.reasons||{})},reason:saved.reason||'',submittedAt:saved.submittedAt||0,revision:saved.revision||0};
}
