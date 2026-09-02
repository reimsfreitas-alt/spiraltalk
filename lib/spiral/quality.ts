export type QualityFailure="REPETITION"|"PRESCRIPTIVE"|"QUESTION_OVERLOAD"|"HALLUCINATION"|"IGNORED_CORRECTION"|"GENERIC_RESPONSE"|"ANSWER_MISSING";
export type QualityResult={ok:boolean;failures:QualityFailure[]};

const GENERIC=/^(entendi|compreendo|sinto muito|parece que|vamos organizar|vamos entender|estou acompanhando|tem elementos diferentes|vamos acompanhar essa nova direção|pode continuar)[.!]?$/i;

export function qualityGate(
  reply:string,
  history:{role:"user"|"assistant";content:string}[],
  allowQuestion:boolean,
  correction:boolean,
  requiresAnswer=false
):QualityResult{
  const failures:QualityFailure[]=[];
  const recent=history.filter(m=>m.role==="assistant").slice(-4).map(m=>m.content.toLowerCase().replace(/\s+/g," ").trim());
  const norm=reply.toLowerCase().replace(/\s+/g," ").trim();

  if(!reply.trim())failures.push("REPETITION");
  if(GENERIC.test(reply.trim()))failures.push("GENERIC_RESPONSE");
  if(recent.some(x=>x===norm||(x.length>35&&norm.length>35&&(x.includes(norm.slice(0,55))||norm.includes(x.slice(0,55))))))failures.push("REPETITION");
  if(/\b(você precisa|voce precisa|faça isso|faca isso|tem que|deve fazer|recomendo que)\b/i.test(reply))failures.push("PRESCRIPTIVE");

  const questions=(reply.match(/\?/g)||[]).length;
  if(questions>1||(!allowQuestion&&questions>0))failures.push("QUESTION_OVERLOAD");
  if(correction&&/^(entendi|parece que|vamos organizar|estou acompanhando)[.!]?$/i.test(reply.trim()))failures.push("IGNORED_CORRECTION");

  if(requiresAnswer){
    const concrete=/\b(eu começaria|eu faria|uma forma|o primeiro passo|você pode|uma opção|eu sugiro|a ideia é|na prática|para melhorar|eu priorizaria|o ponto é|eu trataria|vale começar)\b/i.test(reply);
    if(!concrete||reply.trim().length<55)failures.push("ANSWER_MISSING");
  }
  return {ok:failures.length===0,failures:Array.from(new Set(failures))};
}
