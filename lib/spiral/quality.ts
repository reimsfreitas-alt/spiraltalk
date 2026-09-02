export type QualityFailure="REPETITION"|"PRESCRIPTIVE"|"QUESTION_OVERLOAD"|"HALLUCINATION"|"IGNORED_CORRECTION";
export type QualityResult={ok:boolean;failures:QualityFailure[]};
export function qualityGate(reply:string,history:{role:"user"|"assistant";content:string}[],allowQuestion:boolean,correction:boolean):QualityResult{
 const failures:QualityFailure[]=[];const recent=history.filter(m=>m.role==="assistant").slice(-3).map(m=>m.content.toLowerCase().replace(/\s+/g," ").trim());const norm=reply.toLowerCase().replace(/\s+/g," ").trim();
 if(!reply.trim())failures.push("REPETITION");
 if(recent.some(x=>x===norm||(x.length>35&&norm.length>35&&(x.includes(norm.slice(0,55))||norm.includes(x.slice(0,55))))))failures.push("REPETITION");
 if(/\b(você precisa|voce precisa|faça isso|faca isso|tem que|deve fazer|recomendo que)\b/i.test(reply))failures.push("PRESCRIPTIVE");
 const questions=(reply.match(/\?/g)||[]).length;if(questions>1||(!allowQuestion&&questions>0))failures.push("QUESTION_OVERLOAD");
 if(correction&&/\b(entendi|parece que|vamos organizar)\b/i.test(reply))failures.push("IGNORED_CORRECTION");
 return {ok:failures.length===0,failures};
}
