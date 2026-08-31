import type { ContinuityState, SpiralStructure } from "./types";
export function mergeContinuityWithStructure(prev:ContinuityState|null,current:SpiralStructure,topicKey="default"):ContinuityState{
 const changes=[...(prev?.declared_changes||[]),...(current.declared_changes||[])];
 if(prev?.declared_decision!==current.declared_decision && current.decision_state==="decision") changes.push(`Decisão alterada: ${prev?.declared_decision||"nenhuma"} → ${current.declared_decision}`);
 if(current.decision_state!=="decision" && prev?.declared_decision && ["doubt","intention","possibility","hypothesis"].includes(current.decision_state)) changes.push(`Decisão anterior deixou de estar vigente: ${prev.declared_decision}`);
 return {id:prev?.id,user_id:prev?.user_id,topic_key:topicKey,central_question:current.central_question||prev?.central_question||"",active_factors:current.declared_factors||prev?.active_factors||[],constraints:current.constraints||prev?.constraints||[],alternatives:current.alternatives||prev?.alternatives||[],declared_decision:current.decision_state==="decision"?current.declared_decision:null,open_questions:current.open_questions||[],declared_changes:Array.from(new Set(changes)),last_summary:null};
}
